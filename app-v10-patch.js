// app-v10-patch.js: self-check, version visibility, performance, cache recovery
(function(){
  const VERSION='v10';
  const START=Date.now();
  const $=id=>document.getElementById(id);
  const platformKey='jiabibi_platform_filter_v1';
  let lastSearchStart=0;
  let lastError='';
  let lastSnapshot=null;

  function ensureV10Tools(){
    if($('v10-tools'))return;
    const anchor=$('v9-tools')||$('v8-tools')||$('v7-mode')||$('v6-tools')||document.querySelector('.tabs');
    if(!anchor)return;
    const card=document.createElement('div');
    card.id='v10-tools';
    card.className='card';
    card.innerHTML=`
      <div class="row">
        <div>
          <b>稳定性自检</b>
          <div class="muted">用于确认是不是缓存、旧版本、API 或筛选导致的问题。</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button type="button" id="runSelfCheck">页面自检</button>
          <button type="button" id="forceFresh">强制刷新</button>
          <button type="button" id="resetPlatforms">恢复全平台</button>
          <button type="button" id="copySnapshot">复制快照</button>
        </div>
      </div>
      <div id="v10Box" class="reason" style="margin-top:10px">v10 已加载，等待搜索。</div>
    `;
    anchor.insertAdjacentElement('afterend',card);
    $('runSelfCheck').onclick=runSelfCheck;
    $('forceFresh').onclick=forceFresh;
    $('resetPlatforms').onclick=resetPlatforms;
    $('copySnapshot').onclick=copySnapshot;
    runSelfCheck();
  }

  function getPlatformFilter(){
    try{return JSON.parse(localStorage.getItem(platformKey)||'[]')}catch(e){return []}
  }
  function setBox(txt){const box=$('v10Box'); if(box)box.textContent=txt;}
  function setStatus(txt){const s=$('status'); if(s)s.textContent=txt;}

  function runSelfCheck(){
    const checks=[
      ['search',typeof window.search==='function'],
      ['renderAll',typeof window.renderAll==='function'],
      ['diagnose',typeof window.diagnose==='function'],
      ['parseSpec',typeof window.parseSpec==='function'],
      ['runTests',typeof window.runTests==='function'],
      ['provider status UI',!!$('providers')],
      ['result panel',!!$('panel-result')],
      ['debug panel',!!$('panel-debug')],
      ['tests panel',!!$('panel-tests')],
      ['v6 tools',!!$('v6-tools')],
      ['v7 mode',!!$('v7-mode')],
      ['v8 tools',!!$('v8-tools')],
      ['v9 tools',!!$('v9-tools')],
      ['v10 tools',!!$('v10-tools')]
    ];
    const ok=checks.filter(x=>x[1]).length;
    const lines=checks.map(([k,v])=>`${v?'✅':'❌'} ${k}`).join('\n');
    const platformFilter=getPlatformFilter();
    setBox(`版本：${VERSION}\n页面运行：${Date.now()-START}ms\n加载检查：${ok}/${checks.length}\n平台筛选：${platformFilter.length?platformFilter.join(', '):'未设置'}\n最近错误：${lastError||'无'}\n\n${lines}`);
  }

  function forceFresh(){
    try{
      const url=new URL(location.href);
      url.searchParams.set('_fresh',Date.now());
      location.href=url.toString();
    }catch(e){location.reload();}
  }

  function resetPlatforms(){
    localStorage.setItem(platformKey,JSON.stringify(['pdd','jd','tb','douyin']));
    setStatus('已恢复全平台筛选，正在重算/搜索。');
    if(typeof window.rerenderCurrent==='function') window.rerenderCurrent();
    else if($('kw')) window.search($('kw').value);
    setTimeout(runSelfCheck,300);
  }

  async function copySnapshot(){
    const payload={
      version:VERSION,
      time:new Date().toISOString(),
      href:location.href,
      query:$('kw')?$('kw').value:'',
      status:$('status')?$('status').textContent:'',
      platform_filter:getPlatformFilter(),
      last_error:lastError,
      last_snapshot:lastSnapshot,
      user_agent:navigator.userAgent
    };
    try{
      await navigator.clipboard.writeText(JSON.stringify(payload,null,2));
      setStatus('已复制 v10 页面快照。');
    }catch(e){
      setBox('复制快照失败：'+e.message+'\n'+JSON.stringify(payload,null,2));
    }
  }

  const oldSearch=window.search;
  window.search=async function(v){
    lastSearchStart=Date.now();
    lastError='';
    try{
      const ret=await oldSearch(v);
      const cost=Date.now()-lastSearchStart;
      const s=$('status');
      if(s && !/失败|错误/.test(s.textContent)) s.textContent=s.textContent+' · 耗时 '+cost+'ms';
      return ret;
    }catch(e){
      lastError=e.message||String(e);
      setStatus('搜索异常：'+lastError);
      runSelfCheck();
      throw e;
    }
  };

  const oldRenderAll=window.renderAll;
  window.renderAll=function(data,q){
    try{
      const list=data?.goods_list||[];
      lastSnapshot={query:q,raw:list.length,total_count:data?.total_count,providers:data?.providers,rendered_at:new Date().toISOString()};
      const ret=oldRenderAll(data,q);
      const cost=lastSearchStart?Date.now()-lastSearchStart:0;
      const box=$('v10Box');
      if(box){
        const filters=getPlatformFilter();
        box.textContent=`v10 结果快照\n搜索：${q}\n原始候选：${list.length}\n接口 total_count：${data?.total_count??''}\n平台筛选：${filters.length?filters.join(', '):'未设置'}\n耗时：${cost}ms\n最近错误：${lastError||'无'}`;
      }
      return ret;
    }catch(e){
      lastError=e.message||String(e);
      setBox('渲染异常：'+lastError);
      throw e;
    }
  };

  window.addEventListener('error',e=>{lastError=e.message||String(e.error||e); runSelfCheck();});
  window.addEventListener('unhandledrejection',e=>{lastError=(e.reason&&e.reason.message)||String(e.reason); runSelfCheck();});

  // Expose helpers for later patches and console debugging.
  window.jiabibiSelfCheck=runSelfCheck;
  window.jiabibiResetPlatforms=resetPlatforms;

  setTimeout(ensureV10Tools,0);
})();
