// app-v5-patch.js: incremental sandbox improvements on top of app-v4
(function(){
  const API='https://jiabibi-api.onrender.com';
  const platformNames={pdd:'拼多多',jd:'京东',tb:'淘宝',douyin:'抖音'};
  const y=n=>Number(n||0).toFixed(2).replace(/\.00$/,'');
  const pOf=i=>Number(i.coupon_price_yuan||i.min_group_price_yuan||999999);
  const text=i=>`${i.goods_name||''} ${i.goods_desc||''} ${i.brand_name||''} ${i.shop_name||''} ${(i.unified_tags||[]).join(' ')}`;
  const n=s=>String(s||'').toLowerCase().replace(/[\s\-_【】\[\]（）()，,。.!！:：/\\]+/g,'');
  const h=(i,arr)=>arr.some(x=>n(typeof i==='string'?i:text(i)).includes(n(x)));
  const toMl=(v,u)=>String(u).toLowerCase()==='l'?v*1000:v;
  const toKg=(v,u)=>u==='斤'?v*0.5:(['g','G'].includes(u)?v/1000:v);
  const testCats={
    yogurt:['酸奶','发酵乳','乳酸菌','酸乳'],milk:['牛奶','牛乳','鲜牛奶','纯牛奶'],water:['百岁山','农夫山泉','怡宝','矿泉水','纯净水','天然水','饮用水'],cola:['可口可乐','coca','cola','雪碧','芬达','百事','汽水','碳酸'],paper:['纸巾','抽纸','卷纸','面巾纸','卫生纸'],laundry:['洗衣液','洗衣凝珠','洗衣粉'],power:['充电宝','移动电源','mah','毫安'],case:['手机壳','保护壳','硅胶壳']
  };
  const testBrands={ganten:['百岁山','ganten'],nongfu:['农夫山泉'],coke:['可口可乐','coca','cola'],vinda:['维达','vinda'],blue:['蓝月亮'],xiaomi:['小米','xiaomi','redmi','米家'],apple:['苹果','apple','iphone'],zhenling:['真零']};
  const testAttrs={noSugar:['无糖','零糖','0糖','零度','zero','无蔗糖','0蔗糖','0卡','零卡']};
  const inferUnit=q=>{try{const it=intent(q); if(['water','cola'].includes(it.cat))return '按 ¥/100ml 比价'; if(['milk','yogurt','laundry'].includes(it.cat))return '按 ¥/L 或 ¥/kg 比价'; if(it.cat==='paper')return '按 ¥/100抽 比价'; if(it.cat==='power')return '按 ¥/万mAh 比价'; if(it.cat==='case')return '按机型强匹配后比总价'; return '按总价/可识别规格综合排序';}catch(e){return '按总价/可识别规格综合排序';}};

  // Stronger spec parser. Overrides app-v4 parseSpec so existing rendering/sorting/diagnosis all benefit.
  parseSpec=function(i,q=''){
    const t=text(i).replace(/[×ＸxX]/g,'*').replace(/毫升/g,'ml').replace(/升/g,'L').replace(/公斤|千克/g,'kg').replace(/克/g,'g').replace(/\s+/g,' ');
    const price=pOf(i); let m; let cat=''; try{cat=intent(q).cat||'';}catch(e){}
    const volume=(ml,count,container)=>{const total=ml*count, per100=price/(total/100), perL=price/(total/1000); if(['yogurt','milk','laundry'].includes(cat))return{kind:'volume',text:`${ml}ml × ${count}${container} ｜ 约 ¥${y(perL)}/L`,value:perL}; return{kind:'volume',text:`${ml}ml × ${count}${container} ｜ 约 ¥${y(per100)}/100ml`,value:per100};};
    m=t.match(/(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L)\s*[*]\s*(\d+)\s*(瓶|罐|听|盒|杯|支|袋)?/); if(m)return volume(toMl(+m[1],m[2]),+m[3],m[4]||'件');
    m=t.match(/(\d+)\s*[*]\s*(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L)/); if(m)return volume(toMl(+m[2],m[3]),+m[1],'件');
    m=t.match(/(\d+)\s*(瓶|罐|听|盒|杯|支|袋|整箱|箱).{0,16}?(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L)/); if(m)return volume(toMl(+m[3],m[4]),+m[1],m[2]);
    m=t.match(/(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L).{0,16}?(\d+)\s*(瓶|罐|听|盒|杯|支|袋|整箱|箱)/); if(m)return volume(toMl(+m[1],m[2]),+m[3],m[4]);
    m=t.match(/(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L)/); if(m){const cm=t.match(/(\d+)\s*(瓶|罐|听|盒|杯|支|袋|整箱|箱)/); return volume(toMl(+m[1],m[2]),cm?+cm[1]:1,cm?cm[2]:'件');}
    const weight=(kg)=>({kind:'weight',text:`${y(kg)}kg ｜ 约 ¥${y(price/kg)}/kg`,value:price/kg});
    m=t.match(/(\d+(?:\.\d+)?)\s*(kg|KG|斤|g|G)\s*[*]\s*(\d+)\s*(桶|瓶|袋|盒|包|杯)?/); if(m)return weight(toKg(+m[1],m[2])*(+m[3]));
    m=t.match(/(\d+)\s*(桶|瓶|袋|盒|包|杯).{0,16}?(\d+(?:\.\d+)?)\s*(kg|KG|斤|g|G)/); if(m)return weight((+m[1])*toKg(+m[3],m[4]));
    m=t.match(/(\d+(?:\.\d+)?)\s*(kg|KG|斤|g|G)/); if(m)return weight(toKg(+m[1],m[2]));
    const paper=total=>({kind:'paper',text:`${total}抽/张 ｜ 约 ¥${y(price/(total/100))}/100抽`,value:price/(total/100)});
    m=t.match(/(\d+)\s*(抽|张)\s*[*]\s*(\d+)\s*(包|提|箱|组)?/); if(m)return paper((+m[1])*(+m[3]));
    m=t.match(/(\d+)\s*(包|提|箱|组).{0,16}?(\d+)\s*(抽|张)/); if(m)return paper((+m[1])*(+m[3]));
    m=n(t).match(/(\d{4,6})(mah|毫安)/); if(m){const cap=+m[1]; return{kind:'power',text:`${cap}mAh ｜ 约 ¥${y(price/(cap/10000))}/万mAh`,value:price/(cap/10000)};}
    return{kind:'none',text:'',value:price};
  };

  // Better top summary.
  summaryCard=function(data,q){
    const all=data.goods_list||[], kept=all.filter(x=>diagnose(x,q).keep), unit=inferUnit(q);
    const providerLine=(data.providers||[]).map(p=>`${platformNames[p.platform]||p.platform}:${p.error?'失败':(p.total_count||0)}`).join(' ｜ ');
    return `<div class="card muted">候选 ${all.length} 条；保留 ${kept.length} 条；过滤 ${all.length-kept.length} 条。${unit}<br>${providerLine||''}</div>`;
  };

  window.runTests=async function(){
    const tests=[
      ['酸奶不混牛奶','酸奶',i=>h(i,testCats.yogurt)&&!h(i,['纯牛奶','鲜牛奶'])],
      ['真零酸奶','真零 酸奶',i=>h(i,testBrands.zhenling)&&h(i,testCats.yogurt)],
      ['牛奶不混酸奶','牛奶',i=>h(i,testCats.milk)&&!h(i,testCats.yogurt)],
      ['百岁山品牌','百岁山',i=>h(i,testBrands.ganten)],
      ['农夫山泉品牌','农夫山泉',i=>h(i,testBrands.nongfu)],
      ['无糖可口可乐','无糖可口可乐',i=>h(i,testBrands.coke)&&h(i,testAttrs.noSugar)],
      ['维达纸巾','维达纸巾',i=>h(i,testBrands.vinda)&&h(i,testCats.paper)],
      ['蓝月亮洗衣液','蓝月亮洗衣液',i=>h(i,testBrands.blue)&&h(i,testCats.laundry)],
      ['小米20000mAh充电宝','小米充电宝 20000毫安',i=>h(i,testBrands.xiaomi)&&h(i,testCats.power)&&itemCap(i)&&Math.abs(itemCap(i)-20000)<=1000],
      ['苹果15手机壳','苹果15手机壳',i=>h(i,testCats.case)&&h(i,['iphone15','苹果15','iPhone 15'])],
      ['拼多多ps链接','https://mobile.yangkeduo.com/goods1.html?ps=lluJ0AAw8D',i=>i.platform==='pdd']
    ];
    const out=document.getElementById('testList'); out.innerHTML=''; let pass=0,warn=0,fail=0;
    for(const [name,q,check] of tests){
      out.insertAdjacentHTML('beforeend',`<div class="card"><b>${name}</b><div class="muted">运行中...</div></div>`); const el=out.lastElementChild;
      try{const r=await fetch(API+'/api/search?platform=all&page_size=50&sandbox=1&keyword='+encodeURIComponent(q)); const d=await r.json(); const list=d.goods_list||[], kept=list.filter(x=>diagnose(x,d.keyword||q).keep), good=kept.filter(check); let cls='ok',label='通过',msg=`保留候选 ${kept.length} / 原始 ${list.length}；满足 ${good.length}`; if(!list.length){cls='warn';label='警告';msg='接口没有返回候选';warn++;} else if(!good.length){cls='bad';label='失败';msg='没有保留候选满足约束';fail++;} else pass++; el.innerHTML=`<div class="row"><div><b>${name}</b><div class="muted">${q}</div></div><span class="pill ${cls}">${label}</span></div><div class="reason">${msg}</div>`;}catch(e){fail++;el.innerHTML=`<b>${name}</b><span class="pill bad">失败</span><div class="reason">${e.message}</div>`;}
    }
    document.getElementById('testSummary').innerHTML=`测试完成：通过 ${pass}，警告 ${warn}，失败 ${fail}`;
  };

  setTimeout(()=>{const btn=document.getElementById('runTests'); if(btn)btn.onclick=window.runTests;},0);
})();
