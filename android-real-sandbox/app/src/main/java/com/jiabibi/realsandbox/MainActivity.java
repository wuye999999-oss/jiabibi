package com.jiabibi.realsandbox;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
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

import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView webView;
    private EditText input;
    private TextView result;

    private static final String DEFAULT_URL = "https://m.jd.com/";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(20, 18, 20, 18);

        TextView title = new TextView(this);
        title.setText("价比比 · 真实账号沙盒 v1");
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER_VERTICAL);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        input = new EditText(this);
        input.setSingleLine(true);
        input.setHint("粘贴淘宝 / 京东 / 拼多多商品链接");
        input.setText(DEFAULT_URL);
        root.addView(input, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);

        Button open = new Button(this);
        open.setText("打开");
        buttons.addView(open, new LinearLayout.LayoutParams(0, -2, 1));

        Button capture = new Button(this);
        capture.setText("读取价格");
        buttons.addView(capture, new LinearLayout.LayoutParams(0, -2, 1));

        Button loginTip = new Button(this);
        loginTip.setText("登录说明");
        buttons.addView(loginTip, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(buttons, new LinearLayout.LayoutParams(-1, -2));

        result = new TextView(this);
        result.setText("说明：账号只在本机 WebView 登录；价比比不保存账号密码、不上传 cookie。打开平台页面后，用户自己登录，再点读取价格。");
        result.setTextSize(13);
        result.setPadding(0, 8, 0, 8);
        ScrollView resultBox = new ScrollView(this);
        resultBox.addView(result);
        root.addView(resultBox, new LinearLayout.LayoutParams(-1, 190));

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setUserAgentString(s.getUserAgentString() + " JiabibiRealSandbox/0.1");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new Bridge(), "JiabibiBridge");
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));

        setContentView(root);

        open.setOnClickListener(v -> openUrl());
        capture.setOnClickListener(v -> capturePrice());
        loginTip.setOnClickListener(v -> result.setText("登录说明：\n1. 在下方网页里正常登录淘宝/京东/拼多多。\n2. 登录态只保存在本机 WebView。\n3. 不要把账号密码发给任何人。\n4. 进入商品页后点“读取价格”。"));

        openUrl();
    }

    private void openUrl() {
        String url = input.getText().toString().trim();
        if (url.length() == 0) url = DEFAULT_URL;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://m.jd.com/ware/search.action?keyword=" + url;
        }
        result.setText("正在打开：\n" + url + "\n\n进入商品详情页并登录后，点“读取价格”。");
        webView.loadUrl(url);
    }

    private void capturePrice() {
        String js = "(function(){" +
                "function text(x){return (x&&x.innerText||x&&x.textContent||'').trim()}" +
                "function pick(sel){for(var i=0;i<sel.length;i++){var e=document.querySelector(sel[i]);var t=text(e);if(t)return t}return ''}" +
                "var title=pick(['.sku-name','.goods-name','.title','.item-title','h1','title']);" +
                "var price=pick(['.price','.price-current','.real-price','.tm-price','.tb-rmb-num','.jd-price','[class*=price]']);" +
                "if(!price){var body=document.body.innerText||'';var m=body.match(/[¥￥]\\s*([0-9]+(?:\\.[0-9]{1,2})?)/);price=m?m[0]:'';}" +
                "var shop=pick(['.shop-name','.seller-name','.shop-title','[class*=shop]']);" +
                "var data={platform:location.hostname,title:title,price:price,shop:shop,url:location.href,time:new Date().toISOString()};" +
                "JiabibiBridge.onCapture(JSON.stringify(data));" +
                "})();";
        webView.evaluateJavascript(js, null);
    }

    public class Bridge {
        @JavascriptInterface
        public void onCapture(String json) {
            runOnUiThread(() -> {
                try {
                    JSONObject o = new JSONObject(json);
                    result.setText("读取结果：\n平台：" + o.optString("platform") +
                            "\n标题：" + o.optString("title") +
                            "\n价格：" + o.optString("price") +
                            "\n店铺：" + o.optString("shop") +
                            "\n链接：" + o.optString("url") +
                            "\n\n下一步：把多个平台读取结果汇总到价比比结果页做比较。");
                } catch (Exception e) {
                    result.setText("读取失败：" + e.getMessage() + "\n原始：" + json);
                }
            });
        }
    }
}
