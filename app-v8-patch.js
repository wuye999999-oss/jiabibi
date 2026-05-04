// app-v8-patch.js: export tools, coverage stats, kept/dropped candidate views
(function(){
  let lastData=null;
  let lastQuery='';
  const $=id=>document.getElementById(id);
  const yuan=n=>Number(n||0).toFixed(2).replace(/\.00$/,'');
  const priceOf=i=>Number(i.coupon_price_yuan||i.min_group_price_yuan||999999);
  const platformName=p=>({pdd:'拼多多',jd:'京东',tb:'淘宝',douyin:'抖音',local:'本地'}[p]||p||'未知');
  const escapeCsv=s=>'"'+String(s??'').replace(/"/g,'""').replace(/\n/g,' ')+'"';
  const download=(name,content,type='text/plain')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};

  function classify(data,q){
    const all=data?.goods_list||[];
    const kept=[]; const dropped=[];
    for(const item of all){
      let d={keep:true,reasons:['未诊断']};
      try{d=diagnose(item,q)}catch(e){d={keep:false,reasons:['诊断异常：'+e.message]};}
      (d.keep?kept:dropped).push({item,d});
    }
    return {all,kept,dropped};
  }

  function ensureV8Tools(){
    if($('v8-tools'))return;
    const anchor=$('v7-mode')||$('v6-tools')||document.querySelector('.tabs');
    if(!anchor)return;
    const card=document.createElement('div');
    card.id='v8-tools';
    card.className='card';
    card.innerHTML=`
      <div class="row">
        <div>
          <b>结果导出与覆盖率</b>
          <div class="muted">用于把问题一次性发出来：分享链接、候选 JSON/CSV、保留/过滤清单。</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button type="button" id="copyShareLink">复制链接</button>
          <button type="button" id="exportJson">导出JSON</button>
          <button type="button" id="exportCsv">导出CSV</button>
          <button type="button" id="showKept">保留清单</button>
          <button type="button" id="showDropped">过滤清单</button>
        </div>
      </div>
      <div id="v8Stats" class="reason" style="margin-top:10px">等待搜索结果。</div>
      <div id="v8List"></div>
    `;
    anchor.insertAdjacentElement('afterend',card);
    $('copyShareLink').onclick=copyShareLink;
    $('exportJson').onclick=exportJson;
    $('exportCsv').onclick=exportCsv;
    $('showKept').onclick=()=>renderCandidateList('kept');
    $('showDropped').onclick=()=>renderCandidateList('dropped');
  }

  function renderV8Stats(data,q){
    const box=$('v8Stats'); if(!box)return;
    if(!data){box.textContent='等待搜索结果。';return;}
    const {all,kept,dropped}=classify(data,q);
    const byPlatform={};
    for(const x of all){byPlatform[x.platform]=(byPlatform[x.platform]||0)+1;}
    const keptPrices=kept.map(x=>priceOf(x.item)).filter(x=>isFinite(x)&&x<999999).sort((a,b)=>a-b);
    const priceLine=keptPrices.length?`价格区间：¥${yuan(keptPrices[0])} - ¥${yuan(keptPrices[keptPrices.length-1])}`:'价格区间：暂无保留商品';
    const platformLine=Object.entries(byPlatform).map(([p,c])=>`${platformName(p)} ${c}`).join(' ｜ ')||'无平台返回';
    let typeCounts={official:0,channel:0,normal:0};
    for(const x of kept){try{typeCounts[typeOf(x.item)]++}catch(e){}}
    box.textContent=`搜索：${q}\n原始候选：${all.length} ｜ 保留：${kept.length} ｜ 过滤：${dropped.length}\n平台覆盖：${platformLine}\n三类覆盖：官方/自营 ${typeCounts.official} ｜ 渠道 ${typeCounts.channel} ｜ 普通 ${typeCounts.normal}\n${priceLine}`;
  }

  function renderCandidateList(kind){
    const box=$('v8List'); if(!box)return;
    if(!lastData){box.innerHTML='<div class="reason">暂无搜索结果。</div>';return;}
    const q=lastQuery||($('kw')&&$('kw').value)||'';
    const c=classify(lastData,q);
    const arr=kind==='kept'?c.kept:c.dropped;
    const title=kind==='kept'?'保留商品清单':'过滤商品清单';
    if(!arr.length){box.innerHTML=`<div class="reason">${title}为空。</div>`;return;}
    let html=`<div class="reason" style="margin-top:10px"><b>${title}（前 ${Math.min(20,arr.length)} 条）</b></div>`;
    arr.slice(0,20).forEach((x,idx)=>{
      const i=x.item;
      let sp=''; try{sp=spec(i,q)}catch(e){}
      html+=`<div class="card candidate"><div class="row"><div><span class="pill ${kind==='kept'?'ok':'bad'}">${kind==='kept'?'保留':'过滤'}</span><span class="pill">#${idx+1}</span><span class="pill">${platformName(i.platform)}</span></div><div class="price">¥${yuan(priceOf(i))}</div></div><b>${i.goods_name||''}</b><div class="muted">${i.shop_name||i.brand_name||'未知店铺'} ｜ ${i.source||''}</div>${sp?`<div class="spec">${sp}</div>`:''}<div class="reason">${(x.d.reasons||[]).join('；')}</div></div>`;
    });
    box.innerHTML=html;
  }

  async function copyShareLink(){
    try{await navigator.clipboard.writeText(location.href); if($('status'))$('status').textContent='已复制当前搜索链接。';}
    catch(e){if($('status'))$('status').textContent='复制链接失败：'+e.message;}
  }

  function exportJson(){
    if(!lastData){if($('status'))$('status').textContent='暂无结果可导出';return;}
    const q=lastQuery||($('kw')&&$('kw').value)||'';
    const c=classify(lastData,q);
    const payload={time:new Date().toISOString(),query:q,url:location.href,summary:{raw:c.all.length,kept:c.kept.length,dropped:c.dropped.length},providers:lastData.providers||[],goods:lastData.goods_list||[]};
    download('jiabibi-diagnostic-'+Date.now()+'.json',JSON.stringify(payload,null,2),'application/json');
  }

  function exportCsv(){
    if(!lastData){if($('status'))$('status').textContent='暂无结果可导出';return;}
    const q=lastQuery||($('kw')&&$('kw').value)||'';
    const rows=[['keep','platform','type','price','unit_spec','name','shop','source','reason']];
    for(const x of classify(lastData,q).kept.concat(classify(lastData,q).dropped)){
      const i=x.item;
      let tp='',sp=''; try{tp=typeOf(i)}catch(e){} try{sp=spec(i,q)}catch(e){}
      rows.push([x.d.keep?'1':'0',platformName(i.platform),tp,priceOf(i),sp,i.goods_name||'',i.shop_name||i.brand_name||'',i.source||'',(x.d.reasons||[]).join('；')]);
    }
    download('jiabibi-candidates-'+Date.now()+'.csv',rows.map(r=>r.map(escapeCsv).join(',')).join('\n'),'text/csv;charset=utf-8');
  }

  const oldRenderAll=window.renderAll;
  window.renderAll=function(data,q){
    lastData=data; lastQuery=q||lastQuery;
    const ret=oldRenderAll(data,q);
    renderV8Stats(data,q);
    return ret;
  };

  const oldSearch=window.search;
  window.search=async function(v){
    lastQuery=(v||($('kw')&&$('kw').value)||'').trim();
    return oldSearch(v);
  };

  const oldRunTests=window.runTests;
  window.runTests=async function(){
    if(oldRunTests) await oldRunTests();
    if($('testSummary'))$('testSummary').innerHTML += '<br>v8：测试完成后可用“复制诊断/导出JSON/导出CSV”发送完整问题现场。';
  };

  setTimeout(()=>{ensureV8Tools(); const btn=$('runTests'); if(btn)btn.onclick=window.runTests;},0);
})();
