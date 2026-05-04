// app-v13-patch.js: consumer polish for the simple product-facing experience
(function(){
  const VIEW_KEY='jiabibi_view_mode_v1';
  const $=id=>document.getElementById(id);
  let lastData=null;
  let lastQuery='';

  function isSimple(){
    const stored=localStorage.getItem(VIEW_KEY);
    if(stored)return stored==='simple';
    return window.matchMedia&&window.matchMedia('(max-width:640px)').matches;
  }

  function ensureStyle(){
    if($('v13-style'))return;
    const style=document.createElement('style');
    style.id='v13-style';
    style.textContent=`
      body.jb-simple .hero{padding-top:26px;padding-bottom:12px}
      body.jb-simple .logo{font-size:48px}
      body.jb-simple .sub{font-size:14px}
      body.jb-simple #providers{grid-template-columns:repeat(4,1fr)}
      body.jb-simple .box{box-shadow:none;background:rgba(255,255,255,.82)}
      body.jb-simple .card{box-shadow:0 14px 38px rgba(0,0,0,.07);border:1px solid rgba(255,255,255,.8)}
      body.jb-simple .price{letter-spacing:-1px}
      .v13-head{background:linear-gradient(180deg,#fff,#f7f7fa);border:1px solid #ececf1}
      .v13-head h2{font-size:24px;margin:0;letter-spacing:-.5px}
      .v13-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
      .v13-kpi{border:1px solid #e5e5ea;border-radius:16px;background:#fff;padding:10px;text-align:center}
      .v13-kpi b{display:block;font-size:18px;margin-bottom:2px}
      .v13-trust{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .v13-trust span{background:#f2f2f7;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:800;color:#555}
      .v13-card-hint{font-size:12px;color:#86868b;margin-top:8px}
      @media(max-width:640px){body.jb-simple #providers{grid-template-columns:repeat(2,1fr)}.v13-kpis{grid-template-columns:1fr}.v13-head h2{font-size:21px}}
    `;
    document.head.appendChild(style);
  }

  function applyBodyClass(){
    document.body.classList.toggle('jb-simple',isSimple());
    document.body.classList.toggle('jb-debug',!isSimple());
  }

  function countKept(data,q){
    const list=data?.goods_list||[];
    let kept=0;
    for(const i of list){try{if(diagnose(i,q).keep)kept++;}catch(e){}}
    return kept;
  }

  function countTypes(data,q){
    const out={official:0,channel:0,normal:0};
    const list=data?.goods_list||[];
    for(const i of list){
      try{if(diagnose(i,q).keep){const t=typeOf(i); if(out[t]!==undefined)out[t]++;}}
      catch(e){}
    }
    return out;
  }

  function providerCount(data){
    const ps=data?.providers||[];
    const live=ps.filter(p=>p.ok&&p.source!=='provider_placeholder').length;
    const total=ps.length||4;
    return {live,total};
  }

  function insertConsumerHead(data,q){
    const panel=$('panel-result'); if(!panel||!data)return;
    const old=$('v13-head'); if(old)old.remove();
    const kept=countKept(data,q), raw=(data.goods_list||[]).length, types=countTypes(data,q), pc=providerCount(data);
    const card=document.createElement('div');
    card.id='v13-head';
    card.className='card v13-head';
    card.innerHTML=`
      <h2>四平台三类价格</h2>
      <div class="muted" style="margin-top:6px">搜索：${escapeHtml(q||'')}。默认按可识别单位价排序，错品宁可过滤。</div>
      <div class="v13-kpis">
        <div class="v13-kpi"><b>${kept}</b><span class="muted">可靠候选</span></div>
        <div class="v13-kpi"><b>${pc.live}/${pc.total}</b><span class="muted">真实返回平台</span></div>
        <div class="v13-kpi"><b>${raw}</b><span class="muted">原始候选</span></div>
      </div>
      <div class="v13-trust">
        <span>官方/自营 ${types.official}</span>
        <span>渠道店 ${types.channel}</span>
        <span>普通店 ${types.normal}</span>
        <span>单位价优先</span>
      </div>
    `;
    panel.insertAdjacentElement('afterbegin',card);
  }

  function annotateResultCards(){
    const panel=$('panel-result'); if(!panel)return;
    [...panel.querySelectorAll('.card')].forEach(card=>{
      const text=card.textContent||'';
      if(card.dataset.v13Annotated)return;
      let hint='';
      if(text.includes('官方/自营最低价')) hint='优先看品牌官方、自营、旗舰店来源，适合要稳定和售后的用户。';
      else if(text.includes('渠道店最低价')) hint='渠道店可能更低，但要注意店铺资质和规格是否一致。';
      else if(text.includes('普通店最低价')) hint='普通店只作为价格参考，最终仍以规格、店铺和券后价为准。';
      if(hint){
        const div=document.createElement('div');
        div.className='v13-card-hint';
        div.textContent=hint;
        card.appendChild(div);
        card.dataset.v13Annotated='1';
      }
    });
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  const oldRenderAll=window.renderAll;
  window.renderAll=function(data,q){
    lastData=data; lastQuery=q||lastQuery;
    const ret=oldRenderAll(data,q);
    ensureStyle(); applyBodyClass();
    setTimeout(()=>{insertConsumerHead(data,q); annotateResultCards(); applyBodyClass(); if(window.jiabibiApplyViewMode)window.jiabibiApplyViewMode();},0);
    return ret;
  };

  const oldSearch=window.search;
  window.search=async function(v){lastQuery=(v||($('kw')&&$('kw').value)||'').trim(); return oldSearch(v);};

  const oldApply=window.jiabibiApplyViewMode;
  window.jiabibiApplyViewMode=function(){
    if(oldApply)oldApply();
    ensureStyle(); applyBodyClass();
    if(lastData) setTimeout(()=>{insertConsumerHead(lastData,lastQuery); annotateResultCards();},0);
  };

  setTimeout(()=>{ensureStyle();applyBodyClass();},0);
})();
