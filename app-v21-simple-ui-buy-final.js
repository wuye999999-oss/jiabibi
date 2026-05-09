// app-v21-simple-ui-buy-final.js: 最终简洁界面 + 淘宝/抖音购买兜底。
(function(){
  const API='https://jiabibi-api.onrender.com';
  let lastData=null,lastQuery='';
  const BUY_MAP={};
  const $=id=>document.getElementById(id);
  function txt(el){return String((el&&el.textContent)||'').replace(/\s+/g,' ').trim()}
  function q(){return (($('kw')&&$('kw').value)||lastQuery||'商品').trim()}
  function taobaoSearch(s){return 'https://s.m.taobao.com/h5?q='+encodeURIComponent(String(s||q()||'商品').trim())}
  function douyinSearch(s){return 'https://www.douyin.com/search/'+encodeURIComponent(String(s||q()||'商品').trim())}
  function normPlatform(p){p=String(p||'').toLowerCase(); if(['tb','taobao','tmall','淘宝','天猫'].includes(p))return'tb'; if(['douyin','dy','抖音'].includes(p))return'douyin'; return p;}
  function itemUrl(i){return i&&(i.direct_buy_url||i.material_url||i.url||i.item_url||i.product_url||i.detail_url||'')}
  function titleFromCard(btn){
    const card=btn&&btn.closest&&btn.closest('.card,.candidate,section,body');
    let s=txt(card)||q();
    s=s.replace(/官方\/自营最低价|官方\/自营|渠道店最低价|渠道店|普通店最低价|普通店|去购买|淘宝|拼多多|京东|抖音|暂无|未返回|未识别|待接入|接入中/g,' ')
      .replace(/¥\s*[-\d.]+|约\s*¥?[-\d.]+\/?[a-zA-Z\u4e00-\u9fa5]*/g,' ')
      .replace(/\s+/g,' ').trim();
    return s||q();
  }
  function remember(data,query){
    lastData=data||lastData; lastQuery=query||lastQuery||q();
    const list=(data&&data.goods_list)||[];
    list.forEach((item,i)=>{
      const key=item._key||('g'+i);
      BUY_MAP[key]=item;
      [item.goods_id,item.goods_sign,item.num_iid,item.product_id,item.sku_id].filter(Boolean).forEach(id=>BUY_MAP[String(item.platform||'')+':'+id]=item);
    });
    window.__jiabibiBuyMap=Object.assign(window.__jiabibiBuyMap||{},BUY_MAP);
  }
  async function openBuy(item,title){
    if(!item){ location.href=taobaoSearch(title); return true; }
    const p=normPlatform(item.platform);
    let url=itemUrl(item);
    if(p==='tb'){
      location.href=url||taobaoSearch(item.goods_name||title||q());
      return true;
    }
    if(p==='douyin'){
      try{
        if(url){
          const r=await fetch(API+'/api/douyin/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_url:url,product_ext:item.product_ext||item.ext||''})}).then(x=>x.json());
          url=r.url||r.dy_deeplink||r.dy_zlink||r.dy_sharelink||url;
        }
      }catch(e){console.warn('[v21] 抖音转链失败，使用兜底',e)}
      location.href=url||douyinSearch(item.goods_name||title||q());
      return true;
    }
    return false;
  }
  function keyFromBtn(btn){
    const direct=btn.getAttribute('data-stage18-buy')||btn.getAttribute('data-stage3-buy')||'';
    if(direct)return direct;
    const onclick=btn.getAttribute('onclick')||'';
    const m=onclick.match(/buyByKey\(['"]([^'"]+)['"]\)/);
    return m?m[1]:'';
  }
  function cardPlatform(btn){
    const card=btn&&btn.closest&&btn.closest('.card,.candidate,section,body');
    const t=txt(card);
    if(/淘宝|天猫/.test(t))return'tb';
    if(/抖音/.test(t))return'douyin';
    return'';
  }
  function forceBuyPatch(){
    const oldBuy=window.buyByKey;
    if(typeof oldBuy==='function'&&!oldBuy.__v21Final){
      const patched=function(key){
        const item=BUY_MAP[key]||(window.__jiabibiBuyMap&&window.__jiabibiBuyMap[key]);
        if(item&&['tb','douyin'].includes(normPlatform(item.platform))){openBuy(item,item.goods_name||q());return;}
        return oldBuy.apply(this,arguments);
      };
      patched.__v21Final=true;
      window.buyByKey=patched;
    }
  }
  function cleanUI(){
    const chips=$('chips'); if(chips){chips.innerHTML=''; chips.style.display='none';}
    const tabs=document.querySelector('.tabs'); if(tabs)tabs.style.display='none';
    ['panel-debug','panel-tests','testList'].forEach(id=>{const el=$(id); if(el)el.style.display='none';});
    const kw=$('kw'); if(kw)kw.placeholder='输入商品名或粘贴商品链接';
    const tag=document.querySelector('.tag'); if(tag)tag.textContent='价比比 · 真实比价';
    const sub=document.querySelector('.sub'); if(sub)sub.textContent='输入商品，自动比较不同平台的真实价格。';
    const status=$('status'); if(status&&/后端在线|准备好了|真实接口查询中/.test(status.textContent||''))status.style.display='none';
    document.querySelectorAll('.card.muted').forEach(card=>{
      const t=txt(card);
      if(/规则：|候选诊断|自动测试|当前意图|算法自检|原始候选|过滤样例/.test(t))card.style.display='none';
    });
    document.querySelectorAll('.empty,.muted').forEach(el=>{
      if(/待接入\/暂无|未返回\/未识别|该平台真实转链待接入/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/待接入\/暂无/g,'暂无').replace(/未返回\/未识别/g,'暂无').replace(/该平台真实转链待接入/g,'');
      }
    });
  }
  const oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__v21Final){
    const wrapped=function(data,query){
      remember(data,query);
      forceBuyPatch();
      const ret=oldRender.apply(this,arguments);
      setTimeout(()=>{remember(data,query);forceBuyPatch();cleanUI();},80);
      setTimeout(cleanUI,400);
      return ret;
    };
    wrapped.__v21Final=true;
    window.renderAll=wrapped;
  }
  const oldSearch=window.search;
  if(typeof oldSearch==='function'&&!oldSearch.__v21Final){
    const patchedSearch=function(v){lastQuery=(v||q()).trim(); return oldSearch.apply(this,arguments)};
    patchedSearch.__v21Final=true;
    window.search=patchedSearch;
  }
  document.addEventListener('click',function(e){
    const btn=e.target&&e.target.closest&&e.target.closest('button,.buy');
    if(!btn||!txt(btn).includes('去购买'))return;
    const key=keyFromBtn(btn);
    const item=key&&(BUY_MAP[key]||(window.__jiabibiBuyMap&&window.__jiabibiBuyMap[key]));
    const p=item?normPlatform(item.platform):cardPlatform(btn);
    if(p==='tb'||p==='douyin'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      openBuy(item,titleFromCard(btn));
    }
  },true);
  function injectStyle(){
    if($('v21-style'))return;
    const s=document.createElement('style'); s.id='v21-style';
    s.textContent=`
      .hero{padding:22px 0 12px!important}.logo{font-size:42px!important}.sub{font-size:14px!important;margin-top:6px!important}
      #chips,.tabs,#panel-debug,#panel-tests,#testList{display:none!important}
      #status{display:none!important}.app{padding-top:14px!important}.card{margin:10px 0!important;padding:16px!important}
      #providers{margin-top:4px!important}.tag{font-size:11px!important;padding:6px 10px!important}.search{margin-top:6px!important}
      .reason,#algo-selfcheck{display:none!important}
    `;
    document.head.appendChild(s);
  }
  injectStyle(); cleanUI(); forceBuyPatch();
  setInterval(()=>{forceBuyPatch();cleanUI();},1500);
  console.log('[v21] 简洁界面与淘宝/抖音购买最终兜底已加载');
})();
