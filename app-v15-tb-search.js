// app-v15-tb-search.js: merge real Taobao search into existing result page
(function(){
  const API='https://jiabibi-api.onrender.com';
  const done=new Set();
  const $=id=>document.getElementById(id);
  function tag(){const x=document.querySelector('.tag'); if(x)x.textContent='价比比 · 沙盒 v15 · 淘宝搜索已接入';}
  function keyOf(x){return String(x.platform||'')+':'+String(x.goods_id||x.num_iid||x.item_id||x.sku_id||x.goods_sign||x.goods_name||'');}
  function merge(data,tb,q){
    const oldGoods=Array.isArray(data&&data.goods_list)?data.goods_list:[];
    const oldProviders=Array.isArray(data&&data.providers)?data.providers:[];
    const seen=new Set(oldGoods.map(keyOf));
    const add=(tb.goods_list||[]).filter(x=>{const k=keyOf(x); if(seen.has(k))return false; seen.add(k); return true;});
    const providers=oldProviders.filter(p=>p.platform!=='tb');
    providers.push({platform:'tb',name:'淘宝',ok:!!tb.ok,source:'tb.material.search',total_count:add.length,message:add.length?'淘宝搜索已接入':'淘宝搜索无结果'});
    const keptOld=oldGoods.filter(x=>!(x.platform==='tb'||x.source==='provider_placeholder'));
    return Object.assign({},data||{},{keyword:q,providers,goods_list:keptOld.concat(add)});
  }
  async function loadTb(data,q,renderFn){
    q=String(q||($('kw')&&$('kw').value)||'').trim();
    if(!q||/^https?:\/\//i.test(q))return;
    if(done.has(q))return; done.add(q);
    try{
      const r=await fetch(API+'/api/tb/search?q='+encodeURIComponent(q),{cache:'no-store'});
      const tb=await r.json();
      console.log('[v15] 淘宝搜索返回',tb);
      const merged=merge(data||{},tb||{},q);
      renderFn(merged,q);
      if(window.jiabibiApplyViewMode)window.jiabibiApplyViewMode();
      tag();
      const s=$('status');
      if(s&&tb&&tb.error)s.textContent='淘宝搜索异常：'+(tb.message||tb.error);
    }catch(e){console.warn('[v15] 淘宝搜索失败',e);}
  }
  const oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__v15tb){
    const wrapped=function(data,q){
      const ret=oldRender(data,q);
      setTimeout(()=>loadTb(data,q,oldRender),0);
      setTimeout(tag,50);
      return ret;
    };
    wrapped.__v15tb=true;
    window.renderAll=wrapped;
  }
  [0,100,300,800,1600,3000,5000,8000].forEach(t=>setTimeout(tag,t));
  window.jiabibiV15TbLoaded=true;
  console.log('[v15] 淘宝搜索补水补丁已加载');
})();
