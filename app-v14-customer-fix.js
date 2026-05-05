// app-v14-customer-fix.js: customer mode hardening, force all platforms, JD enterprise marker
(function() {
  try {
    const platforms = ['pdd','jd','tb','douyin'];
    const platformKey = 'jiabibi_platform_filter_v1';
    const legacyPlatformKey = 'selectedPlatforms';
    const viewKey = 'jiabibi_view_mode_v1';
    const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 640px)').matches;

    function forceCustomerDefaults() {
      // v9 reads jiabibi_platform_filter_v1, not selectedPlatforms.
      localStorage.setItem(platformKey, JSON.stringify(platforms));
      localStorage.setItem(legacyPlatformKey, JSON.stringify(platforms));

      // Mobile/customer entrance defaults to simple mode. Add ?debug=1 to keep debug tools.
      const debug = new URLSearchParams(location.search).get('debug') === '1';
      if (isMobile() && !debug) localStorage.setItem(viewKey, 'simple');

      window.JD_CONFIG = window.JD_CONFIG || {};
      window.JD_CONFIG.account_type = 'enterprise';
      window.JD_CONFIG.coverage = 'enterprise_common';
      window.JD_CONFIG.advanced_api = false;
      window.JD_CONFIG.self_operated_full_coverage = false;

      const tag = document.querySelector('.tag');
      if (tag) tag.textContent = '价比比 · 沙盒 v14 · 顾客模式';
    }

    forceCustomerDefaults();

    // Keep the old v9 platform filter from hiding JD after render/search.
    const oldSearch = window.search;
    if (typeof oldSearch === 'function') {
      window.search = async function(v) {
        forceCustomerDefaults();
        const ret = await oldSearch(v);
        forceCustomerDefaults();
        return ret;
      };
    }

    const oldRenderAll = window.renderAll;
    if (typeof oldRenderAll === 'function') {
      window.renderAll = function(data, q) {
        forceCustomerDefaults();
        const ret = oldRenderAll(data, q);
        setTimeout(() => {
          forceCustomerDefaults();
          if (window.jiabibiApplyViewMode) window.jiabibiApplyViewMode();
        }, 0);
        return ret;
      };
    }

    // Compatibility wrapper for any future JD-only search helper.
    const originalSearchProduct = window.searchProduct;
    if (typeof originalSearchProduct === 'function') {
      window.searchProduct = function(keyword, platform) {
        if (platform === 'jd') {
          const jdParams = {
            account_type: 'enterprise',
            coverage: 'enterprise_common',
            advanced_api: false,
            self_operated_full_coverage: false,
            keyword
          };
          console.log('[v14] 京东搜索请求走企业模式:', keyword);
          return originalSearchProduct(keyword, platform, jdParams);
        }
        return originalSearchProduct.apply(this, arguments);
      };
    }

    setTimeout(() => {
      forceCustomerDefaults();
      if (window.jiabibiApplyViewMode) window.jiabibiApplyViewMode();
    }, 300);

    console.log('[v14] 顾客端全平台已强制启用:', platforms);
    console.log('[v14] 京东企业模式标记已生效');
  } catch(e) {
    console.error('[v14] 顾客端修复逻辑出错:', e);
  }
})();
