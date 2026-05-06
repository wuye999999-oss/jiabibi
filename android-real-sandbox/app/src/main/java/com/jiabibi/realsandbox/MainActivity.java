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

public class MainActivity extends Activity {
    private WebView webView;
    private EditText input;
    private TextView result;
    private final JSONArray captures = new JSONArray();
    private String lastUrl = "";
    private String lastPlatform = "unknown";
    private String lastPageTitle = "";
    private String lastDiag = "";

    private static final String DEFAULT_URL = "https://m.jd.com/";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(20, 18, 20, 18);

        TextView title = new TextView(this);
        title.setText("价比比 · 真实账号沙盒 v3");
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER_VERTICAL);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        input = new EditText(this);
        input.setSingleLine(true);
        input.setHint("粘贴商品链接，或输入关键词");
        input.setText(DEFAULT_URL);
        root.addView(input, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout platformButtons = new LinearLayout(this);
        platformButtons.setOrientation(LinearLayout.HORIZONTAL);
        Button tb = makeButton("淘宝");
        Button jd = makeButton("京东");
        Button pdd = makeButton("拼多多");
        platformButtons.addView(tb, new LinearLayout.LayoutParams(0, -2, 1));
        platformButtons.addView(jd, new LinearLayout.LayoutParams(0, -2, 1));
        platformButtons.addView(pdd, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(platformButtons, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout row1 = new LinearLayout(this);
        row1.setOrientation(LinearLayout.HORIZONTAL);
        Button open = makeButton("打开");
        Button back = makeButton("返回");
        Button capture = makeButton("读取价格");
        Button quickDiag = makeButton("诊断页面");
        row1.addView(open, new LinearLayout.LayoutParams(0, -2, 1));
        row1.addView(back, new LinearLayout.LayoutParams(0, -2, 1));
        row1.addView(capture, new LinearLayout.LayoutParams(0, -2, 1));
        row1.addView(quickDiag, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(row1, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout row2 = new LinearLayout(this);
        row2.setOrientation(LinearLayout.HORIZONTAL);
        Button copy = makeButton("复制诊断");
        Button copyJson = makeButton("复制JSON");
        Button clearResults = makeButton("清结果");
        Button clearLogin = makeButton("清登录态");
        row2.addView(copy, new LinearLayout.LayoutParams(0, -2, 1));
        row2.addView(copyJson, new LinearLayout.LayoutParams(0, -2, 1));
        row2.addView(clearResults, new LinearLayout.LayoutParams(0, -2, 1));
        row2.addView(clearLogin, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(row2, new LinearLayout.LayoutParams(-1, -2));

        result = new TextView(this);
        result.setText("说明：账号只在本机 WebView 登录；价比比不保存账号密码、不上传 cookie。先点平台按钮或粘贴商品链接，登录后进商品页，再点读取价格。\n\nv3：平台专用价格选择器、规格/券后价/图片识别、页面诊断、JSON导出、返回按钮。");
        result.setTextSize(13);
        result.setPadding(0, 8, 0, 8);
        ScrollView resultBox = new ScrollView(this);
        resultBox.addView(result);
        root.addView(resultBox, new LinearLayout.LayoutParams(-1, 260));

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " JiabibiRealSandbox/0.3");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                lastUrl = url == null ? "" : url;
                lastPlatform = detectPlatform(lastUrl);
                lastPageTitle = view == null ? "" : String.valueOf(view.getTitle());
                runOnUiThread(() -> updateStatus("页面已加载：" + lastPlatform + "\n标题：" + lastPageTitle + "\n" + lastUrl + "\n\n登录后进入商品详情页，点“读取价格”。读不到时点“诊断页面”。"));
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new Bridge(), "JiabibiBridge");
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));

        setContentView(root);

        tb.setOnClickListener(v -> openPlatform("tb"));
        jd.setOnClickListener(v -> openPlatform("jd"));
        pdd.setOnClickListener(v -> openPlatform("pdd"));
        open.setOnClickListener(v -> openUrl());
        back.setOnClickListener(v -> goBack());
        capture.setOnClickListener(v -> capturePrice());
        quickDiag.setOnClickListener(v -> diagnosePage());
        copy.setOnClickListener(v -> copyDiagnostics());
        copyJson.setOnClickListener(v -> copyJson());
        clearResults.setOnClickListener(v -> clearResults());
        clearLogin.setOnClickListener(v -> clearLoginState());

        openUrl();
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
            openUrl();
            return;
        }
        if (q.length() == 0) q = "小米充电宝";
        try {
            String e = URLEncoder.encode(q, "UTF-8");
            String url;
            if ("tb".equals(platform)) {
                url = "https://s.m.taobao.com/h5?q=" + e;
            } else if ("pdd".equals(platform)) {
                url = "https://mobile.yangkeduo.com/search_result.html?search_key=" + e;
            } else {
                url = "https://m.jd.com/ware/search.action?keyword=" + e;
            }
            input.setText(url);
            openUrl();
        } catch (Exception ex) {
            updateStatus("打开平台失败：" + ex.getMessage());
        }
    }

    private void openUrl() {
        String url = input.getText().toString().trim();
        if (url.length() == 0) url = DEFAULT_URL;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            try {
                url = "https://m.jd.com/ware/search.action?keyword=" + URLEncoder.encode(url, "UTF-8");
            } catch (Exception ignored) {
                url = DEFAULT_URL;
            }
        }
        lastUrl = url;
        lastPlatform = detectPlatform(url);
        updateStatus("正在打开：" + lastPlatform + "\n" + url + "\n\n进入商品详情页并登录后，点“读取价格”。");
        webView.loadUrl(url);
    }

    private void goBack() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            updateStatus("没有可返回的页面。\n当前：" + lastUrl);
        }
    }

    private String detectPlatform(String url) {
        String u = (url == null ? "" : url).toLowerCase();
        if (u.contains("taobao") || u.contains("tmall") || u.contains("tb.cn")) return "taobao";
        if (u.contains("jd.com") || u.contains("3.cn")) return "jd";
        if (u.contains("pinduoduo") || u.contains("yangkeduo") || u.contains("pdd")) return "pdd";
        return "unknown";
    }

    private void updateStatus(String text) {
        result.setText(text + "\n\n" + renderCaptures());
    }

    private String renderCaptures() {
        if (captures.length() == 0) return "已读取结果：暂无";
        StringBuilder sb = new StringBuilder("已读取结果：\n");
        for (int i = 0; i < captures.length(); i++) {
            JSONObject o = captures.optJSONObject(i);
            if (o == null) continue;
            sb.append("\n【").append(i + 1).append("】")
                    .append(o.optString("platform"))
                    .append("\n标题：").append(o.optString("title"))
                    .append("\n价格：").append(o.optString("price"))
                    .append("\n券后/活动：").append(o.optString("promoPrice"))
                    .append("\n规格：").append(o.optString("spec"))
                    .append("\n店铺：").append(o.optString("shop"))
                    .append("\n链接：").append(o.optString("url"))
                    .append("\n");
        }
        return sb.toString();
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
                "var diag={platform:platform,host:host,href:location.href,titleText:document.title,bodyLength:body.length,priceNodeCount:document.querySelectorAll('[class*=price],[class*=Price]').length,imgCount:document.images.length,buttonCount:document.querySelectorAll('button').length,sample:body.slice(0,900)};" +
                "var data={platform:platform,host:host,title:title,price:price,promoPrice:promo,spec:spec,shop:shop,image:image,url:location.href,time:new Date().toISOString(),ua:navigator.userAgent,diagnoseOnly:" + diagnoseOnly + ",diag:diag};" +
                "JiabibiBridge.onCapture(JSON.stringify(data));" +
                "})();";
    }

    private void capturePrice() {
        webView.evaluateJavascript(captureScript(false), null);
    }

    private void diagnosePage() {
        webView.evaluateJavascript(captureScript(true), null);
    }

    private JSONObject buildExportObject() {
        JSONObject out = new JSONObject();
        try {
            out.put("app", "jiabibi-real-sandbox");
            out.put("version", "v3");
            out.put("lastPlatform", lastPlatform);
            out.put("lastUrl", lastUrl);
            out.put("lastPageTitle", lastPageTitle);
            out.put("lastDiag", lastDiag);
            out.put("captures", captures);
        } catch (Exception ignored) {}
        return out;
    }

    private void copyDiagnostics() {
        String text = "价比比真实账号沙盒 v3\n当前平台：" + lastPlatform + "\n当前标题：" + lastPageTitle + "\n当前链接：" + lastUrl + "\n\n最近诊断：\n" + lastDiag + "\n\n" + renderCaptures();
        copyText("jiabibi-diagnostics", text);
        updateStatus("诊断信息已复制。\n\n" + text);
    }

    private void copyJson() {
        String text = buildExportObject().toString();
        copyText("jiabibi-json", text);
        updateStatus("JSON 已复制。\n\n" + text);
    }

    private void copyText(String label, String text) {
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) cm.setPrimaryClip(ClipData.newPlainText(label, text));
    }

    private void clearResults() {
        while (captures.length() > 0) captures.remove(0);
        lastDiag = "";
        updateStatus("已清空读取结果。登录态未清除。\n当前页面：" + lastUrl);
    }

    private void clearLoginState() {
        CookieManager cm = CookieManager.getInstance();
        cm.removeAllCookies(value -> runOnUiThread(() -> {
            webView.clearCache(true);
            webView.clearHistory();
            while (captures.length() > 0) captures.remove(0);
            lastDiag = "";
            updateStatus("已清除本机 WebView Cookie / 缓存 / 历史。\n账号会退出，需要重新登录。");
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
                    if (!diagnoseOnly) captures.put(o);
                    if (diagnoseOnly) {
                        updateStatus("页面诊断完成：\n平台：" + o.optString("platform") + "\n价格节点数：" + (diag == null ? "" : diag.optString("priceNodeCount")) + "\n图片数：" + (diag == null ? "" : diag.optString("imgCount")) + "\n正文长度：" + (diag == null ? "" : diag.optString("bodyLength")) + "\n\n如果读不到价格，点“复制诊断”发我继续修选择器。");
                    } else {
                        updateStatus("读取成功：" + o.optString("platform") + "\n价格：" + o.optString("price") + "\n券后/活动：" + o.optString("promoPrice") + "\n规格：" + o.optString("spec") + "\n\n下一步：切到另一个平台，进入同类商品页继续读取。最后点“复制JSON”。");
                    }
                } catch (Exception e) {
                    updateStatus("读取失败：" + e.getMessage() + "\n原始：" + json);
                }
            });
        }
    }
}
