// app-v18-buyfix.js: 顾客端购买按钮兜底修复。
// 第一性原理：用户点“去购买”必须能去真实平台，不让旧转链提示拦住淘宝。
(function(){
  const API='https://jiabibi-api.onrender.com';
  const cache=new Map();
  function $(id){return document.getElementById(id)}
  function q(){
    const p=new URLSearchParams(location.search);
    return String((($('kw')&&$('kw').value)||p.get('q')||p.get('keyword')||'')).trim();
  }
  function txt(el){return String(el&&el.innerText||el&&el.textContent||'').replace(/\s+/g,' ').trim()}
  function priceOfText(s){const m=String(s||'').match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/);return m?Number(m[1]):0}
  function priceOfItem(i){return Number(i&& (i.coupon_price_yuan||i.final_price||i.min_group_price_yuan||i.price||0))}
  function pickTb(goods,cardText){
    const price=priceOfText(cardText);
    const list=(goods||[]).filter(x=>x&&x.platform==='tb');
    if(!list.length)return null;
    let scored=list.map(x=>{
      let s=0;
      const name=String(x.goods_name||'');
      const shop=String(x.shop_name||'');
      if(price&&Math.abs(priceOfItem(x)-price)<0.02)s+=1000;
      if(name&&cardText.includes(name.slice(0,10)))s+=200;
      if(shop&&cardText.includes(shop.slice(0,4)))s+=80;
      if(x.material_url||x.url||x.item_url)s+=50;
      return {x,s};
    }).sort((a,b)=>b.s-a.s||priceOfItem(a.x)-priceOfItem(b.x));
    return scored[0]&&scored[0].x;
  }
  async function tbGoods(keyword){
    if(cache.has(keyword))return cache.get(keyword);
    const p=fetch(API+'/api/tb/real-search?q='+encodeURIComponent(keyword)+'&t=v18buy',{cache:'no-store'}).then(r=>r.json()).catch(e=>({ok:false,error:String(e),goods_list:[]}));
    cache.set(keyword,p); return p;
  }
  async function openTbFromCard(card){
    const keyword=q();
    if(!keyword){alert('请先输入商品名再购买。');return;}
    const text=txt(card||document.body);
    const data=await tbGoods(keyword);
    const item=pickTb(data.goods_list,text);
    let url=item&&(item.material_url||item.url||item.item_url);
    if(!url&&item&&item.goods_name)url='https://s.m.taobao.com/h5?q='+encodeURIComponent(item.goods_name);
    if(!url)url='https://s.m.taobao.com/h5?q='+encodeURIComponent(keyword);
    location.href=url;
  }
  function isBuyButton(el){
    if(!el)return false;
    const t=txt(el);
    return /去购买|购买|买最低价/.test(t)||el.hasAttribute('data-buy')||el.hasAttribute('data-stage3-buy');
  }
  function hasTb(card){return /淘宝|tb\.material|uland\.taobao|s\.m\.taobao/.test(txt(card));}
  document.addEventListener('click',function(e){
    const btn=e.target.closest&&e.target.closest('button,.buy,[data-buy],[data-stage3-buy]');
    if(!isBuyButton(btn))return;
    const card=btn.closest('.card,.candidate,.stage3-best,section,article,div')||btn.parentElement;
    if(!hasTb(card))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openTbFromCard(card);
  },true);
  window.jiabibiV18Buyfix=true;
  console.log('[v18] 淘宝购买按钮兜底已接管');
})();
