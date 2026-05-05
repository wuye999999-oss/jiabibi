// app-v16-final.js: single stable customer patch. No v11/v14/v15 fighting.
(function(){
  const API='https://jiabibi-api.onrender.com';
  const ALL=['pdd','jd','tb','douyin'];
  const platformKey='jiabibi_platform_filter_v1';
  const legacyKey='selectedPlatforms';
  const viewKey='jiabibi_view_mode_v1';
  const params=new URLSearchParams(location.search);
  const qParam=(params.get('q')||params.get('keyword')||'').trim();
  const tbDone=new Set();
  let qStarted=false;
  function $(id){return document.getElementById(id)}
  function stableUi(){
    localStorage.setItem(platformKey,JSON.stringify(ALL));
    localStorage.setItem(legacyKey,JSON.stringify(ALL));
    localStorage.setItem(viewKey,params.get('debug')==='1'?'debug':'simple');
    const tag=document.querySelector('.tag');
    if(tag)tag.textContent='价比比 · 稳定版 v16 · 淘宝搜索已接入';
    const kw=$('kw');
    if(kw&&qParam&&kw.value!==qParam)kw.value=qParam;
  }
  function itemKey(x){return String(x.platform||'')+':'+String(x.goods_id||x.num_iid||x.item_id||x.sku_id||x.goods_sign||x.goods_name||'');}
  function mergeTb(data,tb,q){
    const oldGoods=Array.isArray(data&&data.goods_list)?data.goods_list:[];
    const oldProviders=Array.isArray(data&&data.providers)?data.providers:[];
    const seen=new Set(oldGoods.map(itemKey));
    const add=(Array.isArray(tb&&tb.goods_list)?tb.goods_list:[]).filter(x=>{const k=itemKey(x); if(seen.has(k))return false; seen.add(k); return true;});
    const goods=oldGoods.filter(x=>!(x.platform==='tb'||x.source==='provider_placeholder')).concat(add);
    const providers=oldProviders.filter(p=>p.platform!=='tb');
    providers.push({platform:'tb',name:'淘宝',ok:!!(tb&&tb.ok),source:'tb.material.search',total_count:add.length,message:add.length?'淘宝搜索已接入':'淘宝搜索无结果'});
    return Object.assign({},data||{},{keyword:q,providers,goods_list:goods});
  }
  async function hydrateTb(data,q,renderFn){
    q=String(q||($('kw')&&$('kw').value)||'').trim();
    if(!q||/^https?:\/\//i.test(q))return;
    if(tbDone.has(q))return; tbDone.add(q);
    try{
      const res=await fetch(API+'/api/tb/real-search?q='+encodeURIComponent(q),{cache:'no-store'});
      const tb=await res.json();
      console.log('[v16] 淘宝真实搜索返回',tb);
      const merged=mergeTb(data||{},tb||{},q);
      renderFn(merged,q);
      setTimeout(stableUi,0);
      const status=$('status');
      if(status&&tb&&tb.error)status.textContent='淘宝搜索异常：'+(tb.message||tb.error);
    }catch(e){console.warn('[v16] 淘宝搜索失败',e)}
  }
  function startQ(){
    if(qStarted||!qParam||typeof window.search!=='function')return;
    qStarted=true;
    const kw=$('kw'); if(kw)kw.value=qParam;
    try{window.search(qParam)}catch(e){console.warn('[v16] q搜索失败',e)}
  }
  const oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__v16stable){
    const wrapped=function(data,q){
      stableUi();
      const ret=oldRender(data,q);
      setTimeout(()=>hydrateTb(data,q,oldRender),0);
      setTimeout(stableUi,0);
      return ret;
    };
    wrapped.__v16stable=true;
    window.renderAll=wrapped;
  }
  stableUi();
  [0,100,300,700,1200,2000,3500,5500,8000].forEach(ms=>setTimeout(()=>{stableUi(); if(ms===700||ms===2000)startQ();},ms));
  window.jiabibiV16Stable=true;
  console.log('[v16] 稳定版已加载：只保留 v16 标签，淘宝走真实搜索补水');
})();