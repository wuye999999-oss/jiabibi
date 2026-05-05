// ====== 顾客端全平台 + 京东企业模式 Patch ======
(function() {
  try {
    const isCustomerMode = true; // 简洁模式判断
    if (isCustomerMode) {
      const forcedPlatforms = ['pdd','jd','tb','douyin'];
      localStorage.setItem('selectedPlatforms', JSON.stringify(forcedPlatforms));
      console.log('[Patch] 顾客端全平台已强制启用:', forcedPlatforms);

      window.JD_CONFIG = window.JD_CONFIG || {};
      window.JD_CONFIG.account_type = 'enterprise';
      window.JD_CONFIG.coverage = 'enterprise_common';
      window.JD_CONFIG.advanced_api = false;
      window.JD_CONFIG.self_operated_full_coverage = false;
      console.log('[Patch] 京东企业模式已生效 ✅');
    }

    // 搜索请求统一到企业模式
    const originalSearchFn = window.searchProduct || function(){};
    window.searchProduct = function(keyword, platform) {
      if(platform === 'jd') {
        const jdParams = {
          account_type: 'enterprise',
          coverage: 'enterprise_common',
          advanced_api: false,
          self_operated_full_coverage: false,
          keyword: keyword
        };
        console.log('[Patch] 京东搜索请求走企业模式:', jdParams.keyword);
        return originalSearchFn(keyword, platform, jdParams);
      } else {
        return originalSearchFn(keyword, platform);
      }
    };

    console.log('[Patch] 京东搜索请求已统一到企业模式 ✅');

  } catch(e) {
    console.error('[Patch] 全平台 + 京东企业模式逻辑出错:', e);
  }
})();
