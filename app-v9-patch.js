// app-v9-patch.js: platform filters, strict/balanced comparison, top kept summary
(function(){
  const PLATFORM_KEY='jiabibi_platform_filter_v1';
  let lastData=null;
  let lastQuery='';
  const $=id=>document.getElementById(id);
  const platformNames={pdd:'拼多多',jd:'京东',tb:'淘宝',douyin:'抖音'};
  const platforms=['pdd','jd','tb','douyin'];
  const yuan=n=>Number(n||0).toFixed(2).replace(/\.00$/,'');
  const priceOf=i=>Number(i.coupon_price_yuan||i.min_group_price_yuan||999999);
  const readFilter=()=>{try{return JSON.parse(localStorage.getItem(PLATFORM_KEY)||'null')||platforms}catch(e){return platforms}};
  const saveFilter=arr=>localStorage.setItem(PLATFORM_KEY,JSON.stringify(arr));
  const pName=p=>platformNames[p]||p||'未知';

  function ensureV9Tools(){
    if($('v9-tools'))return;
    const anchor=$('v8-tools')||$('v7-mode')||$('v6-tools')||document.querySelector('.tabs');
    if(!anchor)return;
    const card=document.createElement('div');
    card.id='v9-tools';
    card.className='card';
    card.innerHTML=`
      <div class="row">
        <div>
          <b>平台筛选与模式对比</b>
          <div class="muted">不重新请求 API，直接用当前候选重算，方便判断平台缺数据还是过滤太严。</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button type="button" id="rerenderCurrent">重算当前结果</button>
          <button type="button" id="compareModes">严格/均衡对比</button>
          <button type="button" id="copyKeptSummary">复制保留摘要</button>
          <button type="button" id="showTopKept">Top候选</button>
        </div>
      </div>
      <div id="platformToggles" class="chips" style="padding-bottom:0"></div>
      <div id="v9Box" class="reason" style="margin-top:10px">等待搜索结果。</div>
    `;
    anchor.insertAdjacentElement('afterend',card);
    $('rerenderCurrent').onclick=rerenderCurrent;
    $('compareModes').onclick=compareModes;
    $('copyKeptSummary').onclick=copyKeptSummary;
    $('showTopKept').onclick=showTopKept;
    renderPlatformToggles();
  }

  function renderPlatformToggles(){
    const box=$('platformToggles'); if(!box)return;
    const enabled=readFilter(); box.innerHTML='';
    for(const p of platforms){
      const b=document.createElement('button');
      b.type='button'; b.className='chip';
      b.textContent=(enabled.includes(p)?'✅ ':'⬜ ')+pName(p);
      b.onclick=()=>{
        let arr=readFilter();
        if(arr.includes(p)) arr=arr.filter(x=>x!==p); else arr.push(p);
        if(!arr.length) arr=[p];
        saveFilter(arr); renderPlatformToggles(); rerenderCurrent();
      };
      box.appendChild(b);
    }
    const all=document.createElement('button'); all.type='button'; all.className='chip'; all.textContent='全选'; all.onclick=()=>{saveFilter(platforms);renderPlatformToggles();rerenderCurrent();}; box.appendChild(all);
  }

  function filteredData(data){
    const enabled=readFilter();
    if(!data)return data;
    return {...data, goods_list:(data.goods_list||[]).filter(x=>enabled.includes(x.platform)), providers:(data.providers||[]).filter(x=>enabled.includes(x.platform))};
  }

  function classify(data,q){
    const list=(data?.goods_list||[]);
    const kept=[], dropped=[];
    for(const item of list){
      let d={keep:true,reasons:['未诊断']};
      try{d=diagnose(item,q)}catch(e){d={keep:false,reasons:['诊断异常：'+e.message]};}
      (d.keep?kept:dropped).push({item,d});
    }
    return {kept,dropped,all:list};
  }

  function setModeTemp(mode,fn){
    const key='jiabibi_filter_mode_v1';
    const old=localStorage.getItem(key);
    localStorage.setItem(key,mode);
    try{return fn();}
    finally{ if(old===null)localStorage.removeItem(key); else localStorage.setItem(key,old); }
  }

  function rerenderCurrent(){
    if(!lastData){setBox('暂无搜索结果。');return;}
    renderAll(filteredData(lastData),lastQuery);
    renderPlatformToggles();
    setBox('已按平台筛选重算当前结果：'+readFilter().map(pName).join('、'));
  }

  function compareModes(){
    if(!lastData){setBox('暂无搜索结果。');return;}
    const data=filteredData(lastData);
    const strict=setModeTemp('strict',()=>classify(data,lastQuery));
    const balanced=setModeTemp('balanced',()=>classify(data,lastQuery));
    const rescued=balanced.kept.filter(b=>!strict.kept.some(s=>sameItem(s.item,b.item)));
    const byPlatform={};
    for(const x of rescued){const p=x.item.platform||'unknown'; byPlatform[p]=(byPlatform[p]||0)+1;}
    setBox(`严格模式：保留 ${strict.kept.length} / 原始 ${strict.all.length}\n均衡模式：保留 ${balanced.kept.length} / 原始 ${balanced.all.length}\n均衡多保留：${rescued.length}\n多保留平台：${Object.entries(byPlatform).map(([p,c])=>pName(p)+' '+c).join(' ｜ ')||'无'}\n判断：如果均衡多保留很多，说明主要是规格缺失/接口字段不全；如果仍然很少，说明平台接口本身没返回或品牌品类不匹配。`);
  }

  function sameItem(a,b){
    return String(a.goods_sign||a.sku_id||a.goods_id||a.material_url||a.goods_name)===String(b.goods_sign||b.sku_id||b.goods_id||b.material_url||b.goods_name);
  }

  function topKept(limit=12){
    if(!lastData)return [];
    const c=classify(filteredData(lastData),lastQuery);
    return c.kept.sort((a,b)=>safeValue(a.item)-safeValue(b.item)||priceOf(a.item)-priceOf(b.item)).slice(0,limit);
  }

  function safeValue(item){try{return valueOf(item,lastQuery)||priceOf(item)}catch(e){return priceOf(item)}}
  function safeSpec(item){try{return spec(item,lastQuery)||''}catch(e){return''}}
  function safeType(item){try{return typeOf(item)||''}catch(e){return''}}

  function showTopKept(){
    const arr=topKept(15);
    if(!arr.length){setBox('暂无保留候选。');return;}
    const lines=arr.map((x,i)=>`${i+1}. ${pName(x.item.platform)}｜${safeType(x.item)}｜¥${yuan(priceOf(x.item))}｜${safeSpec(x.item)}｜${x.item.goods_name||''}`);
    setBox('Top 保留候选（按单位价/总价）\n'+lines.join('\n'));
  }

  async function copyKeptSummary(){
    const arr=topKept(20);
    if(!arr.length){setBox('暂无保留候选可复制。');return;}
    const text=`价比比保留候选摘要\n搜索：${lastQuery}\n平台筛选：${readFilter().map(pName).join('、')}\n链接：${location.href}\n\n`+arr.map((x,i)=>`${i+1}. ${pName(x.item.platform)}｜${safeType(x.item)}｜¥${yuan(priceOf(x.item))}｜${safeSpec(x.item)}｜${x.item.shop_name||x.item.brand_name||''}\n${x.item.goods_name||''}`).join('\n\n');
    try{await navigator.clipboard.writeText(text); setBox('已复制保留商品摘要。');}
    catch(e){setBox('复制失败：'+e.message+'\n\n'+text);}
  }

  function setBox(txt){const box=$('v9Box'); if(box)box.textContent=txt;}

  const oldRenderAll=window.renderAll;
  window.renderAll=function(data,q){
    lastData=data; lastQuery=q||lastQuery||($('kw')&&$('kw').value)||'';
    const ret=oldRenderAll(data,q);
    if($('v9Box')){
      const c=classify(filteredData(data),lastQuery);
      setBox(`当前平台筛选：${readFilter().map(pName).join('、')}\n筛选后原始：${c.all.length}｜保留：${c.kept.length}｜过滤：${c.dropped.length}`);
    }
    return ret;
  };

  const oldSearch=window.search;
  window.search=async function(v){lastQuery=(v||($('kw')&&$('kw').value)||'').trim(); return oldSearch(v);};

  setTimeout(()=>{ensureV9Tools();},0);
})();
