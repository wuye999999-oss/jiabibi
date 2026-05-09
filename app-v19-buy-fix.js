// app-v19-buy-fix.js: 最后兜底接管“去购买”。解决旧页面淘宝/抖音按钮显示“未接入”。
(function(){
  const API='https://jiabibi-api.onrender.com';
  const MAP={};
  let lastQuery='';
  function $(id){return document.getElementById(id)}
  function text(el){return String((el&&el.textContent)||'').replace(/\s+/g,' ').trim()}
  function taobaoSearch(q){return 'https://s.m.taobao.com/h5?q='+encodeURIComponent(String(q||'').trim()||'商品')}
  function douyinSearch(q){return 'https://www.douyin.com/search/'+encodeURIComponent(String(q||'').trim()||'商品')}
  function titleFromCard(btn){
    const card=btn&&btn.closest&&btn.closest('.card,.candidate,section,body');
    if(!card)return (($('kw')&&$('kw').value)||lastQuery||'商品');
    const h=card.querySelector('h1,h2,h3,b');
    let s=text(h)||text(card)||(($('kw')&&$('kw').value)||lastQuery||'商品');
    s=s.replace(/官方\/自营最低价|渠道店最低价|普通店最低价|去购买|淘宝|拼多多|京东|抖音|¥\s*\d+(?:\.\d+)?|约\s*¥?\d+(?:\.\d+)?\/?kg|约\s*¥?\d+(?:\.\d+)?\/?L|约\s*¥?\d+(?:\.\d+)?\/?100ml/g,' ')
       .replace(/\s+/g,' ').trim();
    return s||(($('kw')&&$('kw').value)||lastQuery||'商品');
  }
  function isTaobaoButton(btn){
    const card=btn&&btn.closest&&btn.closest('.card,.candidate,section,body');
    const t=text(card);
    return /淘宝|天猫/.test(t);
  }
  function isDouyinButton(btn){
    const card=btn&&btn.closest&&btn.closest('.card,.candidate,section,body');
    return /抖音/.test(text(card));
  }
  function itemUrl(item){return item&&(item.material_url||item.url||item.item_url||item.product_url||item.detail_url||'')}
  async function openItem(item, fallbackTitle){
    if(!item){
      location.href=taobaoSearch(fallbackTitle); return;
    }
    const p=String(item.platform||'').toLowerCase();
    let url=itemUrl(item);
    if(p==='tb'||p==='taobao'||p==='tmall'){
      location.href=url||taobaoSearch(item.goods_name||fallbackTitle||lastQuery); return;
    }
    if(p==='douyin'||p==='dy'){
      try{
        if(url){
          const r=await fetch(API+'/api/douyin/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_url:url,product_ext:item.product_ext||item.ext||''})}).then(x=>x.json());
          url=r.url||r.dy_deeplink||r.dy_zlink||r.dy_sharelink||url;
        }
      }catch(e){console.warn('[v19] douyin link fallback',e)}
      location.href=url||douyinSearch(item.goods_name||fallbackTitle||lastQuery); return;
    }
    // 拼多多/京东仍交给旧逻辑，避免破坏已有转链。
    return false;
  }
  function collect(data,q){
    lastQuery=q||lastQuery||(($('kw')&&$('kw').value)||'');
    const list=(data&&data.goods_list)||[];
    list.forEach((x,i)=>{
      const key=x._key||('g'+i);
      MAP[key]=x;
      if(x.goods_id)MAP[String(x.platform||'')+':'+x.goods_id]=x;
      if(x.product_id)MAP[String(x.platform||'')+':'+x.product_id]=x;
      if(x.num_iid)MAP[String(x.platform||'')+':'+x.num_iid]=x;
    });
    window.__jiabibiBuyMap=MAP;
  }
  function parseKey(btn){
    const a=btn&&btn.getAttribute&&btn.getAttribute('onclick')||'';
    const m=a.match(/buyByKey\(['"]([^'"]+)['"]\)/);
    return m?m[1]:btn.getAttribute('data-stage18-buy')||btn.getAttribute('data-stage3-buy')||'';
  }
  const oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__v19BuyFix){
    const wrapped=function(data,q){collect(data,q); return oldRender.apply(this,arguments)};
    wrapped.__v19BuyFix=true;
    window.renderAll=wrapped;
  }
  const oldBuy=window.buyByKey;
  if(typeof oldBuy==='function'&&!oldBuy.__v19BuyFix){
    const wrappedBuy=function(key){
      const item=MAP[key]||(window.__jiabibiBuyMap&&window.__jiabibiBuyMap[key]);
      if(item&&(String(item.platform||'').toLowerCase()==='tb'||String(item.platform||'').toLowerCase()==='taobao'||String(item.platform||'').toLowerCase()==='tmall'||String(item.platform||'').toLowerCase()==='douyin'||String(item.platform||'').toLowerCase()==='dy')){
        openItem(item,item.goods_name||lastQuery); return;
      }
      return oldBuy.apply(this,arguments);
    };
    wrappedBuy.__v19BuyFix=true;
    window.buyByKey=wrappedBuy;
  }
  document.addEventListener('click',function(e){
    const btn=e.target&&e.target.closest&&e.target.closest('button,.buy');
    if(!btn||!text(btn).includes('去购买'))return;
    const key=parseKey(btn);
    const item=key&&(MAP[key]||(window.__jiabibiBuyMap&&window.__jiabibiBuyMap[key]));
    if(item&&(String(item.platform||'').toLowerCase()==='tb'||String(item.platform||'').toLowerCase()==='taobao'||String(item.platform||'').toLowerCase()==='tmall'||String(item.platform||'').toLowerCase()==='douyin'||String(item.platform||'').toLowerCase()==='dy')){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openItem(item,item.goods_name||titleFromCard(btn));return;
    }
    if(!item&&isTaobaoButton(btn)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();location.href=taobaoSearch(titleFromCard(btn));return;
    }
    if(!item&&isDouyinButton(btn)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();location.href=douyinSearch(titleFromCard(btn));return;
    }
  },true);
  console.log('[v19] 淘宝/抖音去购买兜底已加载');
})();
