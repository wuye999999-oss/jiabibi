// app-v12-patch.js: consumer-mode polish, recovery actions, and clearer result guidance
(function(){
  const $=id=>document.getElementById(id);
  const viewKey='jiabibi_view_mode_v1';
  const filterKey='jiabibi_filter_mode_v1';
  const platformKey='jiabibi_platform_filter_v1';
  const isSimple=()=> (localStorage.getItem(viewKey)||'')==='simple' || (window.matchMedia&&window.matchMedia('(max-width:640px)').matches&&!localStorage.getItem(viewKey));
  let lastData=null;
  let lastQuery='';

  function ensureV12Style(){
    if($('v12-style'))return;
    const style=document.createElement('style');
    style.id='v12-style';
    style.textContent=`
      .v12-guide{background:linear-gradient(180deg,#fff,#f7f7fa);border:1px solid #ececf1}
      .v12-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .v12-actions button{background:#fff;color:#111;border:1px solid #e5e5ea}
      .v12-actions button.primary{background:#111;color:#fff;border-color:#111}
      .v12-bottom{position:sticky;bottom:10px;z-index:10;background:rgba(255,255,255,.92);backdrop-filter:blur(18px);border:1px solid #eee;border-radius:999px;padding:8px;display:none;gap:8px;box-shadow:0 12px 30px rgba(0,0,0,.12)}
      .v12-bottom button{flex:1;border-radius:999px;padding:10px 12px;font-size:13px}
      @media(max-width:640px){.v12-bottom{display:flex}.v12-guide{font-size:14px}.v12-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function ensureGuide(){
    if($('v12-guide'))return;
    const providers=$('providers');
    if(!providers)return;
    const card=document.createElement('div');
    card.id='v12-guide';
    card.className='card v12-guide';
    card.innerHTML=`
      <b>三类价格说明</b>
      <div class="muted" style="margin-top:6px">价比比只展示三类关键价格：官方/自营最低价、渠道店最低价、普通店最低价。默认按可识别单位价比较，缺规格或明显错品会过滤。</div>
      <div class="v12-actions">
        <button type="button" id="v12Simple">简洁</button>
        <button type="button" id="v12Debug">调试</button>
        <button type="button" id="v12AllPlatforms">全平台</button>
      </div>
    `;
    providers.insertAdjacentElement('afterend',card);
    $('v12Simple').onclick=()=>{localStorage.setItem(viewKey,'simple'); window.jiabibiApplyViewMode&&window.jiabibiApplyViewMode();};
    $('v12Debug').onclick=()=>{localStorage.setItem(viewKey,'debug'); window.jiabibiApplyViewMode&&window.jiabibiApplyViewMode();};
    $('v12AllPlatforms').onclick=()=>{restoreAllPlatforms();};
  }

  function ensureBottomBar(){
    if($('v12-bottom'))return;
    const bar=document.createElement('div');
    bar.id='v12-bottom';
    bar.className='v12-bottom';
    bar.innerHTML=`<button type="button" id="v12Top">顶部</button><button type="button" id="v12Retry" class="primary">重搜</button><button type="button" id="v12Diag">诊断</button>`;
    document.querySelector('.app')?.appendChild(bar);
    $('v12Top').onclick=()=>scrollTo({top:0,behavior:'smooth'});
    $('v12Retry').onclick=()=>window.search(($('kw')&&$('kw').value)||lastQuery);
    $('v12Diag').onclick=()=>{localStorage.setItem(viewKey,'debug'); window.jiabibiApplyViewMode&&window.jiabibiApplyViewMode(); switchDebug();};
  }

  function switchDebug(){
    try{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
      const t=[...document.querySelectorAll('.tab')].find(x=>x.dataset.tab==='debug');
      if(t)t.classList.add('on');
      ['result','debug','tests'].forEach(p=>$("panel-"+p)?.classList.toggle('hide',p!=='debug'));
      setTimeout(()=>$('panel-debug')?.scrollIntoView({behavior:'smooth'}),80);
    }catch(e){}
  }

  function restoreAllPlatforms(){
    localStorage.setItem(platformKey,JSON.stringify(['pdd','jd','tb','douyin']));
    if(window.jiabibiResetPlatforms) window.jiabibiResetPlatforms();
    else if($('kw')) window.search($('kw').value);
  }

  function countKept(data,q){
    const list=data?.goods_list||[];
    let kept=0;
    for(const i of list){try{if(diagnose(i,q).keep)kept++;}catch(e){}}
    return kept;
  }

  function addRecoveryIfNeeded(data,q){
    const panel=$('panel-result'); if(!panel||!data)return;
    if($('v12-recovery')) $('v12-recovery').remove();
    const kept=countKept(data,q);
    if(kept>0){ addNextStep(data,q,kept); return; }
    const card=document.createElement('div');
    card.id='v12-recovery';
    card.className='card v12-guide';
    card.innerHTML=`
      <b>没有可靠匹配</b>
      <div class="muted" style="margin-top:6px">可能原因：平台接口没返回、当前平台筛选太窄、规格字段缺失、或严格过滤挡掉了疑似商品。</div>
      <div class="v12-actions">
        <button type="button" class="primary" id="v12RecoverAll">恢复全平台</button>
        <button type="button" id="v12Balanced">均衡排查</button>
        <button type="button" id="v12OpenDebug">展开诊断</button>
      </div>
    `;
    panel.appendChild(card);
    $('v12RecoverAll').onclick=restoreAllPlatforms;
    $('v12Balanced').onclick=()=>{localStorage.setItem(filterKey,'balanced'); if($('kw'))window.search($('kw').value);};
    $('v12OpenDebug').onclick=()=>{localStorage.setItem(viewKey,'debug'); window.jiabibiApplyViewMode&&window.jiabibiApplyViewMode(); switchDebug();};
  }

  function addNextStep(data,q,kept){
    const panel=$('panel-result'); if(!panel)return;
    if($('v12-next')) $('v12-next').remove();
    const providers=data.providers||[];
    const configured=providers.filter(p=>p.ok&&p.source!=='provider_placeholder').map(p=>p.platform).join('、')||'暂无';
    const card=document.createElement('div');
    card.id='v12-next';
    card.className='card v12-guide';
    card.innerHTML=`
      <b>下一步建议</b>
      <div class="muted" style="margin-top:6px">当前保留 ${kept} 个候选，真实返回平台：${configured}。如果价格异常，先看“诊断”；如果结果太少，试试“均衡排查”或恢复全平台。</div>
      <div class="v12-actions">
        <button type="button" id="v12CopyLink">复制搜索链接</button>
        <button type="button" id="v12ShowDebug">查看诊断</button>
      </div>
    `;
    panel.appendChild(card);
    $('v12CopyLink').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('status')&&($('status').textContent='已复制搜索链接');}catch(e){}};
    $('v12ShowDebug').onclick=()=>{localStorage.setItem(viewKey,'debug'); window.jiabibiApplyViewMode&&window.jiabibiApplyViewMode(); switchDebug();};
  }

  const oldRenderAll=window.renderAll;
  window.renderAll=function(data,q){
    lastData=data; lastQuery=q||lastQuery;
    const ret=oldRenderAll(data,q);
    ensureV12Style(); ensureGuide(); ensureBottomBar();
    setTimeout(()=>{addRecoveryIfNeeded(data,q); if(window.jiabibiApplyViewMode)window.jiabibiApplyViewMode();},0);
    return ret;
  };

  const oldSearch=window.search;
  window.search=async function(v){lastQuery=(v||($('kw')&&$('kw').value)||'').trim(); return oldSearch(v);};

  setTimeout(()=>{ensureV12Style(); ensureGuide(); ensureBottomBar(); if(window.jiabibiApplyViewMode)window.jiabibiApplyViewMode();},0);
})();
