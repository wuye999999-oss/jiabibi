// app-v17-stage3.js: 第三阶段顾客端比价呈现层。只改展示，不破坏 v4-v16 主体。
(function(){
  const API='https://jiabibi-api.onrender.com';
  const providers={pdd:'拼多多',jd:'京东',tb:'淘宝',douyin:'抖音'};
  const groupNames={official:'官方/自营最低价',channel:'渠道店最低价',normal:'普通店最低价'};
  const officialWords=['官方旗舰店','品牌旗舰店','旗舰店','官方店','京东自营','自营','官方自营','天猫超市','官方'];
  const channelWords=['渠道','批发','厂家','工厂','源头','尾货','清仓','仓库','量贩','整箱批发','团购','商用','大包装','批发价','囤货','囤装'];
  const toolIds=['v6-tools','v7-mode','v8-tools','v9-tools','v10-tools','v11-mode','v12-customer-tools','panel-debug','panel-tests','testList'];
  let lastData=null,lastQuery='';
  let goodsIndex={};
  function $(id){return document.getElementById(id)}
  function yuan(n){return Number(n||0).toFixed(2).replace(/\.00$/,'')}
  function priceOf(i){return Number(i&& (i.coupon_price_yuan||i.final_price||i.min_group_price_yuan||i.price||999999))}
  function textOf(i){return [i.goods_name,i.goods_desc,i.brand_name,i.shop_name,(i.unified_tags||[]).join(' ')].filter(Boolean).join(' ')}
  function hasAny(t,arr){return arr.some(w=>String(t||'').includes(w))}
  function kindOf(i){const t=textOf(i); if(hasAny(t,officialWords))return'official'; if(hasAny(t,channelWords))return'channel'; return'normal'}
  function itemId(i){return [i.platform,i.goods_sign||i.sku_id||i.num_iid||i.goods_id||i.item_id||i.material_url||i.goods_name].join(':')}
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function image(i){return i.goods_thumbnail_url||i.goods_image_url||i.image||''}
  function pName(p){return providers[p]||p||'未知'}
  function isDebug(){return new URLSearchParams(location.search).get('debug')==='1'||localStorage.getItem('jiabibi_view_mode_v1')==='debug'}
  function safeSpec(i,q){try{return typeof spec==='function'?(spec(i,q)||''):''}catch(e){return''}}
  function safeValue(i,q){try{return typeof valueOf==='function'?(valueOf(i,q)||priceOf(i)):priceOf(i)}catch(e){return priceOf(i)}}
  function keepItem(i,q){try{return typeof diagnose==='function'?!!diagnose(i,q).keep:true}catch(e){return true}}
  function compactName(name){return String(name||'').replace(/\s+/g,' ').slice(0,72)}
  function setCustomerMode(){
    const debug=isDebug();
    document.body.classList.toggle('stage3-debug',debug);
    const tabs=document.querySelector('.tabs'); if(tabs)tabs.style.display=debug?'grid':'none';
    for(const id of toolIds){const el=$(id); if(el)el.style.display=debug?'':'none';}
    const tag=document.querySelector('.tag'); if(tag)tag.textContent='价比比 · 第三阶段 · 多平台真实比价';
    const sub=document.querySelector('.sub'); if(sub)sub.textContent='输入商品名或粘贴商品链接，只看官方/自营、渠道店、普通店三类最低价。淘宝/抖音未覆盖时只显示真实状态，不冒充。';
  }
  function providerCards(list){
    const arr=Array.isArray(list)?list:[];
    const seen=new Set(arr.map(x=>x.platform));
    for(const p of ['pdd','jd','tb','douyin']) if(!seen.has(p)) arr.push({platform:p,ok:false,total_count:0,message:p==='douyin'?'待接入':'暂无状态'});
    return `<div class="card"><b>平台状态</b><div class="grid" style="margin-top:10px">${arr.map(p=>`<div class="p"><b>${esc(pName(p.platform))}</b><div class="muted">${p.ok?'已返回':'待确认'}｜${Number(p.total_count||0)} 个</div><div class="muted">${esc(p.source||p.coverage||p.message||'')}</div></div>`).join('')}</div></div>`;
  }
  function selectBest(goods,q){
    const buckets={official:[],channel:[],normal:[]};
    for(const g of goods){
      if(!g||!g.platform)continue;
      if(g.platform==='douyin')continue;
      if(!keepItem(g,q))continue;
      buckets[kindOf(g)].push(g);
    }
    const best={};
    for(const k of Object.keys(buckets)){
      best[k]=buckets[k].sort((a,b)=>safeValue(a,q)-safeValue(b,q)||priceOf(a)-priceOf(b))[0]||null;
    }
    return {buckets,best};
  }
  function renderBestCard(k,item,q){
    if(!item)return `<div class="card"><div class="muted">${esc(groupNames[k])}</div><h3>暂无可靠候选</h3><div class="muted">该类目暂时没有通过品牌/品类/规格过滤的商品。</div></div>`;
    const id=itemId(item); goodsIndex[id]=item;
    const specText=safeSpec(item,q);
    const img=image(item);
    return `<div class="card stage3-best"><div class="row"><div><span class="pill ok">${esc(groupNames[k])}</span><span class="pill">${esc(pName(item.platform))}</span>${item.has_coupon?'<span class="pill warn">有券</span>':''}<h3 style="margin:10px 0 6px">${esc(compactName(item.goods_name))}</h3><div class="muted">${esc(item.shop_name||item.brand_name||'')} ${specText?`｜${esc(specText)}`:''}</div></div>${img?`<img src="${esc(img)}" style="width:78px;height:78px;object-fit:cover;border-radius:16px">`:''}</div><div class="row" style="align-items:center;margin-top:12px"><div><div class="price">¥${yuan(priceOf(item))}</div><div class="muted">${item.coupon_discount_yuan?`券约 ¥${yuan(item.coupon_discount_yuan)} ｜ `:''}${esc(item.sales_tip||'')}</div></div><button type="button" class="buy" data-stage3-buy="${esc(id)}">去购买</button></div></div>`;
  }
  function renderMore(goods,q){
    const list=goods.filter(x=>x&&x.platform&&keepItem(x,q)).sort((a,b)=>safeValue(a,q)-safeValue(b,q)||priceOf(a)-priceOf(b)).slice(0,12);
    if(!list.length)return '';
    return `<div class="card"><b>更多可靠候选</b><div style="margin-top:8px">${list.map((i,idx)=>{const id=itemId(i); goodsIndex[id]=i; return `<div class="candidate"><div class="row"><div><b>${idx+1}. ${esc(pName(i.platform))}｜¥${yuan(priceOf(i))}</b><div>${esc(compactName(i.goods_name))}</div><div class="muted">${esc(i.shop_name||'')} ${safeSpec(i,q)?'｜'+esc(safeSpec(i,q)):''}</div></div><button type="button" class="buy" data-stage3-buy="${esc(id)}">去购买</button></div></div>`}).join('')}</div></div>`;
  }
  function renderStage3(data,q){
    setCustomerMode();
    const panel=$('panel-result'); if(!panel)return;
    lastData=data||{}; lastQuery=q||lastQuery||(($('kw')&&$('kw').value)||''); goodsIndex={};
    const goods=Array.isArray(lastData.goods_list)?lastData.goods_list:[];
    const {best}=selectBest(goods,lastQuery);
    const linkMode=/^https?:\/\//i.test(lastQuery||'')||lastData.link;
    panel.innerHTML=`${providerCards(lastData.providers)}<div class="card"><b>${linkMode?'链接识别模式':'第三阶段比价结果'}</b><div class="muted" style="margin-top:6px">搜索：${esc(lastQuery||lastData.keyword||'')} ｜ 候选 ${goods.length} 个。价格以平台最终下单页为准。</div></div><div class="stage3-grid">${renderBestCard('official',best.official,lastQuery)}${renderBestCard('channel',best.channel,lastQuery)}${renderBestCard('normal',best.normal,lastQuery)}</div>${renderMore(goods,lastQuery)}<div class="card muted">第三阶段规则：先接全平台真实数据源，再统一字段和比价呈现；淘宝/抖音未接入或无权限时只显示真实状态，不拿其他平台冒充。</div>`;
  }
  function injectStyle(){
    if($('stage3-style'))return;
    const s=document.createElement('style'); s.id='stage3-style';
    s.textContent=`.stage3-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.stage3-best{min-height:210px}.stage3-best h3{line-height:1.35}.stage3-debug .tabs{display:grid!important}@media(max-width:780px){.stage3-grid{grid-template-columns:1fr}.candidate .row{display:block}.candidate .buy{width:100%;margin-top:8px}}`;
    document.head.appendChild(s);
  }
  async function openBuy(item){
    if(!item)return;
    let url=item.material_url||item.url||'';
    try{
      if(item.platform==='pdd'&&item.goods_sign){
        const r=await fetch(API+'/api/pdd/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goods_sign:item.goods_sign})}).then(x=>x.json());
        url=r.mobile_short_url||r.short_url||r.mobile_url||r.url||url;
      }else if(item.platform==='jd'){
        const r=await fetch(API+'/api/jd/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku_id:item.sku_id||item.goods_id,material_url:item.material_url,coupon_url:item.coupon_url})}).then(x=>x.json());
        url=r.click_url||r.url||url;
      }
    }catch(e){console.warn('[v17] 转链失败，使用原始链接',e)}
    if(url) location.href=url; else alert('这个平台暂时没有可跳转购买链接。');
  }
  document.addEventListener('click',e=>{const btn=e.target.closest&&e.target.closest('[data-stage3-buy]'); if(btn){e.preventDefault(); openBuy(goodsIndex[btn.getAttribute('data-stage3-buy')]);}});
  injectStyle(); setCustomerMode();
  const oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__v17stage3){
    const wrapped=function(data,q){const ret=oldRender(data,q); setTimeout(()=>renderStage3(data,q),0); return ret;};
    wrapped.__v17stage3=true; window.renderAll=wrapped;
  }
  [0,300,900,1800,3500].forEach(ms=>setTimeout(setCustomerMode,ms));
  window.jiabibiStage3=true;
  console.log('[v17] 第三阶段顾客端比价呈现层已加载');
})();
