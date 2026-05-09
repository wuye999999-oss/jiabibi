// app-v20-algo-selfcheck.js: 算法自检与准确度增强层。
// 原则：品牌/品类/适用对象/规格先准确，再比价格；宁可少展示，不展示错品。
(function(){
  const old={
    diagnose:window.diagnose,
    score:window.score,
    valueOf:window.valueOf,
    spec:window.spec,
    typeOf:window.typeOf,
    priceOf:window.priceOf,
    best:window.best,
    bestAll:window.bestAll,
    renderAll:window.renderAll
  };
  const brandWords=['鲜朗','真零','百岁山','农夫山泉','怡宝','维达','蓝月亮','小米','安克','苹果','华为','可口可乐','雪碧','芬达','百事'];
  const stopWords=['官方','旗舰店','旗舰','自营','品牌','淘宝','拼多多','京东','抖音','包邮','低价','最低价','商品','旗舰店鲜朗'];
  function $(id){return document.getElementById(id)}
  function norm(s){return String(s||'').toLowerCase().replace(/[\s\-_【】\[\]（）()，,。.!！:：/\\]+/g,'')}
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function textOf(i){return [i&&i.goods_name,i&&i.goods_desc,i&&i.brand_name,i&&i.shop_name,((i&&i.unified_tags)||[]).join(' ')].filter(Boolean).join(' ')}
  function nameOf(i){return String((i&&i.goods_name)||'')}
  function priceOf(i){try{return old.priceOf?old.priceOf(i):Number(i&& (i.coupon_price_yuan||i.min_group_price_yuan||i.price||999999))}catch(e){return Number(i&& (i.coupon_price_yuan||i.min_group_price_yuan||i.price||999999))}}
  function has(t,arr){const n=norm(t);return arr.some(x=>n.includes(norm(x)))}
  function parseWeightsKg(t){
    t=String(t||'').replace(/千克|公斤/gi,'kg').replace(/克/gi,'g').replace(/斤/g,'斤').replace(/[×ＸxX]/g,'*');
    const out=[]; let m;
    const multi=/([0-9]+(?:\.[0-9]+)?)\s*(kg|KG|g|G|斤)\s*\*\s*([0-9]+)/g;
    while((m=multi.exec(t))){let v=Number(m[1]); const u=m[2].toLowerCase(); const c=Number(m[3]); if(u==='g')v/=1000; else if(u==='斤')v*=0.5; out.push(v*c);}
    const single=/([0-9]+(?:\.[0-9]+)?)\s*(kg|KG|g|G|斤)/g;
    while((m=single.exec(t))){let v=Number(m[1]); const u=m[2].toLowerCase(); if(u==='g')v/=1000; else if(u==='斤')v*=0.5; if(v>0&&v<80)out.push(v);}
    return Array.from(new Set(out.map(x=>Math.round(x*1000)/1000))).sort((a,b)=>a-b);
  }
  function nearWeight(weights,target){
    if(!target||!weights.length)return false;
    const tol=Math.max(0.15,target*0.18);
    return weights.some(w=>Math.abs(w-target)<=tol);
  }
  function extractBrand(q){
    const nq=norm(q);
    const known=brandWords.find(b=>nq.includes(norm(b)));
    if(known)return known;
    // 常见结构：鲜朗成猫猫粮2kg / 某某酸奶 / 某某纸巾，取品类词前面的 2-6 个汉字作为品牌候选。
    const m=String(q||'').match(/^([\u4e00-\u9fa5A-Za-z0-9]{2,8}?)(?:成猫|幼猫|全价|猫粮|狗粮|犬粮|酸奶|牛奶|纸巾|洗衣液|充电宝|矿泉水|可乐)/);
    if(m){const b=m[1].replace(/成猫|幼猫|全价/g,''); if(b.length>=2&&!stopWords.includes(b))return b;}
    return '';
  }
  function queryIntent(q){
    const n=norm(q), raw=String(q||'');
    const weights=parseWeightsKg(raw);
    const brand=extractBrand(raw);
    const catFood=/猫粮|成猫|幼猫|全价猫|猫主粮/.test(raw);
    const dogFood=/狗粮|犬粮/.test(raw);
    let category='';
    if(catFood)category='cat_food'; else if(dogFood)category='dog_food';
    else if(/酸奶|发酵乳|乳酸菌/.test(raw))category='yogurt';
    else if(/牛奶|纯牛奶|鲜牛奶/.test(raw))category='milk';
    else if(/纸巾|抽纸|卷纸|卫生纸/.test(raw))category='paper';
    else if(/洗衣液|洗衣凝珠|洗衣粉/.test(raw))category='laundry';
    else if(/充电宝|移动电源|毫安|mah/i.test(raw))category='power';
    else if(/矿泉水|饮用水|天然水|纯净水/.test(raw))category='water';
    else if(/可乐|雪碧|芬达|百事|汽水|碳酸|cola/i.test(raw))category='cola';
    const stage=/成猫/.test(raw)?'adult_cat':(/幼猫/.test(raw)?'kitten':'');
    const desiredWeightKg=weights[0]||0;
    const tokens=raw.split(/[\s\u3000]+/).map(x=>x.trim()).filter(Boolean);
    return {brand,category,stage,desiredWeightKg,tokens,raw,norm:n};
  }
  function categoryCheck(it,itemText,itemName){
    const t=String(itemText||''), name=String(itemName||'');
    const r=[];
    if(it.category==='cat_food'){
      if(/狗粮|犬粮|狗狗|犬用/.test(t))r.push('品类冲突：搜索猫粮但商品像狗粮/犬粮');
      if(!/猫粮|猫主粮|全价猫|成猫粮|幼猫粮|烘焙粮|冻干粮|主粮/.test(t))r.push('品类不符：需要猫粮/主粮');
      if(/猫冻干/.test(t)&&!/猫粮|主粮|全价|粮/.test(t))r.push('品类风险：像猫冻干零食，不是猫粮主粮');
    }
    if(it.category==='dog_food'){
      if(/猫粮|猫主粮|猫咪/.test(t))r.push('品类冲突：搜索狗粮但商品像猫粮');
      if(!/狗粮|犬粮|犬用|狗主粮/.test(t))r.push('品类不符：需要狗粮/犬粮');
    }
    if(it.category==='yogurt'&&!/酸奶|发酵乳|乳酸菌|酸乳/.test(t))r.push('品类不符：需要酸奶/发酵乳');
    if(it.category==='milk'&&(!/牛奶|纯牛奶|鲜牛奶|牛乳/.test(t)||/酸奶|发酵乳/.test(t)))r.push('品类不符：需要牛奶且不能是酸奶');
    if(it.category==='paper'&&!/纸巾|抽纸|卷纸|卫生纸|面巾纸/.test(t))r.push('品类不符：需要纸巾');
    if(it.category==='laundry'&&!/洗衣液|洗衣凝珠|洗衣粉/.test(t))r.push('品类不符：需要洗衣用品');
    if(it.category==='power'&&!/充电宝|移动电源|mah|毫安/i.test(t))r.push('品类不符：需要充电宝/移动电源');
    if(it.category==='water'&&!/矿泉水|饮用水|天然水|纯净水|矿物质水/.test(t))r.push('品类不符：需要饮用水/矿泉水');
    if(it.category==='cola'&&!/可乐|雪碧|芬达|百事|汽水|碳酸|cola/i.test(t))r.push('品类不符：需要可乐/汽水');
    if(it.stage==='adult_cat'&&/幼猫/.test(name)&&!/成猫|全阶段|全价|全猫|通用|成幼猫/.test(name))r.push('适用对象不符：需要成猫，不优先幼猫专用');
    if(it.stage==='kitten'&&/成猫/.test(name)&&!/幼猫|全阶段|全价|全猫|通用|成幼猫/.test(name))r.push('适用对象不符：需要幼猫，不优先成猫专用');
    return r;
  }
  function enhancedDiagnose(item,q){
    const base=old.diagnose?old.diagnose(item,q):{keep:true,reasons:['基础通过']};
    const it=queryIntent(q||'');
    const t=textOf(item), name=nameOf(item);
    const reasons=[];
    if(it.brand&&norm(t).indexOf(norm(it.brand))<0)reasons.push('品牌不符：需要 '+it.brand);
    reasons.push(...categoryCheck(it,t,name));
    if(it.desiredWeightKg){
      const ws=parseWeightsKg(t);
      if(!ws.length)reasons.push('规格缺失：需要约 '+it.desiredWeightKg+'kg');
      else if(!nearWeight(ws,it.desiredWeightKg))reasons.push('规格不符：需要约 '+it.desiredWeightKg+'kg，商品疑似 '+ws.join('/')+'kg');
    }
    if(base&&base.keep===false){
      const oldReasons=(base.reasons||[]).filter(x=>!String(x).includes('关键词缺失'));
      reasons.push(...oldReasons);
    }
    return {keep:reasons.length===0,reasons:reasons.length?Array.from(new Set(reasons)):['算法自检通过：品牌/品类/规格匹配'],intent:it};
  }
  function enhancedScore(item,q){
    let s=0; try{s=old.score?old.score(item,q):0}catch(e){}
    const it=queryIntent(q||''), t=textOf(item), name=nameOf(item), nt=norm(t), nn=norm(name);
    if(it.brand){ if(nn.includes(norm(it.brand)))s+=1200; else if(nt.includes(norm(it.brand)))s+=700; }
    if(it.category==='cat_food'&&/猫粮|猫主粮|全价猫|成猫粮|幼猫粮|烘焙粮/.test(name))s+=650;
    if(it.category==='dog_food'&&/狗粮|犬粮/.test(name))s+=650;
    if(it.stage==='adult_cat'&&/成猫|全阶段|全价|全猫|通用/.test(name))s+=260;
    if(it.stage==='kitten'&&/幼猫|全阶段|全价|全猫|通用/.test(name))s+=260;
    if(it.desiredWeightKg){const ws=parseWeightsKg(t); if(nearWeight(ws,it.desiredWeightKg))s+=700; else s-=900;}
    if(/官方旗舰店|品牌旗舰店|旗舰店|官方店|自营/.test(t))s+=150;
    if(/适用|配件|周边|试吃|样品|赠品|空袋|猫砂铲/.test(t))s-=800;
    return s;
  }
  function enhancedValueOf(item,q){
    const it=queryIntent(q||'');
    const p=priceOf(item);
    if(it.desiredWeightKg&&p>0)return p/it.desiredWeightKg;
    try{return old.valueOf?old.valueOf(item,q):p}catch(e){return p}
  }
  function enhancedBest(list,type,p,q){
    const typeFn=old.typeOf||window.typeOf;
    return (list||[]).filter(x=>x&&x.platform===p&&(!type||!typeFn||typeFn(x)===type)&&enhancedDiagnose(x,q).keep)
      .sort((a,b)=>{
        const sa=enhancedScore(a,q), sb=enhancedScore(b,q);
        if(Math.abs(sb-sa)>80)return sb-sa;
        return enhancedValueOf(a,q)-enhancedValueOf(b,q)||priceOf(a)-priceOf(b);
      })[0];
  }
  function enhancedBestAll(list,type,q){
    const ps=['pdd','tb','douyin','jd'];
    return ps.map(p=>enhancedBest(list,type,p,q)).filter(Boolean).sort((a,b)=>{
      const sa=enhancedScore(a,q), sb=enhancedScore(b,q);
      if(Math.abs(sb-sa)>80)return sb-sa;
      return enhancedValueOf(a,q)-enhancedValueOf(b,q)||priceOf(a)-priceOf(b);
    })[0];
  }
  window.diagnose=enhancedDiagnose;
  window.score=enhancedScore;
  window.valueOf=enhancedValueOf;
  window.best=enhancedBest;
  window.bestAll=enhancedBestAll;
  window.jiabibiAlgoIntent=queryIntent;
  window.jiabibiAlgoSelfCheck=function(data,q){
    const list=(data&&data.goods_list)||[];
    const kept=list.filter(x=>enhancedDiagnose(x,q).keep);
    const rejected=list.filter(x=>!enhancedDiagnose(x,q).keep).slice(0,5).map(x=>({platform:x.platform,name:x.goods_name,reasons:enhancedDiagnose(x,q).reasons}));
    return {intent:queryIntent(q),raw:list.length,kept:kept.length,rejected,top:kept.slice().sort((a,b)=>enhancedScore(b,q)-enhancedScore(a,q)).slice(0,5).map(x=>({platform:x.platform,name:x.goods_name,score:enhancedScore(x,q),price:priceOf(x)}))};
  };
  function addSelfCheckCard(data,q){
    const panel=$('panel-result'); if(!panel||!data)return;
    const oldCard=$('algo-selfcheck'); if(oldCard)oldCard.remove();
    const c=window.jiabibiAlgoSelfCheck(data,q||(($('kw')&&$('kw').value)||''));
    const div=document.createElement('div');
    div.id='algo-selfcheck'; div.className='card muted';
    div.innerHTML=`<b style="color:#111">算法自检</b><div style="margin-top:6px">识别：品牌 ${esc(c.intent.brand||'无')}｜品类 ${esc(c.intent.category||'通用')}｜规格 ${c.intent.desiredWeightKg?esc(c.intent.desiredWeightKg+'kg'):'无'}｜候选 ${c.raw}，保留 ${c.kept}。</div>${c.rejected.length?`<div style="margin-top:6px">已过滤样例：${c.rejected.map(x=>esc((x.platform||'')+' '+String(x.name||'').slice(0,24)+'：'+x.reasons[0])).join('；')}</div>`:''}`;
    panel.insertAdjacentElement('afterbegin',div);
  }
  if(typeof old.renderAll==='function'&&!old.renderAll.__v20Algo){
    const wrapped=function(data,q){
      const ret=old.renderAll.apply(this,arguments);
      setTimeout(()=>addSelfCheckCard(data,q),60);
      return ret;
    };
    wrapped.__v20Algo=true;
    window.renderAll=wrapped;
  }
  console.log('[v20] 算法自检与强约束排序已加载');
})();
