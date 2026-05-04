// app-v11-patch.js: simple mode / debug mode visibility controls
(function(){
  const MODE_KEY='jiabibi_view_mode_v1';
  const $=id=>document.getElementById(id);
  const debugIds=['v6-tools','v7-mode','v8-tools','v9-tools','v10-tools'];
  const panels=['panel-debug','panel-tests'];
  const isMobile=()=>window.matchMedia&&window.matchMedia('(max-width: 640px)').matches;
  const defaultMode=()=>localStorage.getItem(MODE_KEY)||(isMobile()?'simple':'debug');
  const setMode=m=>{localStorage.setItem(MODE_KEY,m);applyMode();};
  const getMode=()=>localStorage.getItem(MODE_KEY)||defaultMode();

  function ensureV11Bar(){
    if($('v11-bar'))return;
    const status=$('status')||document.querySelector('.tabs');
    if(!status)return;
    const bar=document.createElement('div');
    bar.id='v11-bar';
    bar.className='card';
    bar.innerHTML=`
      <div class="row">
        <div>
          <b>展示模式</b>
          <div class="muted">简洁模式给普通用户看；调试模式给我们排查接口、过滤、规格问题。</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button type="button" id="viewSimple">简洁模式</button>
          <button type="button" id="viewDebug">调试模式</button>
          <button type="button" id="jumpDebug">展开诊断</button>
          <button type="button" id="backTop">返回顶部</button>
        </div>
      </div>
      <div id="v11Hint" class="muted" style="margin-top:8px"></div>
    `;
    status.insertAdjacentElement('afterend',bar);
    $('viewSimple').onclick=()=>setMode('simple');
    $('viewDebug').onclick=()=>setMode('debug');
    $('jumpDebug').onclick=()=>{setMode('debug'); switchToDebug();};
    $('backTop').onclick=()=>scrollTo({top:0,behavior:'smooth'});
  }

  function switchToDebug(){
    try{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
      const debugTab=[...document.querySelectorAll('.tab')].find(x=>x.dataset.tab==='debug');
      if(debugTab)debugTab.classList.add('on');
      ['result','debug','tests'].forEach(t=>{const el=$('panel-'+t); if(el)el.classList.toggle('hide',t!=='debug');});
      setTimeout(()=>{$('panel-debug')&&$('panel-debug').scrollIntoView({behavior:'smooth',block:'start'});},100);
    }catch(e){}
  }

  function applyMode(){
    ensureV11Bar();
    const mode=getMode();
    const simple=mode==='simple';
    debugIds.forEach(id=>{const el=$(id); if(el)el.style.display=simple?'none':'';});
    const tabs=document.querySelector('.tabs');
    if(tabs)tabs.style.display=simple?'none':'grid';
    panels.forEach(id=>{const el=$(id); if(el&&simple)el.classList.add('hide');});
    const result=$('panel-result'); if(result&&simple)result.classList.remove('hide');
    const s=$('viewSimple'), d=$('viewDebug'), hint=$('v11Hint');
    if(s){s.style.background=simple?'#111':'#fff';s.style.color=simple?'#fff':'#111';}
    if(d){d.style.background=!simple?'#111':'#fff';d.style.color=!simple?'#fff':'#111';}
    if(hint)hint.textContent=simple?'当前：简洁模式。隐藏诊断、导出、平台筛选、自检等工程工具，只保留比价主流程。':'当前：调试模式。显示诊断、导出、平台筛选、自检和自动测试。';
    const tag=document.querySelector('.tag');
    if(tag)tag.textContent='价比比 · 沙盒 v11 · '+(simple?'简洁模式':'调试模式');
  }

  // Keep mode applied after new tool cards appear.
  const oldRenderAll=window.renderAll;
  if(typeof oldRenderAll==='function'){
    window.renderAll=function(data,q){
      const ret=oldRenderAll(data,q);
      setTimeout(applyMode,0);
      return ret;
    };
  }

  // Make simple mode robust even if patches load later.
  setTimeout(applyMode,0);
  setTimeout(applyMode,500);
  setTimeout(applyMode,1500);

  window.jiabibiSetViewMode=setMode;
  window.jiabibiApplyViewMode=applyMode;
})();
