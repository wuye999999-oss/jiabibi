// app-v15-tb-search.js: merge real Taobao search into existing result page
(function(){
  const API='https://jiabibi-api.onrender.com';
  const done=new Set();
  const $=id=>document.getElementById(id);
  function keyOf(x){return String(x.platform||'')+':'+String(x.goods_id||x.num_iid||x.item_id||x.sku_id||x.goods_sign||x.goods_name||'');}
  function merge(data,tb,q){
    const oldGoods=Array.isArray(data&&data.goods_list)?data.goods_list:[];
    const oldProviders=Array.isArray(data&&data.providers)?data.providers:[];
    const seen=new Set(oldGoods.map(keyOf));
    const add=(tb.goods_list||[]).filter(x=>{const k=keyOf(x); if(seen.has(k))return false; seen.add(k); return true;});
    const providers=oldProviders.filter(p=>p.platform!=='tb');
    providers.push({platform:'tb',name:'淘宝',ok:!!tb.ok,source:'tb.material.search',total_count:add.length,message:add.length?'淘宝搜索已接入':'淘宝搜索无结果'});
    return Object.assign({},data||{},{keyword:q,providers,goods_list:oldGoods.filter(x=>!(x.platform==='tb'&&x.source==='provider_placeholder')).concat(add)});
  }
  async function loadTb(data,q,renderFn){
    q=String(q||($('kw')&&$('kw').value)||'').trim();
    if(!q||/^https?:\/\//i.test(q))return;
    if(done.has(q))return; done.add(q);
    try{
      const r=await fetch(API+'/api/tb/search?q='+encodeURIComponent(q),{cache:'no-store'});
      const tb=await r.json();
      console.log('[v15] 淘宝搜索返回',tb);
      if(tb&&Array.isArray(tb.goods_list)&&tb.goods_list.length){
        renderFn(merge(data,tb,q),q);
        if(window.jiabibiApplyViewMode)window.jiabibiApplyViewMode();
      }
    }catch(e){console.warn('[v15] 淘宝搜索失败',e);}
  }
  const oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__v15tb){
    const wrapped=function(data,q){
      const ret=oldRender(data,q);
      setTimeout(()=>loadTb(data,q,oldRender),0);
      return ret;
    };
    wrapped.__v15tb=true;
    window.renderAll=wrapped;
  }
  console.log('[v15] 淘宝搜索补水补丁已加载');
})();
