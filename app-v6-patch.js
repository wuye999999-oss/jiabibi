// app-v6-patch.js: usability, reproducibility, and diagnostics tools
(function(){
  const API='https://jiabibi-api.onrender.com';
  const STORE_KEY='jiabibi_recent_queries_v1';
  let lastQuery='';
  let lastDataForCopy=null;

  const $=id=>document.getElementById(id);
  const isUrl=q=>/^https?:\/\//i.test(String(q||'')) || /(yangkeduo|jd\.com|taobao|tmall|douyin)\./i.test(String(q||''));
  const readRecent=()=>{try{return JSON.parse(localStorage.getItem(STORE_KEY)||'[]')}catch(e){return[]}};
  const saveRecent=q=>{q=String(q||'').trim(); if(!q)return; const arr=[q,...readRecent().filter(x=>x!==q)].slice(0,10); localStorage.setItem(STORE_KEY,JSON.stringify(arr)); renderRecent();};
  function setStatus(msg){const el=$('status'); if(el)el.textContent=msg;}

  function ensureTools(){
    if($('v6-tools'))return;
    const tabs=document.querySelector('.tabs');
    if(!tabs)return;
    const wrap=document.createElement('div');
    wrap.id='v6-tools';
    wrap.className='card';
    wrap.innerHTML=`
      <div class="row">
        <div>
          <b>沙盒工具</b>
          <div class="muted">用于复现问题、导出诊断、检查 API 状态。</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button type="button" id="copyDiag">复制诊断</button>
          <button type="button" id="openProvider">API状态</button>
          <button type="button" id="clearCache">清缓存</button>
        </div>
      </div>
      <div id="recentQueries" class="chips" style="padding-bottom:0"></div>
    `;
    tabs.insertAdjacentElement('afterend',wrap);
    $('copyDiag').onclick=copyDiagnostics;
    $('openProvider').onclick=()=>window.open(API+'/api/providers/status','_blank');
    $('clearCache').onclick=()=>{localStorage.removeItem(STORE_KEY); location.reload();};
    renderRecent();
  }

  function renderRecent(){
    const box=$('recentQueries'); if(!box)return;
    const arr=readRecent();
    box.innerHTML='';
    if(!arr.length){box.innerHTML='<span class="muted">暂无搜索历史。</span>';return;}
    arr.forEach(q=>{
      const b=document.createElement('button');
      b.type='button'; b.className='chip'; b.textContent=q.length>22?q.slice(0,22)+'…':q;
      b.title=q; b.onclick=()=>window.search(q);
      box.appendChild(b);
    });
  }

  const originalSearch=window.search;
  window.search=async function(v){
    const q=(v||($('kw')&&$('kw').value)||'').trim();
    if(!q)return;
    lastQuery=q;
    saveRecent(q);
    const url=new URL(location.href);
    url.searchParams.set('q',q);
    history.replaceState(null,'',url.toString());
    if(isUrl(q))setStatus('链接识别模式：正在解析商品链接...');
    return originalSearch(q);
  };

  const originalRenderAll=window.renderAll;
  window.renderAll=function(data,q){
    lastDataForCopy=data;
    lastQuery=q||lastQuery;
    return originalRenderAll(data,q);
  };

  async function copyDiagnostics(){
    try{
      const payload={
        time:new Date().toISOString(),
        url:location.href,
        query:lastQuery||($('kw')&&$('kw').value)||'',
        api:API,
        health:null,
        provider_status:null,
        result_summary:null
      };
      try{payload.health=await fetch(API+'/health').then(r=>r.json())}catch(e){payload.health_error=e.message}
      try{payload.provider_status=await fetch(API+'/api/providers/status').then(r=>r.json())}catch(e){payload.provider_status_error=e.message}
      if(lastDataForCopy){
        const list=lastDataForCopy.goods_list||[];
        let kept=[];
        try{kept=list.filter(x=>diagnose(x,payload.query).keep)}catch(e){}
        payload.result_summary={keyword:lastDataForCopy.keyword,total_count:lastDataForCopy.total_count,raw:list.length,kept:kept.length,providers:lastDataForCopy.providers};
        payload.samples=list.slice(0,8).map(x=>({platform:x.platform,source:x.source,price:x.coupon_price_yuan||x.min_group_price_yuan,name:x.goods_name,shop:x.shop_name,brand:x.brand_name}));
      }
      const txt=JSON.stringify(payload,null,2);
      await navigator.clipboard.writeText(txt);
      setStatus('已复制诊断信息。');
    }catch(e){
      setStatus('复制诊断失败：'+e.message);
    }
  }

  function bindEnterFix(){
    const input=$('kw'); if(!input)return;
    input.addEventListener('input',()=>{if(isUrl(input.value))setStatus('检测到商品链接，提交后会进入链接识别模式。')});
  }

  function loadQueryFromUrl(){
    const q=new URL(location.href).searchParams.get('q');
    if(q&&$('kw')){ $('kw').value=q; setTimeout(()=>window.search(q),300); }
  }

  const oldInit=window.init;
  window.init=function(){
    const ret=oldInit?oldInit():undefined;
    ensureTools();
    bindEnterFix();
    setTimeout(loadQueryFromUrl,600);
    return ret;
  };

  // app-v4 calls init immediately before this file loads, so also run tools now.
  setTimeout(()=>{ensureTools();bindEnterFix();loadQueryFromUrl();},0);
})();
