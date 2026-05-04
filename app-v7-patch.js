// app-v7-patch.js: strictness toggle + local spec parser tests
(function(){
  const MODE_KEY='jiabibi_filter_mode_v1';
  const getMode=()=>localStorage.getItem(MODE_KEY)||'strict';
  const setMode=m=>{localStorage.setItem(MODE_KEY,m); renderModeUI(); if(document.getElementById('kw')) window.search(document.getElementById('kw').value);};
  const oldDiagnose=window.diagnose;
  const oldSummary=window.summaryCard;
  const oldRunTests=window.runTests;

  function ensureModeUI(){
    if(document.getElementById('v7-mode'))return;
    const tools=document.getElementById('v6-tools')||document.querySelector('.tabs');
    if(!tools)return;
    const card=document.createElement('div');
    card.id='v7-mode';
    card.className='card';
    card.innerHTML=`
      <div class="row">
        <div>
          <b>过滤模式</b>
          <div class="muted">严格模式用于正式体验；均衡模式用于排查是否过滤过重。</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button type="button" id="modeStrict">严格</button>
          <button type="button" id="modeBalanced">均衡排查</button>
          <button type="button" id="runSpecTests">规格自测</button>
        </div>
      </div>
      <div id="modeHint" class="muted" style="margin-top:8px"></div>
      <div id="specTestBox"></div>
    `;
    tools.insertAdjacentElement('afterend',card);
    document.getElementById('modeStrict').onclick=()=>setMode('strict');
    document.getElementById('modeBalanced').onclick=()=>setMode('balanced');
    document.getElementById('runSpecTests').onclick=runSpecParserTests;
    renderModeUI();
  }

  function renderModeUI(){
    const mode=getMode();
    const hint=document.getElementById('modeHint');
    const s=document.getElementById('modeStrict');
    const b=document.getElementById('modeBalanced');
    if(s){s.style.background=mode==='strict'?'#111':'#fff';s.style.color=mode==='strict'?'#fff':'#111';}
    if(b){b.style.background=mode==='balanced'?'#111':'#fff';b.style.color=mode==='balanced'?'#fff':'#111';}
    if(hint)hint.textContent=mode==='strict'?'当前：严格过滤。缺规格、品牌不符、强属性不符会过滤。':'当前：均衡排查。部分“规格缺失”只降权提示，不直接过滤，用于排查接口返回质量。';
  }

  window.diagnose=function(i,q){
    const d=oldDiagnose(i,q);
    if(getMode()==='balanced' && d && !d.keep){
      const hard=d.reasons.filter(r=>!String(r).startsWith('规格缺失'));
      if(hard.length!==d.reasons.length && hard.length===0){
        return {keep:true,reasons:['均衡模式保留：原因为规格缺失，待人工确认单位价']};
      }
    }
    return d;
  };

  window.summaryCard=function(data,q){
    const base=oldSummary?oldSummary(data,q):'';
    const mode=getMode()==='strict'?'严格过滤':'均衡排查';
    return base.replace('</div>',`<br>过滤模式：${mode}</div>`);
  };

  function fakeItem(name,price=24){return {goods_name:name,shop_name:'规格自测',platform:'local',coupon_price_yuan:price,min_group_price_yuan:price};}
  const specCases=[
    ['500ml*24 饮料','饮料',fakeItem('可口可乐 500ml*24瓶 整箱',48),'volume','100ml'],
    ['24瓶500ml 饮料','饮料',fakeItem('农夫山泉 24瓶 500ml 整箱',36),'volume','100ml'],
    ['12*330ml 汽水','无糖可口可乐',fakeItem('无糖可口可乐 12*330ml 罐装',39),'volume','100ml'],
    ['1L 牛奶','牛奶',fakeItem('纯牛奶 1L*12盒',69),'volume','/L'],
    ['500g 重量','洗衣液',fakeItem('蓝月亮洗衣液 500g*4袋',29),'weight','/kg'],
    ['3kg*2桶','洗衣液',fakeItem('蓝月亮洗衣液 3kg*2桶',79),'weight','/kg'],
    ['2桶3kg','洗衣液',fakeItem('洗衣液 2桶 3kg 家用装',59),'weight','/kg'],
    ['100抽*24包','纸巾',fakeItem('维达抽纸 100抽*24包',45),'paper','100抽'],
    ['24包100抽','纸巾',fakeItem('维达纸巾 24包 100抽',45),'paper','100抽'],
    ['20000mAh','小米充电宝 20000毫安',fakeItem('小米充电宝 20000mAh 22.5W',99),'power','万mAh']
  ];

  function runSpecParserTests(){
    const box=document.getElementById('specTestBox'); if(!box)return;
    let pass=0,fail=0;
    let html='<div class="reason" style="margin-top:10px"><b>规格解析自测</b>\n';
    for(const [name,q,item,kind,needle] of specCases){
      const sp=parseSpec(item,q);
      const ok=sp.kind===kind && sp.text.includes(needle);
      if(ok)pass++; else fail++;
      html+=`${ok?'✅':'❌'} ${name}: ${sp.kind} ${sp.text}\n`;
    }
    html+=`\n结果：通过 ${pass}，失败 ${fail}</div>`;
    box.innerHTML=html;
  }

  window.runTests=async function(){
    if(oldRunTests) await oldRunTests();
    runSpecParserTests();
  };

  setTimeout(()=>{ensureModeUI(); const btn=document.getElementById('runTests'); if(btn)btn.onclick=window.runTests;},0);
})();
