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

    private static final String DEFAULT_URL = "https://m.jd.com/";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(20, 18, 20, 18);

        TextView title = new TextView(this);
        title.setText("价比比 · 真实账号沙盒 v2");
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

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        Button open = makeButton("打开");
        Button capture = makeButton("读取价格");
        Button copy = makeButton("复制诊断");
        Button clear = makeButton("清登录态");
        buttons.addView(open, new LinearLayout.LayoutParams(0, -2, 1));
        buttons.addView(capture, new LinearLayout.LayoutParams(0, -2, 1));
        buttons.addView(copy, new LinearLayout.LayoutParams(0, -2, 1));
        buttons.addView(clear, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(buttons, new LinearLayout.LayoutParams(-1, -2));

        result = new TextView(this);
        result.setText("说明：账号只在本机 WebView 登录；价比比不保存账号密码、不上传 cookie。先点平台按钮或粘贴商品链接，登录后进商品页，再点读取价格。\n\nv2：多平台按钮、清登录态、复制诊断、多结果卡片、增强价格识别。");
        result.setTextSize(13);
        result.setPadding(0, 8, 0, 8);
        ScrollView resultBox = new ScrollView(this);
        resultBox.addView(result);
        root.addView(resultBox, new LinearLayout.LayoutParams(-1, 230));

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " JiabibiRealSandbox/0.2");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                lastUrl = url == null ? "" : url;
                lastPlatform = detectPlatform(lastUrl);
                runOnUiThread(() -> updateStatus("页面已加载：" + lastPlatform + "\n" + lastUrl + "\n\n登录后进入商品详情页，点“读取价格”。"));
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
        capture.setOnClickListener(v -> capturePrice());
        copy.setOnClickListener(v -> copyDiagnostics());
        clear.setOnClickListener(v -> clearLoginState());

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
                    .append("\n店铺：").append(o.optString("shop"))
                    .append("\n链接：").append(o.optString("url"))
                    .append("\n");
        }
        return sb.toString();
    }

    private void capturePrice() {
        String js = "(function(){" +
                "function text(x){return (x&&x.innerText||x&&x.textContent||'').trim().replace(/\\s+/g,' ')}" +
                "function pick(sel){for(var i=0;i<sel.length;i++){var e=document.querySelector(sel[i]);var t=text(e);if(t&&t.length>0)return t}return ''}" +
                "function meta(name){var e=document.querySelector('meta[property=\\\"'+name+'\\\"],meta[name=\\\"'+name+'\\\"]');return e?e.getAttribute('content')||'':''}" +
                "var host=location.hostname;" +
                "var title=pick(['#goods_name','.sku-name','.goods-name','.goods-title','.title','.item-title','.tb-main-title','h1'])||meta('og:title')||document.title;" +
                "var price=pick(['.price','.price-current','.real-price','.tm-price','.tb-rmb-num','.jd-price','.p-price','[class*=Price]','[class*=price]']);" +
                "var body=document.body.innerText||'';" +
                "if(!price||price.length>80){var m=body.match(/(?:到手价|券后|秒杀价|活动价|价格|¥|￥)\\s*[:：]?\\s*[¥￥]?\\s*([0-9]+(?:\\.[0-9]{1,2})?)/);price=m?m[0]:price;}" +
                "if(!price){var m2=body.match(/[¥￥]\\s*([0-9]+(?:\\.[0-9]{1,2})?)/);price=m2?m2[0]:'';}" +
                "var shop=pick(['.shop-name','.seller-name','.shop-title','.mall-name','.store-name','[class*=shop]','[class*=Shop]']);" +
                "var data={platform:host,title:title,price:price,shop:shop,url:location.href,time:new Date().toISOString(),ua:navigator.userAgent};" +
                "JiabibiBridge.onCapture(JSON.stringify(data));" +
                "})();";
        webView.evaluateJavascript(js, null);
    }

    private void copyDiagnostics() {
        String text = "价比比真实账号沙盒 v2\n当前平台：" + lastPlatform + "\n当前链接：" + lastUrl + "\n\n" + renderCaptures();
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("jiabibi-diagnostics", text));
        updateStatus("诊断信息已复制。\n\n" + text);
    }

    private void clearLoginState() {
        CookieManager cm = CookieManager.getInstance();
        cm.removeAllCookies(value -> runOnUiThread(() -> {
            webView.clearCache(true);
            webView.clearHistory();
            captures.length();
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
                    captures.put(o);
                    updateStatus("读取成功：" + o.optString("platform") + "\n价格：" + o.optString("price") + "\n\n下一步：切到另一个平台，进入同类商品页继续读取。最后点“复制诊断”。");
                } catch (Exception e) {
                    updateStatus("读取失败：" + e.getMessage() + "\n原始：" + json);
                }
            });
        }
    }
}
