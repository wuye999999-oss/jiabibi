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
        Button dy = makeButton("抖音");
        platforms.addView(tb, new LinearLayout.LayoutParams(0, -2, 1));
        platforms.addView(jd, new LinearLayout.LayoutParams(0, -2, 1));
        platforms.addView(pdd, new LinearLayout.LayoutParams(0, -2, 1));
        platforms.addView(dy, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(platforms, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button read = makeButton("读取价格");
        Button buy = makeButton("买最低价");
        actions.addView(read, new LinearLayout.LayoutParams(0, -2, 1));
        actions.addView(buy, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(actions, new LinearLayout.LayoutParams(-1, -2));

        result = new TextView(this);
        result.setText("四平台：淘宝/京东/拼多多/抖音 → 进商品页 → 读取价格。\n自动算单位价(¥/kg、¥/L…)，显示运费，四平台对比。\n长按：标题=清登录态；读取价格=诊断；买最低价=复制JSON；结果区=清空。\n");
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
        s.setUserAgentString(s.getUserAgentString() + " JiabibiRealSandbox/0.5");
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
        dy.setOnClickListener(v -> openPlatform("douyin"));
        read.setOnClickListener(v -> capturePrice());
        read.setOnLongClickListener(v -> { diagnosePage(); return true; });
        buy.setOnClickListener(v -> openBestForBuy());
        buy.setOnLongClickListener(v -> { copyJson(); return true; });

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
            else if ("douyin".equals(platform)) url = "https://haohuo.jinritemai.com/views/product/list?search_text=" + e;
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
        if (u.contains("douyin") || u.contains("jinritemai") || u.contains("tiktok")) return "douyin";
        return "unknown";
    }

    private String platformName(String p) {
        if ("taobao".equals(p)) return "淘宝";
        if ("jd".equals(p)) return "京东";
        if ("pdd".equals(p)) return "拼多多";
        if ("douyin".equals(p)) return "抖音";
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
        boolean byUnit = commonUnitKind().length() > 0;
        StringBuilder sb = new StringBuilder();
        if (best != null) {
            sb.append(byUnit ? "最便宜（按单位价）：" : "最便宜：").append(platformName(best.optString("platform")))
                    .append("  ¥").append(formatPrice(best.optDouble("priceNumber", 0)));
            String bu = best.optString("unitText");
            if (bu.length() > 0) sb.append("（").append(bu).append("）");
            sb.append("\n点“买最低价”回到这个商品页。")
                    .append("\n").append(shortText(best.optString("title"), 58));
        }
        if (captures.length() > 1 && !byUnit) {
            sb.append("\n注意：各平台规格不一致，下面按标价排序，请自行核对单位价。");
        }
        sb.append("\n\n已读取 ").append(captures.length()).append(" 个平台：");
        for (int i = 0; i < captures.length(); i++) {
            JSONObject o = captures.optJSONObject(i);
            if (o == null) continue;
            double n = o.optDouble("priceNumber", 0);
            sb.append("\n").append(i + 1).append(". ").append(platformName(o.optString("platform")))
                    .append("  ").append(n > 0 ? "¥" + formatPrice(n) : shortText(o.optString("price"), 28));
            String unit = o.optString("unitText");
            if (unit.length() > 0) sb.append("\n   单价：").append(unit);
            String ship = o.optString("ship");
            if (ship.length() > 0) sb.append("\n   运费：").append(shortText(ship, 30));
            String promo = o.optString("promoPrice");
            if (promo.length() > 0) sb.append("\n   活动：").append(shortText(promo, 42));
            sb.append("\n   ").append(shortText(o.optString("title"), 56));
        }
        return sb.toString();
    }

    private JSONObject bestCapture() {
        // 铁律5: rank by unit price when every capture shares the same unit; otherwise
        // by sticker price (an honest fallback — the UI tells the user to check specs).
        boolean byUnit = commonUnitKind().length() > 0;
        JSONObject best = null;
        double bestVal = Double.MAX_VALUE;
        for (int i = 0; i < captures.length(); i++) {
            JSONObject o = captures.optJSONObject(i);
            if (o == null) continue;
            double v = byUnit ? o.optDouble("unitValue", 0) : o.optDouble("priceNumber", 0);
            if (v > 0 && v < bestVal) {
                bestVal = v;
                best = o;
            }
        }
        return best;
    }

    private void openBestForBuy() {
        JSONObject best = bestCapture();
        if (best == null) {
            updateStatus("还没有最低价。先进入商品页点“读取价格”，至少读取一个平台。");
            return;
        }
        String url = best.optString("url");
        if (url == null || url.length() == 0) {
            updateStatus("最低价没有商品链接。请重新读取当前商品页。");
            return;
        }
        String unitT = best.optString("unitText");
        String unitLine = unitT.length() > 0 ? "（" + unitT + "）\n" : "";
        updateStatus("正在打开最低价：" + platformName(best.optString("platform")) + "  ¥" + formatPrice(best.optDouble("priceNumber", 0)) + "\n" + unitLine + "用户确认后在平台内自己下单。");
        openUrl(url);
    }

    private String formatPrice(double n) {
        if (Math.abs(n - Math.round(n)) < 0.001) return String.valueOf((long)Math.round(n));
        return String.format(java.util.Locale.US, "%.2f", n);
    }

    // 铁律5: cross-platform comparison must use unit price, not the sticker price.
    // Parses weight / volume / capacity / count from the title+spec and computes ¥ per standard unit.
    private void applyUnitPrice(JSONObject o, double price) {
        double unitValue = 0;
        String unitText = "", unitKind = "";
        if (price > 0) {
            String t = (o.optString("title") + " " + o.optString("spec")).toLowerCase().replaceAll("\\s+", "");
            Matcher m;
            m = Pattern.compile("([0-9]+(?:\\.[0-9]+)?)(kg|千克|斤|g|克)(?:[*x×]([0-9]+))?").matcher(t);
            if (m.find()) {
                double w = Double.parseDouble(m.group(1));
                String u = m.group(2);
                if (u.equals("斤")) w *= 0.5;
                else if (u.equals("g") || u.equals("克")) w /= 1000;
                if (m.group(3) != null) w *= Integer.parseInt(m.group(3));
                if (w > 0) { unitValue = price / w; unitKind = "kg"; unitText = formatPrice(w) + "kg｜¥" + formatPrice(unitValue) + "/kg"; }
            }
            if (unitValue == 0) {
                m = Pattern.compile("([0-9]+(?:\\.[0-9]+)?)(ml|毫升|l|升)(?:[*x×]([0-9]+))?").matcher(t);
                if (m.find()) {
                    double ml = Double.parseDouble(m.group(1));
                    String u = m.group(2);
                    if (u.equals("l") || u.equals("升")) ml *= 1000;
                    int c = m.group(3) != null ? Integer.parseInt(m.group(3)) : 1;
                    double total = ml * c;
                    if (total > 0) { unitValue = price / (total / 1000); unitKind = "L"; unitText = (long) ml + "ml×" + c + "｜¥" + formatPrice(unitValue) + "/L"; }
                }
            }
            if (unitValue == 0) {
                m = Pattern.compile("([0-9]{4,6})(mah|毫安)").matcher(t);
                if (m.find()) {
                    double cap = Double.parseDouble(m.group(1));
                    if (cap > 0) { unitValue = price / (cap / 10000); unitKind = "万mAh"; unitText = (long) cap + "mAh｜¥" + formatPrice(unitValue) + "/万mAh"; }
                }
            }
            if (unitValue == 0) {
                m = Pattern.compile("([0-9]+)(件|包|袋|瓶|抽|卷|片|个|支|盒|双|条)(?:[*x×]([0-9]+))?").matcher(t);
                if (m.find()) {
                    double cnt = Double.parseDouble(m.group(1));
                    if (m.group(3) != null) cnt *= Integer.parseInt(m.group(3));
                    if (cnt > 1) { unitValue = price / cnt; unitKind = m.group(2); unitText = (long) cnt + m.group(2) + "｜¥" + formatPrice(unitValue) + "/" + m.group(2); }
                }
            }
        }
        try {
            o.put("unitValue", unitValue);
            o.put("unitText", unitText);
            o.put("unitKind", unitKind);
        } catch (Exception ignored) {}
    }

    // Empty unless every capture shares the same valid unit kind — comparing ¥/kg
    // against ¥/件 would be meaningless.
    private String commonUnitKind() {
        if (captures.length() == 0) return "";
        String k0 = null;
        for (int i = 0; i < captures.length(); i++) {
            JSONObject o = captures.optJSONObject(i);
            if (o == null) return "";
            String k = o.optString("unitKind");
            if (k.length() == 0 || o.optDouble("unitValue", 0) <= 0) return "";
            if (k0 == null) k0 = k;
            else if (!k0.equals(k)) return "";
        }
        return k0 == null ? "" : k0;
    }

    private double extractMoney(String text) {
        if (text == null) return 0;
        // Drop installment noise ("¥25/期", "12期") so it can't masquerade as the price.
        String cleaned = text.replaceAll("[¥￥]?\\s*[0-9]+(?:\\.[0-9]{1,2})?\\s*(?:元)?\\s*(?:/\\s*期|/\\s*月|期免息|期)", " ");
        // Prefer ¥/￥-prefixed amounts — a bare "满300减50" then yields nothing.
        Matcher pm = Pattern.compile("[¥￥]\\s*([0-9]+(?:\\.[0-9]{1,2})?)").matcher(cleaned);
        double best = Double.MAX_VALUE;
        while (pm.find()) {
            try {
                double v = Double.parseDouble(pm.group(1));
                if (v > 0.01 && v < best) best = v;
            } catch (Exception ignored) {}
        }
        if (best != Double.MAX_VALUE) return best;
        // No ¥-prefixed amount — fall back to the lowest bare number.
        Matcher m = Pattern.compile("([0-9]+(?:\\.[0-9]{1,2})?)").matcher(cleaned);
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
        double promoPrice = extractMoney(o.optString("promoPrice"));
        double listPrice = extractMoney(o.optString("price"));
        // Trust the promo price only when it's a plausible final price: not above
        // the list price, and not implausibly low (a leftover discount amount).
        double priceNumber;
        if (promoPrice > 0 && (listPrice <= 0 || (promoPrice <= listPrice && promoPrice >= listPrice * 0.2))) {
            priceNumber = promoPrice;
        } else {
            priceNumber = listPrice > 0 ? listPrice : promoPrice;
        }
        try { o.put("priceNumber", priceNumber); } catch (Exception ignored) {}
        applyUnitPrice(o, priceNumber);
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
                "var dyTitle=['[class*=title]','[class*=goods-name]','[class*=productName]','[class*=product-name]','h1'];" +
                "var priceSel=['.price','.price-current','.real-price','.tm-price','.tb-rmb-num','.jd-price','.p-price','.price_wrap','[class*=Price]','[class*=price]'];" +
                "if(platform==='jd')priceSel=['.jd-price','.price','.p-price','[class*=price]','[class*=Price]'];" +
                "if(platform==='taobao')priceSel=['.tm-price','.tb-rmb-num','.price','.real-price','[class*=price]','[class*=Price]'];" +
                "if(platform==='pdd')priceSel=['[class*=price]','[class*=Price]','.price','.goods-price'];" +
                "if(platform==='douyin')priceSel=['[class*=price]','[class*=Price]','[class*=amount]','[class*=Amount]','.price'];" +
                "var title=pick(platform==='jd'?jdTitle:(platform==='taobao'?tbTitle:(platform==='pdd'?pddTitle:(platform==='douyin'?dyTitle:commonTitle))))||meta('og:title')||document.title;" +
                "var price=pick(priceSel);var body=document.body.innerText||'';if(!price||price.length>80)price=money(body)||price;" +
                "var promo=pick(['[class*=coupon]','[class*=Coupon]','[class*=promo]','[class*=Promo]','[class*=activity]','[class*=Activity]']);" +
                // Only trust 券后价/到手价/秒杀价 — these precede a real FINAL price.
                // 满减/立减/优惠 describe discount *rules* ("满300减50"), not a final price.
                "if(!promo){var pm=body.match(/(?:券后价?|到手价?|秒杀价)\\s*[:：]?\\s*[¥￥]?\\s*[0-9]+(?:\\.[0-9]{1,2})?/);promo=pm?pm[0]:'';}" +
                "var spec=pick(['[class*=sku]','[class*=Sku]','[class*=spec]','[class*=Spec]','[class*=selected]']);" +
                "var shop=pick(['.shop-name','.seller-name','.shop-title','.mall-name','.store-name','[class*=shop]','[class*=Shop]','[class*=seller]','[class*=Seller]']);" +
                "var image=pickAttr(['meta[property=\\\"og:image\\\"]'],'content')||pickAttr(['img'],'src');" +
                // 铁律5: shipping is a hidden cost — capture it so the user sees the real total.
                "var ship='';try{var sm=body.match(/包邮|免运费|运费\\s*[¥￥]?\\s*[0-9]+(?:\\.[0-9]{1,2})?|快递\\s*[¥￥]?\\s*[0-9]+(?:\\.[0-9]{1,2})?|不包邮|偏远地区/);ship=sm?sm[0]:'';}catch(err){}" +
                "var diag={platform:platform,host:host,href:location.href,titleText:document.title,bodyLength:body.length,priceNodeCount:document.querySelectorAll('[class*=price],[class*=Price]').length,imgCount:document.images.length,sample:body.slice(0,900)};" +
                "var data={platform:platform,host:host,title:title,price:price,promoPrice:promo,spec:spec,shop:shop,image:image,ship:ship,url:location.href,time:new Date().toISOString(),ua:navigator.userAgent,diagnoseOnly:" + diagnoseOnly + ",diag:diag};" +
                "JiabibiBridge.onCapture(JSON.stringify(data));" +
                "})();";
    }

    private void capturePrice() { webView.evaluateJavascript(captureScript(false), null); }
    private void diagnosePage() { webView.evaluateJavascript(captureScript(true), null); }

    private JSONObject buildExportObject() {
        JSONObject out = new JSONObject();
        try {
            out.put("app", "jiabibi-real-sandbox");
            out.put("version", "v7-douyin");
            out.put("principle", "user wants the cheapest real observed UNIT price (¥/unit + shipping) and a direct path to buy; local WebView only; no fake price; no cookie upload");
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
                    if (diagnoseOnly) updateStatus(“诊断完成。长按”买最低价”复制 JSON。\n价格节点：” + (diag == null ? “” : diag.optString(“priceNodeCount”)));
                    else {
                        String unitT = o.optString(“unitText”);
                        String ship = o.optString(“ship”);
                        String extra = (unitT.length() > 0 ? “\n单价：” + unitT : “”)
                                     + (ship.length() > 0 ? “\n运费：” + ship : “”);
                        updateStatus(“读取成功：” + platformName(o.optString(“platform”)) + “  “ + o.optString(“price”) + extra + “\n继续切平台读取，最后点买最低价。”);
                    }
                } catch (Exception e) {
                    updateStatus("读取失败：" + e.getMessage());
                }
            });
        }
    }
}
