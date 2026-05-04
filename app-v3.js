const API='https://jiabibi-api.onrender.com';
const platforms=[['pdd','拼多多'],['jd','京东'],['tb','淘宝'],['douyin','抖音']];
const groups=[['official','官方/自营最低价'],['channel','渠道店最低价'],['normal','普通店最低价']];
const hot=['酸奶','真零 酸奶','牛奶','百岁山','农夫山泉','无糖可口可乐','维达纸巾','蓝月亮洗衣液','小米充电宝 20000毫安','苹果15手机壳','https://mobile.yangkeduo.com/goods1.html?ps=lluJ0AAw8D'];
const official=['官方旗舰店','品牌旗舰店','旗舰店','官方店','京东自营','自营'];
const channel=['渠道','批发','厂家','工厂','源头','尾货','清仓','仓库','量贩','整箱批发','团购','商用','大包装','批发价'];
const cats={
  yogurt:['酸奶','低温酸奶','常温酸奶','风味发酵乳','发酵乳','乳酸菌','酸乳'],
  milk:['牛奶','纯牛奶','鲜牛奶','牛乳','蛋白牛乳'],
  water:['百岁山','农夫山泉','怡宝','矿泉水','纯净水','天然水','饮用水','矿物质水','水'],
  cola:['可口可乐','coca','cola','雪碧','芬达','百事','汽水','碳酸','可乐'],
  paper:['纸巾','抽纸','卷纸','面巾纸','卫生纸'],
  laundry:['洗衣液','洗衣凝珠','洗衣粉'],
  power:['充电宝','移动电源','毫安','mah'],
  case:['手机壳','保护壳','硅胶壳']
};
const brands={xiaomi:['小米','xiaomi','redmi','米家'],anker:['安克','anker'],ganten:['百岁山','ganten'],nongfu:['农夫山泉'],cestbon:['怡宝'],coke:['可口可乐','coca','cocacola'],sprite:['雪碧','sprite'],fanta:['芬达','fanta'],pepsi:['百事','pepsi'],vinda:['维达','vinda'],blue:['蓝月亮'],zhenling:['真零'],apple:['苹果','apple','iphone'],huawei:['华为','huawei']};
const mutuallyExclusiveBrandGroups=[['ganten','nongfu','cestbon'],['coke','sprite','fanta','pepsi'],['xiaomi','anker'],['apple','huawei','xiaomi']];
const attrs={noSugar:['无糖','零糖','0糖','零度','zero','无蔗糖','0蔗糖','0卡','零卡'],lactoseFree:['0乳糖','无乳糖','零乳糖']};
const hardEx=['刻字','激光','礼物','礼盒','摆件','挂件','钥匙扣','贴纸','海报','模型','手办','空瓶','收藏','周边','定制','抱枕','衣服','杯子','水杯','开瓶器','配件','适用','兼容'];
const models=['iphone15promax','iphone15pro','iphone15plus','iphone15','iphone14promax','iphone14pro','iphone14plus','iphone14','小米14ultra','小米14pro','小米14','华为mate60pro','华为mate60','华为pura70','华为p70'];
let goodsMap={};
let providerStatus=[];
let lastSearchProviders=[];
const $=id=>document.getElementById(id);
const yuan=n=>Number(n||0).toFixed(2).replace(/\.00$/,'');
const priceOf=i=>Number(i.coupon_price_yuan||i.min_group_price_yuan||999999);
const tx=i=>`${i.goods_name||''} ${i.goods_desc||''} ${i.brand_name||''} ${i.shop_name||''} ${(i.unified_tags||[]).join(' ')}`;
const norm=s=>String(s||'').toLowerCase().replace(/[\s\-_【】\[\]（）()，,。.!！:：/\\]+/g,'');
const has=(s,arr)=>arr.some(x=>norm(typeof s==='string'?s:tx(s)).includes(norm(x)));

function intent(q){
  const n=norm(q); let cat='';
  for(const k of Object.keys(cats)){ if(cats[k].some(x=>n.includes(norm(x)))){cat=k;break;} }
  if(cat==='water' && ['可乐','雪碧','芬达','汽水','碳酸'].some(x=>n.includes(norm(x)))) cat='cola';
  let bs=[]; for(const k of Object.keys(brands)){ if(brands[k].some(x=>n.includes(norm(x)))) bs.push(k); }
  let at=[]; for(const k of Object.keys(attrs)){ if(attrs[k].some(x=>n.includes(norm(x)))) at.push(k); }
  return {cat,brands:bs,attrs:at,cap:(n.match(/(\d{4,6})(mah|毫安)/)||[])[1]||'',model:models.find(m=>n.includes(norm(m)))||'',tokens:String(q).split(/[\s\u3000]+/).map(x=>x.trim()).filter(Boolean)};
}
function brandsInText(i){return Object.keys(brands).filter(k=>has(i,brands[k]));}
function typeOf(i){const t=tx(i); if(has(t,official))return'official'; if(has(t,channel))return'channel'; return'normal';}
function itemCap(i){const m=norm(tx(i)).match(/(\d{4,6})(mah|毫安)/); return m?Number(m[1]):0;}
function itemModel(i){const n=norm(tx(i)); return models.find(m=>n.includes(norm(m)))||'';}
function toMl(v,u){return String(u).toLowerCase()==='l'?v*1000:v;}
function toKg(v,u){if(u==='斤')return v*0.5; if(['g','G'].includes(u))return v/1000; return v;}
function cleanSpecText(i){return tx(i).replace(/[×ＸxX]/g,'*').replace(/毫升/g,'ml').replace(/升/g,'L').replace(/公斤/g,'kg').replace(/千克/g,'kg').replace(/克/g,'g').replace(/\s+/g,' ');}
function parseSpec(i,q=''){
  const t=cleanSpecText(i); const p=priceOf(i); const it=intent(q); let m;
  m=t.match(/(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L)\s*[*]\s*(\d+)\s*(瓶|罐|听|盒|杯|支|袋)?/);
  if(m){const ml=toMl(Number(m[1]),m[2]), c=Number(m[3]); return volumeSpec(ml,c,m[4]||'件',p,it);}
  m=t.match(/(\d+)\s*(瓶|罐|听|盒|杯|支|袋).{0,12}?(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L)/);
  if(m){const c=Number(m[1]), ml=toMl(Number(m[3]),m[4]); return volumeSpec(ml,c,m[2],p,it);}
  m=t.match(/(\d+)\s*[*]\s*(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L)/);
  if(m){const c=Number(m[1]), ml=toMl(Number(m[2]),m[3]); return volumeSpec(ml,c,'件',p,it);}
  m=t.match(/(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L)/);
  if(m){const ml=toMl(Number(m[1]),m[2]); const cm=t.match(/(\d+)\s*(瓶|罐|听|盒|杯|支|袋|箱|整箱)/); const c=cm?Number(cm[1]):1; return volumeSpec(ml,c,cm?cm[2]:'件',p,it);}
  m=t.match(/(\d+(?:\.\d+)?)\s*(kg|KG|斤|g|G)\s*[*]?\s*(\d+)?\s*(桶|瓶|袋|盒|包)?/);
  if(m){let kg=toKg(Number(m[1]),m[2])*Number(m[3]||1); return {kind:'weight',text:`${yuan(kg)}kg ｜ 约 ¥${yuan(p/kg)}/kg`,value:p/kg};}
  m=t.match(/(\d+)\s*(抽|张)\s*[*]\s*(\d+)\s*(包|提|箱|组)?/);
  if(m){const total=Number(m[1])*Number(m[3]); return {kind:'paper',text:`${total}抽/张 ｜ 约 ¥${yuan(p/(total/100))}/100抽`,value:p/(total/100)};}
  m=t.match(/(\d+)\s*(包|提|箱).{0,12}?(\d+)\s*(抽|张)/);
  if(m){const total=Number(m[1])*Number(m[3]); return {kind:'paper',text:`${total}抽/张 ｜ 约 ¥${yuan(p/(total/100))}/100抽`,value:p/(total/100)};}
  m=norm(t).match(/(\d{4,6})(mah|毫安)/);
  if(m){const cap=Number(m[1]); return {kind:'power',text:`${cap}mAh ｜ 约 ¥${yuan(p/(cap/10000))}/万mAh`,value:p/(cap/10000)};}
  return {kind:'none',text:'',value:p};
}
function volumeSpec(ml,count,container,price,it){
  const totalMl=ml*count; const per100=price/(totalMl/100); const perL=price/(totalMl/1000);
  if(['yogurt','milk','laundry'].includes(it.cat)) return {kind:'volume',text:`${ml}ml × ${count}${container} ｜ 约 ¥${yuan(perL)}/L`,value:perL};
  return {kind:'volume',text:`${ml}ml × ${count}${container} ｜ 约 ¥${yuan(per100)}/100ml`,value:per100};
}
function spec(i,q){return parseSpec(i,q).text;}
function valueOf(i,q){return parseSpec(i,q).value||priceOf(i);}

function diagnose(i,q){
  if(String(i.source||'').includes('scrape')) return {keep:true,reasons:['页面抓取结果，优先保留']};
  const it=intent(q), t=tx(i), n=norm(t), r=[];
  for(const x of hardEx){ if(n.includes(norm(x))) r.push('硬排除词：'+x); }
  if(it.brands.length && !it.brands.some(k=>has(t,brands[k]))) r.push('品牌不符：需要 '+it.brands.join('/'));
  for(const group of mutuallyExclusiveBrandGroups){ const wanted=it.brands.filter(k=>group.includes(k)); if(wanted.length){ const present=brandsInText(i).filter(k=>group.includes(k)); const wrong=present.filter(k=>!wanted.includes(k)); if(wrong.length) r.push('互斥品牌混入：'+wrong.join('/')); } }
  if(it.cat==='yogurt'&&!has(t,cats.yogurt)) r.push('品类不符：需要酸奶/发酵乳');
  if(it.cat==='milk'&&(!has(t,cats.milk)||has(t,cats.yogurt))) r.push('品类不符：需要牛奶且不能是酸奶');
  if(it.cat==='water'&&!has(t,cats.water)) r.push('品类不符：需要饮用水/矿泉水');
  if(it.cat==='cola'&&!has(t,cats.cola)) r.push('品类不符：需要可乐/汽水');
  if(it.cat==='paper'&&!has(t,cats.paper)) r.push('品类不符：需要纸巾');
  if(it.cat==='laundry'&&!has(t,cats.laundry)) r.push('品类不符：需要洗衣液/凝珠/洗衣粉');
  if(it.cat==='power'&&!has(t,cats.power)) r.push('品类不符：需要充电宝/移动电源');
  if(it.cat==='case'&&!has(t,cats.case)) r.push('品类不符：需要手机壳');
  for(const k of it.attrs){ if(!has(t,attrs[k])) r.push('属性不符：需要 '+k); }
  if(it.cap){const c=itemCap(i); if(!c) r.push('容量缺失'); else if(Math.abs(c-Number(it.cap))>1000) r.push('容量不符：需要 '+it.cap+'，商品 '+c);}
  if(it.model){const m=itemModel(i); if(!m) r.push('机型缺失：需要 '+it.model); else if(m!==it.model) r.push('机型不符：需要 '+it.model+'，商品 '+m);}
  const sp=parseSpec(i,q); if(['water','cola','yogurt','milk','paper','laundry','power'].includes(it.cat)&&sp.kind==='none') r.push('规格缺失：无法计算单位价');
  if(!it.cat&&!it.brands.length&&it.tokens.length>1){const nt=norm(t), miss=it.tokens.filter(x=>!nt.includes(norm(x))); if(miss.length) r.push('关键词缺失：'+miss.join('/'));}
  return {keep:r.length===0,reasons:r.length?r:['通过过滤']};
}
const relevant=(i,q)=>diagnose(i,q).keep;
function best(list,type,p,q){return list.filter(x=>x.platform===p&&typeOf(x)===type&&relevant(x,q)).sort((a,b)=>valueOf(a,q)-valueOf(b,q)||priceOf(a)-priceOf(b))[0];}
function bestAll(list,type,q){return platforms.map(([p])=>best(list,type,p,q)).filter(Boolean).sort((a,b)=>valueOf(a,q)-valueOf(b,q)||priceOf(a)-priceOf(b))[0];}

async function loadProviderStatus(){
  try{const r=await fetch(API+'/api/providers/status'); const d=await r.json(); providerStatus=d.providers||[];}catch(e){providerStatus=[];}
}
function providerMeta(p){return providerStatus.find(x=>x.platform===p)||{};}
function renderProviders(data={}){
  const box=$('providers'); box.innerHTML=''; lastSearchProviders=data.providers||lastSearchProviders||[];
  for(const [p,name] of platforms){
    const meta=providerMeta(p), st=(lastSearchProviders||[]).find(x=>x.platform===p);
    let cls=meta.configured?'ok':'warn'; let txt=meta.configured?'已配置':'待接入';
    if(meta.search===false) txt='待接入';
    if(st){ if(st.error){cls='bad';txt='失败'} else if(st.ok&&st.source!=='provider_placeholder'){cls='ok';txt=(st.source||'真实接口')+' · '+(st.total_count||0)} else if(st.message) txt=st.message; }
    box.insertAdjacentHTML('beforeend',`<div class="box"><b>${name}</b><div class="pill ${cls}">${txt}</div><div class="empty">${meta.source||''}</div></div>`);
  }
}
function buyButton(item){return item?`<button class="buy" type="button" onclick="buyByKey('${item._key}')">去购买</button>`:'';}
function renderResult(data,q){
  renderProviders(data); const list=(data.goods_list||[]).filter(x=>relevant(x,q)); const r=$('panel-result'); r.innerHTML='';
  if(!list.length){r.innerHTML='<div class="card muted">没有可靠匹配。为了避免错品，已过滤掉不满足品牌、品类、强属性或规格的结果。</div>';return;}
  for(const [type,title] of groups){const item=bestAll(list,type,q); let html='<div class="card"><div class="row"><div><div class="muted">'+title+'</div>';
    if(item){const pf=platforms.find(x=>x[0]===item.platform)?.[1]||item.platform; html+='<div class="price">¥'+yuan(priceOf(item))+'</div><div class="muted">'+pf+' · '+(item.shop_name||item.brand_name||'')+'<br>'+item.goods_name+'</div>'; const sp=spec(item,q); if(sp)html+='<div class="spec">'+sp+'</div>';} else html+='<div class="price">¥--</div><div class="muted">未返回该类型商品。</div>';
    html+='</div>'+buyButton(item)+'</div><div class="grid">'; for(const [p,name] of platforms){const x=best(list,type,p,q); html+='<div class="p"><div class="muted">'+name+'</div>'+(x?'<b>¥'+yuan(priceOf(x))+'</b><div class="empty">'+(spec(x,q).split('｜').pop()||'')+'</div>':'<div class="empty">待接入/暂无</div>')+'</div>'; } html+='</div></div>'; r.insertAdjacentHTML('beforeend',html);
  }
}
function renderDebug(data,q){
  const rows=(data.goods_list||[]).map(i=>({i,d:diagnose(i,q)})); const keep=rows.filter(x=>x.d.keep).length; const box=$('panel-debug');
  box.innerHTML=`<div class="card muted">接口候选 ${rows.length} 条；保留 ${keep} 条；过滤 ${rows.length-keep} 条。<br>当前意图：${JSON.stringify(intent(q))}</div>`;
  rows.forEach((r,idx)=>{const i=r.i,d=r.d,pf=(platforms.find(x=>x[0]===i.platform)||[])[1]||i.platform; box.insertAdjacentHTML('beforeend',`<div class="card candidate"><div class="row"><div><span class="pill ${d.keep?'ok':'bad'}">${d.keep?'保留':'过滤'}</span><span class="pill">#${idx+1}</span><span class="pill">${pf}</span><span class="pill">${i.source||''}</span></div><div>${buyButton(i)}</div></div><div class="price">¥${yuan(priceOf(i))}</div><b>${i.goods_name||''}</b><div class="muted">店铺：${i.shop_name||i.brand_name||'未知'}</div>${spec(i,q)?'<div class="spec">'+spec(i,q)+'</div>':''}<div class="reason">${d.reasons.join('；')}</div></div>`);});
}
function renderAll(data,q){goodsMap={}; (data.goods_list||[]).forEach((x,i)=>{x._key='g'+i; goodsMap[x._key]=x;}); renderResult(data,q); renderDebug(data,q);}
async function search(v){
  const kw=(v||$('kw').value||'').trim(); if(!kw)return; $('kw').value=kw; $('status').textContent='真实接口查询中...'; $('panel-result').innerHTML='<div class="card muted">加载中...</div>';
  try{const res=await fetch(API+'/api/search?platform=all&page_size=50&sandbox=1&keyword='+encodeURIComponent(kw)); const data=await res.json(); lastSearchProviders=data.providers||[]; $('status').textContent='返回：'+(data.keyword||kw)+'，候选 '+(data.total_count||0)+' 条'; renderAll(data,data.keyword||kw);}catch(e){$('status').textContent='查询失败'; $('panel-result').innerHTML='<div class="card muted">'+e.message+'</div>';}
}
async function buyByKey(key){
  const item=goodsMap[key]; if(!item)return; try{$('status').textContent='正在生成购买链接...'; if(item.platform==='pdd'&&!item.goods_sign&&item.material_url){location.href=item.material_url;return;} let endpoint='',body={}; if(item.platform==='pdd'){endpoint='/api/pdd/link';body={goods_sign:item.goods_sign};}else if(item.platform==='jd'){endpoint='/api/jd/link';body={sku_id:item.sku_id,material_url:item.material_url,coupon_url:item.coupon_url};}else{$('status').textContent='该平台真实转链待接入';return;} if(item.platform==='pdd'&&!item.goods_sign){$('status').textContent='该拼多多商品缺少 goods_sign，暂不能生成推广链接';return;} const r=await fetch(API+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok||d.error||d.error_response)throw new Error(d.message||d.error_response?.sub_msg||d.error||'生成失败'); const link=d.mobile_short_url||d.short_url||d.mobile_url||d.click_url||d.url||d.schema_url; if(link)location.href=link; else $('status').textContent='没有返回购买链接';}catch(e){$('status').textContent='生成失败：'+e.message;}
}
function switchTab(tab){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.dataset.tab===tab)); ['result','debug','tests'].forEach(t=>$('panel-'+t).classList.toggle('hide',t!==tab));}
const tests=[['酸奶不混牛奶','酸奶',i=>has(i,cats.yogurt)&&!has(i,['纯牛奶','鲜牛奶'])],['牛奶不混酸奶','牛奶',i=>has(i,cats.milk)&&!has(i,cats.yogurt)],['百岁山品牌','百岁山',i=>has(i,brands.ganten)],['无糖可口可乐','无糖可口可乐',i=>has(i,brands.coke)&&has(i,attrs.noSugar)],['维达纸巾','维达纸巾',i=>has(i,brands.vinda)&&has(i,cats.paper)],['小米充电宝','小米充电宝 20000毫安',i=>has(i,brands.xiaomi)&&has(i,cats.power)&&itemCap(i)&&Math.abs(itemCap(i)-20000)<=1000],['拼多多ps链接','https://mobile.yangkeduo.com/goods1.html?ps=lluJ0AAw8D',i=>i.platform==='pdd']];
async function runTests(){const out=$('testList'); out.innerHTML=''; let pass=0,warn=0,fail=0; for(const [name,q,check]of tests){out.insertAdjacentHTML('beforeend',`<div class="card"><b>${name}</b><div class="muted">运行中...</div></div>`); const el=out.lastElementChild; try{const r=await fetch(API+'/api/search?platform=all&page_size=50&sandbox=1&keyword='+encodeURIComponent(q)); const d=await r.json(); const list=d.goods_list||[], good=list.filter(check); let cls='ok',label='通过',msg='满足候选 '+good.length+' / 原始 '+list.length; if(!list.length){cls='warn';label='警告';msg='接口没有返回候选';warn++;}else if(!good.length){cls='bad';label='失败';msg='没有候选满足约束';fail++;}else pass++; el.innerHTML=`<div class="row"><div><b>${name}</b><div class="muted">${q}</div></div><span class="pill ${cls}">${label}</span></div><div class="reason">${msg}</div>`;}catch(e){fail++; el.innerHTML=`<b>${name}</b><span class="pill bad">失败</span><div class="reason">${e.message}</div>`;}} $('testSummary').innerHTML=`测试完成：通过 ${pass}，警告 ${warn}，失败 ${fail}`;}
async function health(){try{const r=await fetch(API+'/health'); const d=await r.json(); $('status').textContent='后端在线：'+(d.name||'API')+(d.jd_link?' · JD转链 '+d.jd_link:'');}catch(e){$('status').textContent='后端健康检查失败';}}
function init(){document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab)); $('form').onsubmit=e=>{e.preventDefault();search();}; hot.forEach(w=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=w.length>22?w.slice(0,22)+'…':w;b.onclick=()=>search(w);$('chips').appendChild(b);}); $('runTests').onclick=runTests; loadProviderStatus().then(()=>{renderProviders({providers:[]}); return health();}).then(()=>search('酸奶'));}
init();
