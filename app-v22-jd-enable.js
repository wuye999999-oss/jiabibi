// app-v22-jd-enable.js: final lightweight override. Put JD back into customer UI after v18/v21 patches.
(function(){
  const API='https://jiabibi-api.onrender.com';
  const ACTIVE=['pdd','jd','tb','douyin'];
  const NAME={pdd:'拼多多',jd:'京东',tb:'淘宝',douyin:'抖音'};
  const GROUP={official:'官方/自营最低价',channel:'渠道店最低价',normal:'普通店最低价'};
  const officialWords=['官方旗舰店','品牌旗舰店','旗舰店','官方店','京东自营','自营','天猫超市','天猫旗舰','官方'];
  const channelWords=['渠道','批发','厂家','工厂','源头','尾货','清仓','仓库','量贩','整箱批发','团购','商用','大包装','批发价','囤货','囤装'];
  let lastData=null,lastQuery='',buyMap={};
  const $=id=>document.getElementById(id);
  const yuan=n=>Number(n||0).toFixed(2).replace(/\.00$/,'');
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pName=p=>NAME[p]||p||'未知';
  const priceOf=i=>Number(i&&(i.coupon_price_yuan||i.final_price||i.min_group_price_yuan||i.price||999999));
  const textOf=i=>[i&&i.goods_name,i&&i.goods_desc,i&&i.brand_name,i&&i.shop_name,((i&&i.unified_tags)||[]).join(' ')].filter(Boolean).join(' ');
  const hasAny=(t,arr)=>arr.some(w=>String(t||'').includes(w));
  const kindOf=i=>{const t=textOf(i); if(hasAny(t,officialWords))return'official'; if(hasAny(t,channelWords))return'channel'; return'normal'};
  const image=i=>i&&(i.goods_thumbnail_url||i.goods_image_url||i.image||'');
  const compact=s=>String(s||'').replace(/\s+/g,' ').slice(0,72);
  function safeSpec(i,q){try{return typeof spec==='function'?(spec(i,q)||''):''}catch(e){return''}}
  function safeValue(i,q){try{return typeof valueOf==='function'?(valueOf(i,q)||priceOf(i)):priceOf(i)}catch(e){return priceOf(i)}}
  function keepItem(i,q){try{return typeof diagnose==='function'?!!diagnose(i,q).keep:true}catch(e){return true}}
  function canon(p){p=String(p||'').toLowerCase(); if(['pdd','pinduoduo','拼多多'].includes(p))return'pdd'; if(['jd','jingdong','京东'].includes(p))return'jd'; if(['tb','taobao','tmall','淘宝','天猫'].includes(p))return'tb'; if(['dy','douyin','抖音'].includes(p))return'douyin'; return p;}
  function goods(list){return (Array.isArray(list)?list:[]).map(x=>{const p=canon(x.platform||x.provider||x.source_platform); return ACTIVE.includes(p)?Object.assign({},x,{platform:p}):null}).filter(Boolean)}
  function itemKey(i){return [i.platform,i.goods_sign||i.sku_id||i.skuId||i.num_iid||i.product_id||i.goods_id||i.item_id||i.material_url||i.url||i.goods_name].join(':')}
  function setSimpleMode(){
    try{localStorage.setItem('jiabibi_platform_filter_v1',JSON.stringify(ACTIVE));localStorage.setItem('selectedPlatforms',JSON.stringify(ACTIVE));}catch(e){}
    const tabs=document.querySelector('.tabs'); if(tabs)tabs.style.display='none';
    ['panel-debug','panel-tests','testList'].forEach(id=>{const el=$(id); if(el)el.style.display='none'});
    const tag=document.querySelector('.tag'); if(tag)tag.textContent='价比比 · 真实比价';
    const sub=document.querySelector('.sub'); if(sub)sub.textContent='拼多多、京东、淘宝、抖音真实接口返回才展示，不拿其他平台冒充。';
  }
  function providerCards(data,gs){
    const ps=(data&&data.providers)||[]; const picked={}; ps.forEach(x=>{const p=canon(x.platform); if(ACTIVE.includes(p))picked[p]=x});
    const counts=Object.fromEntries(ACTIVE.map(p=>[p,0])); gs.forEach(x=>counts[x.platform]=(counts[x.platform]||0)+1);
    return `<div class="card"><b>平台状态：拼多多 / 京东 / 淘宝 / 抖音</b><div class="grid v22-provider-grid">${ACTIVE.map(p=>{const st=picked[p]||{}; const cnt=Number(st.total_count||st.count||counts[p]||0); const ok=st.ok||cnt>0||st.configured; return `<div class="p"><b>${pName(p)}</b><div class="pill ${ok?'ok':'warn'}">${ok?'已接入':'待返回'}｜${cnt} 个</div><div class="empty">${esc(st.source||st.coverage||st.message||(p==='jd'?'jd.union':'真实接口'))}</div></div>`}).join('')}</div></div>`;
  }
  function platformSummary(gs,q){
    const by=Object.fromEntries(ACTIVE.map(p=>[p,[]]));
    gs.filter(x=>keepItem(x,q)).forEach(x=>{if(by[x.platform])by[x.platform].push(x)});
    return `<div class="card"><b>平台最低价快照</b><div class="grid v22-provider-grid">${ACTIVE.map(p=>{const arr=by[p].sort((a,b)=>safeValue(a,q)-safeValue(b,q)||priceOf(a)-priceOf(b)); const top=arr[0]; return `<div class="p"><b>${pName(p)}</b><div class="price" style="font-size:24px">${top?'¥'+yuan(priceOf(top)):'暂无'}</div><div class="muted">保留 ${arr.length} 个${top?'｜'+esc(compact(top.goods_name)):''}</div></div>`}).join('')}</div></div>`;
  }
  function bestByGroup(gs,q){
    const b={official:[],channel:[],normal:[]};
    gs.filter(x=>keepItem(x,q)).forEach(x=>b[kindOf(x)].push(x));
    return Object.fromEntries(Object.keys(b).map(k=>[k,b[k].sort((a,b)=>safeValue(a,q)-safeValue(b,q)||priceOf(a)-priceOf(b))[0]||null]));
  }
  function bestCard(k,item,q){
    if(!item)return `<div class="card"><div class="muted">${GROUP[k]}</div><h3>暂无可靠候选</h3><div class="muted">四个平台暂时没有通过过滤的商品。</div></div>`;
    const key=itemKey(item); buyMap[key]=item; const img=image(item); const sp=safeSpec(item,q);
    return `<div class="card"><div class="row"><div><span class="pill ok">${GROUP[k]}</span><span class="pill">${pName(item.platform)}</span><h3 style="margin:10px 0 6px">${esc(compact(item.goods_name))}</h3><div class="muted">${esc(item.shop_name||item.brand_name||'')}${sp?'｜'+esc(sp):''}</div></div>${img?`<img src="${esc(img)}" style="width:78px;height:78px;object-fit:cover;border-radius:16px">`:''}</div><div class="row" style="align-items:center;margin-top:12px"><div><div class="price">¥${yuan(priceOf(item))}</div><div class="muted">${esc(item.sales_tip||'')}</div></div><button type="button" class="buy" data-v22-buy="${esc(key)}">去购买</button></div></div>`;
  }
  function more(gs,q){
    const list=gs.filter(x=>keepItem(x,q)).sort((a,b)=>safeValue(a,q)-safeValue(b,q)||priceOf(a)-priceOf(b)).slice(0,12);
    if(!list.length)return '';
    return `<div class="card"><b>更多可靠候选</b>${list.map((i,idx)=>{const key=itemKey(i); buyMap[key]=i; return `<div class="candidate"><div class="row"><div><b>${idx+1}. ${pName(i.platform)}｜¥${yuan(priceOf(i))}</b><div>${esc(compact(i.goods_name))}</div><div class="muted">${esc(i.shop_name||'')}</div></div><button type="button" class="buy" data-v22-buy="${esc(key)}">去购买</button></div></div>`}).join('')}</div>`;
  }
  function render(data,q){
    lastData=data||lastData||{}; lastQuery=q||lastQuery||(($('kw')&&$('kw').value)||''); buyMap={}; setSimpleMode();
    const panel=$('panel-result'); if(!panel)return;
    const gs=goods(lastData.goods_list); const best=bestByGroup(gs,lastQuery);
    panel.innerHTML=`${providerCards(lastData,gs)}${platformSummary(gs,lastQuery)}<div class="card"><b>拼多多 / 京东 / 淘宝 / 抖音比价结果</b><div class="muted" style="margin-top:6px">搜索：${esc(lastQuery||lastData.keyword||'')} ｜ 四平台候选 ${gs.length} 个。价格以平台最终下单页为准。</div></div><div class="v22-best-grid">${bestCard('official',best.official,lastQuery)}${bestCard('channel',best.channel,lastQuery)}${bestCard('normal',best.normal,lastQuery)}</div>${more(gs,lastQuery)}<div class="card muted">真实接口返回才展示；京东现在已参与顾客端展示和购买链接兜底。</div>`;
  }
  async function openBuy(item){
    if(!item)return; let url=item.material_url||item.url||item.item_url||item.product_url||'';
    try{
      if(item.platform==='pdd'&&item.goods_sign){const r=await fetch(API+'/api/pdd/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goods_sign:item.goods_sign})}).then(x=>x.json()); url=r.mobile_short_url||r.short_url||r.mobile_url||r.url||r.material_url||url;}
      if(item.platform==='jd'){const sku=item.sku_id||item.skuId||item.goods_id||''; if(sku||url){const r=await fetch(API+'/api/jd/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku_id:sku,material_url:url,coupon_url:item.coupon_url||item.couponUrl||''})}).then(x=>x.json()); url=r.url||r.material_url||r.click_url||r.short_url||r.mobile_url||url;}}
      if(item.platform==='tb'&&!url)url='https://s.m.taobao.com/h5?q='+encodeURIComponent(item.goods_name||lastQuery||'商品');
      if(item.platform==='douyin'&&url){const r=await fetch(API+'/api/douyin/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_url:url,product_ext:item.product_ext||item.ext||''})}).then(x=>x.json()); url=r.url||r.dy_deeplink||r.dy_zlink||r.dy_sharelink||url;}
    }catch(e){console.warn('[v22] 转链失败，使用原始链接',e)}
    if(url)location.href=url; else alert('这个商品暂时没有可跳转购买链接。');
  }
  document.addEventListener('click',e=>{const btn=e.target.closest&&e.target.closest('[data-v22-buy]'); if(btn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openBuy(buyMap[btn.getAttribute('data-v22-buy')]);}},true);
  if(!document.getElementById('v22-style')){const s=document.createElement('style');s.id='v22-style';s.textContent='.v22-provider-grid{grid-template-columns:repeat(4,1fr)!important;margin-top:10px}.v22-best-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}@media(max-width:780px){.v22-provider-grid,.v22-best-grid{grid-template-columns:1fr!important}.candidate .row{display:block}.candidate .buy{width:100%;margin-top:8px}}';document.head.appendChild(s)}
  const oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__v22jd){
    const wrapped=function(data,q){const ret=oldRender.apply(this,arguments); setTimeout(()=>render(data,q),120); setTimeout(()=>render(data,q),700); return ret;};
    wrapped.__v22jd=true; window.renderAll=wrapped;
  }
  [200,900,1800,3500].forEach(ms=>setTimeout(()=>render(lastData,lastQuery),ms));
  console.log('[v22] 京东顾客端最终覆盖层已加载');
})();
