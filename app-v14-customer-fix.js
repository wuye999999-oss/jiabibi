// app-v14-customer-fix.js: customer mode hardening, force all platforms, JD enterprise marker
(function() {
  try {
    const platforms = ['pdd','jd','tb','douyin'];
    const platformKey = 'jiabibi_platform_filter_v1';
    const legacyPlatformKey = 'selectedPlatforms';
    const viewKey = 'jiabibi_view_mode_v1';
    const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
    const isDebug = () => new URLSearchParams(location.search).get('debug') === '1';

    function setTag() {
      const tag = document.querySelector('.tag');
      if (tag) tag.textContent = isDebug() ? '价比比 · 沙盒 v14 · 调试模式' : '价比比 · 沙盒 v14 · 顾客模式';
    }

    function forceCustomerDefaults() {
      // v9 reads jiabibi_platform_filter_v1, not selectedPlatforms.
      localStorage.setItem(platformKey, JSON.stringify(platforms));
      localStorage.setItem(legacyPlatformKey, JSON.stringify(platforms));

      // Mobile/customer entrance defaults to simple mode. Add ?debug=1 to keep debug tools.
      if (!isDebug()) localStorage.setItem(viewKey, 'simple');
      if (isDebug()) localStorage.setItem(viewKey, 'debug');

      window.JD_CONFIG = window.JD_CONFIG || {};
      window.JD_CONFIG.account_type = 'enterprise';
      window.JD_CONFIG.coverage = 'enterprise_common';
      window.JD_CONFIG.advanced_api = false;
      window.JD_CONFIG.self_operated_full_coverage = false;

      setTag();
    }

    // Wrap v11 applyMode: let v11 hide/show tools, then immediately restore v14 tag/defaults.
    const oldApply = window.jiabibiApplyViewMode;
    if (typeof oldApply === 'function' && !oldApply.__v14Wrapped) {
      const wrapped = function() {
        const ret = oldApply.apply(this, arguments);
        setTimeout(forceCustomerDefaults, 0);
        return ret;
      };
      wrapped.__v14Wrapped = true;
      window.jiabibiApplyViewMode = wrapped;
    }

    forceCustomerDefaults();

    // Keep the old v9 platform filter from hiding JD after render/search.
    const oldSearch = window.search;
    if (typeof oldSearch === 'function' && !oldSearch.__v14Wrapped) {
      const wrappedSearch = async function(v) {
        forceCustomerDefaults();
        const ret = await oldSearch(v);
        forceCustomerDefaults();
        return ret;
      };
      wrappedSearch.__v14Wrapped = true;
      window.search = wrappedSearch;
    }

    const oldRenderAll = window.renderAll;
    if (typeof oldRenderAll === 'function' && !oldRenderAll.__v14Wrapped) {
      const wrappedRenderAll = function(data, q) {
        forceCustomerDefaults();
        const ret = oldRenderAll(data, q);
        setTimeout(() => {
          forceCustomerDefaults();
          if (window.jiabibiApplyViewMode) window.jiabibiApplyViewMode();
          setTag();
        }, 0);
        return ret;
      };
      wrappedRenderAll.__v14Wrapped = true;
      window.renderAll = wrappedRenderAll;
    }

    // Compatibility wrapper for any future JD-only search helper.
    const originalSearchProduct = window.searchProduct;
    if (typeof originalSearchProduct === 'function' && !originalSearchProduct.__v14Wrapped) {
      const wrappedSearchProduct = function(keyword, platform) {
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
      wrappedSearchProduct.__v14Wrapped = true;
      window.searchProduct = wrappedSearchProduct;
    }

    // Beat delayed v11 timers and browser cache weirdness.
    [0, 100, 300, 800, 1600, 2600, 4200].forEach(ms => {
      setTimeout(() => {
        forceCustomerDefaults();
        setTag();
      }, ms);
    });

    window.jiabibiV14ForceCustomerDefaults = forceCustomerDefaults;

    console.log('[v14] 顾客端全平台已强制启用:', platforms);
    console.log('[v14] 京东企业模式标记已生效');
  } catch(e) {
    console.error('[v14] 顾客端修复逻辑出错:', e);
  }
})();
