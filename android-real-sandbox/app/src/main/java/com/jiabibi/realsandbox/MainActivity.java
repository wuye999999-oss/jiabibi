package com.jiabibi.realsandbox;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Bundle;
import android.view.Gravity;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private WebView webView;
    private EditText input;
    private TextView result;
    private final JSONArray captures = new JSONArray();
    private String lastUrl = "";
    private String lastPlatform = "unknown";
    private String lastPageTitle = "";
    private String lastDiag = "";

    private static final String DEFAULT_QUERY = "小米充电宝";
    private static final String DEFAULT_URL = "https://m.jd.com/";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(20, 18, 20, 18);

        TextView title = new TextView(this);
        title.setText("价比比沙盒");
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER_VERTICAL);
        title.setOnLongClickListener(v -> { clearLoginState(); return true; });
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        input = new EditText(this);
        input.setSingleLine(true);
        input.setHint("输入关键词，或粘贴商品链接");
        input.setText(DEFAULT_QUERY);
        root.addView(input, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout platforms = new LinearLayout(this);
        platforms.setOrientation(LinearLayout.HORIZONTAL);
        Button tb = makeButton("淘宝");
        Button jd = makeButton("京东");
        Button pdd = makeButton("拼多多");
        platforms.addView(tb, new LinearLayout.LayoutParams(0, -2, 1));
        platforms.addView(jd, new LinearLayout.LayoutParams(0, -2, 1));
        platforms.addView(pdd, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(platforms, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button read = makeButton("读取价格");
        Button copy = makeButton("复制结果");
        actions.addView(read, new LinearLayout.LayoutParams(0, -2, 1));
        actions.addView(copy, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(actions, new LinearLayout.LayoutParams(-1, -2));

        result = new TextView(this);
        result.setText("第一性原理：只读用户本机真实页面。\n三步：选平台 → 进商品页 → 读取价格。\n长按：标题清登录态；读取=诊断；复制=JSON。\n");
        result.setTextSize(13);
        result.setPadding(0, 8, 0, 8);
        result.setOnLongClickListener(v -> { clearResults(); return true; });
        ScrollView resultBox = new ScrollView(this);
        resultBox.addView(result);
        root.addView(resultBox, new LinearLayout.LayoutParams(-1, 185));

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " JiabibiRealSandbox/0.4");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                lastUrl = url == null ? "" : url;
                lastPlatform = detectPlatform(lastUrl);
                lastPageTitle = view == null ? "" : String.valueOf(view.getTitle());
                runOnUiThread(() -> updateStatus("已打开：" + platformName(lastPlatform) + "\n" + shortText(lastPageTitle, 40) + "\n进商品页后点“读取价格”。"));
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new Bridge(), "JiabibiBridge");
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));

        setContentView(root);

        tb.setOnClickListener(v -> openPlatform("tb"));
        jd.setOnClickListener(v -> openPlatform("jd"));
        pdd.setOnClickListener(v -> openPlatform("pdd"));
        read.setOnClickListener(v -> capturePrice());
        read.setOnLongClickListener(v -> { diagnosePage(); return true; });
        copy.setOnClickListener(v -> copyResult());
        copy.setOnLongClickListener(v -> { copyJson(); return true; });

        webView.loadUrl(DEFAULT_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private Button makeButton(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        return b;
    }

    private void openPlatform(String platform) {
        String q = input.getText().toString().trim();
        if (q.startsWith("http://") || q.startsWith("https://")) {
            openUrl(q);
            return;
        }
        if (q.length() == 0) q = DEFAULT_QUERY;
        try {
            String e = URLEncoder.encode(q, "UTF-8");
            String url;
            if ("tb".equals(platform)) url = "https://s.m.taobao.com/h5?q=" + e;
            else if ("pdd".equals(platform)) url = "https://mobile.yangkeduo.com/search_result.html?search_key=" + e;
            else url = "https://m.jd.com/ware/search.action?keyword=" + e;
            openUrl(url);
        } catch (Exception ex) {
            updateStatus("打开失败：" + ex.getMessage());
        }
    }

    private void openUrl(String url) {
        lastUrl = url;
        lastPlatform = detectPlatform(url);
        updateStatus("正在打开：" + platformName(lastPlatform) + "\n" + shortText(url, 84));
        webView.loadUrl(url);
    }

    private String detectPlatform(String url) {
        String u = (url == null ? "" : url).toLowerCase();
        if (u.contains("taobao") || u.contains("tmall") || u.contains("tb.cn")) return "taobao";
        if (u.contains("jd.com") || u.contains("3.cn")) return "jd";
        if (u.contains("pinduoduo") || u.contains("yangkeduo") || u.contains("pdd")) return "pdd";
        return "unknown";
    }

    private String platformName(String p) {
        if ("taobao".equals(p)) return "淘宝";
        if ("jd".equals(p)) return "京东";
        if ("pdd".equals(p)) return "拼多多";
        return "未知平台";
    }

    private String shortText(String s, int n) {
        if (s == null) return "";
        s = s.replace("\n", " ").trim();
        return s.length() > n ? s.substring(0, n) + "…" : s;
    }

    private void updateStatus(String text) {
        result.setText(text + "\n\n" + renderCaptures());
    }

    private String renderCaptures() {
        if (captures.length() == 0) return "结果：暂无";
        JSONObject best = bestCapture();
        StringBuilder sb = new StringBuilder();
        if (best != null) {
            sb.append("最便宜：").append(platformName(best.optString("platform")))
                    .append("  ¥").append(formatPrice(best.optDouble("priceNumber", 0)))
                    .append("\n").append(shortText(best.optString("title"), 58));
        }
        sb.append("\n\n已读取 ").append(captures.length()).append(" 个平台：");
        for (int i = 0; i < captures.length(); i++) {
            JSONObject o = captures.optJSONObject(i);
            if (o == null) continue;
            double n = o.optDouble("priceNumber", 0);
            sb.append("\n").append(i + 1).append(". ").append(platformName(o.optString("platform")))
                    .append("  ").append(n > 0 ? "¥" + formatPrice(n) : shortText(o.optString("price"), 28));
            String promo = o.optString("promoPrice");
            if (promo.length() > 0) sb.append("\n   活动：").append(shortText(promo, 42));
            sb.append("\n   ").append(shortText(o.optString("title"), 56));
        }
        return sb.toString();
    }

    private JSONObject bestCapture() {
        JSONObject best = null;
        double bestPrice = Double.MAX_VALUE;
        for (int i = 0; i < captures.length(); i++) {
            JSONObject o = captures.optJSONObject(i);
            if (o == null) continue;
            double n = o.optDouble("priceNumber", 0);
            if (n > 0 && n < bestPrice) {
                bestPrice = n;
                best = o;
            }
        }
        return best;
    }

    private String formatPrice(double n) {
        if (Math.abs(n - Math.round(n)) < 0.001) return String.valueOf((long)Math.round(n));
        return String.format(java.util.Locale.US, "%.2f", n);
    }

    private double extractLowestPrice(String text) {
        if (text == null) return 0;
        Matcher m = Pattern.compile("([0-9]+(?:\\.[0-9]{1,2})?)").matcher(text);
        double best = Double.MAX_VALUE;
        while (m.find()) {
            try {
                double v = Double.parseDouble(m.group(1));
                if (v > 0.01 && v < best) best = v;
            } catch (Exception ignored) {}
        }
        return best == Double.MAX_VALUE ? 0 : best;
    }

    private void upsertCapture(JSONObject o) {
        String p = o.optString("platform");
        double a = extractLowestPrice(o.optString("promoPrice"));
        double b = extractLowestPrice(o.optString("price"));
        double priceNumber = a > 0 ? a : b;
        try { o.put("priceNumber", priceNumber); } catch (Exception ignored) {}
        for (int i = captures.length() - 1; i >= 0; i--) {
            JSONObject old = captures.optJSONObject(i);
            if (old != null && p.equals(old.optString("platform"))) captures.remove(i);
        }
        captures.put(o);
    }

    private String captureScript(boolean diagnoseOnly) {
        return "(function(){" +
                "function text(x){return (x&&x.innerText||x&&x.textContent||'').trim().replace(/\\s+/g,' ')}" +
                "function pick(sel){for(var i=0;i<sel.length;i++){try{var e=document.querySelector(sel[i]);var t=text(e);if(t&&t.length>0)return t}catch(err){}}return ''}" +
                "function pickAttr(sel,attr){for(var i=0;i<sel.length;i++){try{var e=document.querySelector(sel[i]);var v=e&&e.getAttribute(attr);if(v)return v}catch(err){}}return ''}" +
                "function meta(name){var e=document.querySelector('meta[property=\\\"'+name+'\\\"],meta[name=\\\"'+name+'\\\"]');return e?e.getAttribute('content')||'':''}" +
                "function money(s){s=String(s||'');var m=s.match(/(?:到手价|券后价|券后|秒杀价|活动价|预估|价格|¥|￥)\\s*[:：]?\\s*[¥￥]?\\s*([0-9]+(?:\\.[0-9]{1,2})?)/);if(m)return m[0];var m2=s.match(/[¥￥]\\s*([0-9]+(?:\\.[0-9]{1,2})?)/);return m2?m2[0]:''}" +
                "var host=location.hostname.toLowerCase();" +
                "var platform=host.indexOf('taobao')>-1||host.indexOf('tmall')>-1?'taobao':(host.indexOf('jd.com')>-1||host.indexOf('3.cn')>-1?'jd':(host.indexOf('yangkeduo')>-1||host.indexOf('pinduoduo')>-1?'pdd':'unknown'));" +
                "var commonTitle=['#goods_name','.sku-name','.goods-name','.goods-title','.title','.item-title','.tb-main-title','h1'];" +
                "var jdTitle=['.sku-name','#itemName','.prod-title','.good-detail-title','.item-title','h1'];" +
                "var tbTitle=['.tb-main-title','.module-title','.item-title','.rax-view-v2','h1'];" +
                "var pddTitle=['[class*=goodsName]','[class*=goods-name]','[class*=title]','h1'];" +
                "var priceSel=['.price','.price-current','.real-price','.tm-price','.tb-rmb-num','.jd-price','.p-price','.price_wrap','[class*=Price]','[class*=price]'];" +
                "if(platform==='jd')priceSel=['.jd-price','.price','.p-price','[class*=price]','[class*=Price]'];" +
                "if(platform==='taobao')priceSel=['.tm-price','.tb-rmb-num','.price','.real-price','[class*=price]','[class*=Price]'];" +
                "if(platform==='pdd')priceSel=['[class*=price]','[class*=Price]','.price','.goods-price'];" +
                "var title=pick(platform==='jd'?jdTitle:(platform==='taobao'?tbTitle:(platform==='pdd'?pddTitle:commonTitle)))||meta('og:title')||document.title;" +
                "var price=pick(priceSel);var body=document.body.innerText||'';if(!price||price.length>80)price=money(body)||price;" +
                "var promo=pick(['[class*=coupon]','[class*=Coupon]','[class*=promo]','[class*=Promo]','[class*=activity]','[class*=Activity]']);" +
                "if(!promo){var pm=body.match(/(?:券后|到手|满减|优惠|补贴|立减)[^\\n]{0,40}[¥￥]?[0-9]+(?:\\.[0-9]{1,2})?/);promo=pm?pm[0]:'';}" +
                "var spec=pick(['[class*=sku]','[class*=Sku]','[class*=spec]','[class*=Spec]','[class*=selected]']);" +
                "var shop=pick(['.shop-name','.seller-name','.shop-title','.mall-name','.store-name','[class*=shop]','[class*=Shop]','[class*=seller]','[class*=Seller]']);" +
                "var image=pickAttr(['meta[property=\\\"og:image\\\"]'],'content')||pickAttr(['img'],'src');" +
                "var diag={platform:platform,host:host,href:location.href,titleText:document.title,bodyLength:body.length,priceNodeCount:document.querySelectorAll('[class*=price],[class*=Price]').length,imgCount:document.images.length,sample:body.slice(0,900)};" +
                "var data={platform:platform,host:host,title:title,price:price,promoPrice:promo,spec:spec,shop:shop,image:image,url:location.href,time:new Date().toISOString(),ua:navigator.userAgent,diagnoseOnly:" + diagnoseOnly + ",diag:diag};" +
                "JiabibiBridge.onCapture(JSON.stringify(data));" +
                "})();";
    }

    private void capturePrice() { webView.evaluateJavascript(captureScript(false), null); }
    private void diagnosePage() { webView.evaluateJavascript(captureScript(true), null); }

    private JSONObject buildExportObject() {
        JSONObject out = new JSONObject();
        try {
            out.put("app", "jiabibi-real-sandbox");
            out.put("version", "v4-first-principles");
            out.put("principle", "only observed page facts from local WebView; no fake price; no cookie upload");
            out.put("lastPlatform", lastPlatform);
            out.put("lastUrl", lastUrl);
            out.put("lastPageTitle", lastPageTitle);
            out.put("lastDiag", lastDiag);
            out.put("best", bestCapture());
            out.put("captures", captures);
        } catch (Exception ignored) {}
        return out;
    }

    private void copyResult() {
        String text = "价比比读取结果\n" + renderCaptures() + "\n\n当前链接：" + lastUrl;
        copyText("jiabibi-result", text);
        updateStatus("已复制结果。\n\n" + renderCaptures());
    }

    private void copyJson() {
        String text = buildExportObject().toString();
        copyText("jiabibi-json", text);
        updateStatus("已复制完整 JSON。\n\n" + renderCaptures());
    }

    private void copyText(String label, String text) {
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) cm.setPrimaryClip(ClipData.newPlainText(label, text));
    }

    private void clearResults() {
        while (captures.length() > 0) captures.remove(0);
        lastDiag = "";
        updateStatus("已清空结果。登录态还在。\n进商品页后点读取价格。");
    }

    private void clearLoginState() {
        CookieManager cm = CookieManager.getInstance();
        cm.removeAllCookies(value -> runOnUiThread(() -> {
            webView.clearCache(true);
            webView.clearHistory();
            while (captures.length() > 0) captures.remove(0);
            lastDiag = "";
            updateStatus("已清除登录态。需要重新登录。\n输入关键词后点平台按钮继续。");
            webView.loadUrl(DEFAULT_URL);
        }));
        cm.flush();
    }

    public class Bridge {
        @JavascriptInterface
        public void onCapture(String json) {
            runOnUiThread(() -> {
                try {
                    JSONObject o = new JSONObject(json);
                    JSONObject diag = o.optJSONObject("diag");
                    lastDiag = diag == null ? "" : diag.toString();
                    boolean diagnoseOnly = o.optBoolean("diagnoseOnly", false);
                    if (!diagnoseOnly) upsertCapture(o);
                    if (diagnoseOnly) updateStatus("诊断完成。长按“复制结果”复制 JSON。\n价格节点：" + (diag == null ? "" : diag.optString("priceNodeCount")));
                    else updateStatus("读取成功：" + platformName(o.optString("platform")) + "  " + o.optString("price") + "\n继续切平台读取，最后点复制结果。");
                } catch (Exception e) {
                    updateStatus("读取失败：" + e.getMessage());
                }
            });
        }
    }
}
