// app-v16-final.js: stable customer entrance, q param restore, Taobao status marker
(function(){
  const API='https://jiabibi-api.onrender.com';
  const platforms=['pdd','jd','tb','douyin'];
  const platformKey='jiabibi_platform_filter_v1';
  const legacyKey='selectedPlatforms';
  const viewKey='jiabibi_view_mode_v1';
  const params=new URLSearchParams(location.search);
  const qParam=(params.get('q')||params.get('keyword')||'').trim();
  let searchStarted=false;
  function $(id){return document.getElementById(id)}
  function force(){
    localStorage.setItem(platformKey,JSON.stringify(platforms));
    localStorage.setItem(legacyKey,JSON.stringify(platforms));
    if(params.get('debug')==='1')localStorage.setItem(viewKey,'debug'); else localStorage.setItem(viewKey,'simple');
    const tag=document.querySelector('.tag');
    if(tag)tag.textContent='价比比 · 沙盒 v16 · 淘宝搜索已接入';
    const input=$('kw');
    if(input&&qParam&&input.value!==qParam)input.value=qParam;
  }
  async function patchProviderStatus(){
    try{
      const r=await fetch(API+'/api/providers/status',{cache:'no-store'});
      const s=await r.json();
      const tb=(s.providers||[]).find(x=>x.platform==='tb');
      if(tb){
        const box=$('status');
        if(box&&tb.search)box.textContent='准备好了。淘宝搜索已接入。';
      }
    }catch(e){}
  }
  function startQSearch(){
    if(searchStarted||!qParam)return;
    const input=$('kw');
    if(input)input.value=qParam;
    if(typeof window.search==='function'){
      searchStarted=true;
      try{window.search(qParam);}catch(e){console.warn('[v16] q搜索失败',e)}
    }
  }
  const oldApply=window.jiabibiApplyViewMode;
  window.jiabibiApplyViewMode=function(){
    const ret=typeof oldApply==='function'?oldApply.apply(this,arguments):undefined;
    setTimeout(force,0);
    return ret;
  };
  const oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__v16final){
    const wrapped=function(data,q){
      force();
      const ret=oldRender(data,q);
      setTimeout(force,0);
      setTimeout(patchProviderStatus,100);
      return ret;
    };
    wrapped.__v16final=true;
    window.renderAll=wrapped;
  }
  force();
  patchProviderStatus();
  [0,100,300,700,1200,2000,3500,5500,8000,12000].forEach(ms=>setTimeout(()=>{force(); if(ms===700||ms===2000)startQSearch();},ms));
  window.jiabibiV16Final=true;
  console.log('[v16] 稳定顾客补丁已加载，已禁用 v11/v14 标签覆盖影响');
})();
