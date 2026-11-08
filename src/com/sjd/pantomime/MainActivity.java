package com.sjd.pantomime;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.app.AlertDialog;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingJson;
    private final java.util.concurrent.ExecutorService musicWorker = java.util.concurrent.Executors.newFixedThreadPool(4);
    private volatile boolean destroyed = false;
    private static final int PICK_JSON = 41, SAVE_JSON = 42;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(9,35,29));
        getWindow().setNavigationBarColor(Color.rgb(12,38,31));
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(9,35,29));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
                @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets windowInsets) {
                    Insets system = windowInsets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                    Insets keyboard = windowInsets.getInsets(WindowInsets.Type.ime());
                    view.setPadding(system.left, system.top, system.right, Math.max(system.bottom, keyboard.bottom));
                    return windowInsets;
                }
            });
        } else { root.setFitsSystemWindows(true); }
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9,35,29));
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);
        webView.setKeepScreenOn(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !url.startsWith("file:///android_asset/game/");
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("بله", (dialog, which) -> result.confirm())
                    .setNegativeButton("نه", (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel()).show();
                return true;
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
                try { startActivityForResult(intent, PICK_JSON); }
                catch (Exception e) { callback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        webView.addJavascriptInterface(new SaveBridge(), "AndroidBridge");
        root.addView(webView, new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        root.requestApplyInsets();
        String game = getIntent().getStringExtra("game");
        String fragment = game != null && game.matches("pant|music|mafia|spy|lip|names") ? "#" + game : "";
        webView.loadUrl("file:///android_asset/game/index.html" + fragment);
    }
    public class SaveBridge {
        @JavascriptInterface public String forestSky(){ return getSharedPreferences("forest",0).getString("sky","forest"); }
        @JavascriptInterface public boolean forestNight(){ return getSharedPreferences("forest",0).getBoolean("night",false); }
        @JavascriptInterface public void musicCatalog(final int requestId, final String artist) {
            if (destroyed || artist == null || artist.length() > 80 || requestId < 1) return;
            musicWorker.execute(() -> {
                java.net.HttpURLConnection connection = null;
                String result = ""; boolean ok = false;
                try {
                    String query = java.net.URLEncoder.encode("\"" + artist + "\"", "UTF-8");
                    java.net.URL url = new java.net.URL("https://musicetu.com/wp-json/wp/v2/posts?per_page=50&search=" + query + "&search_columns%5B%5D=post_title&_fields=id,title,content,link");
                    connection = (java.net.HttpURLConnection) url.openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(12000); connection.setReadTimeout(18000);
                    connection.setRequestProperty("Accept", "application/json");
                    connection.setRequestProperty("User-Agent", "sjd game/1.12 Android");
                    connection.setUseCaches(false);
                    if (connection.getResponseCode() != 200) throw new java.io.IOException();
                    try (java.io.InputStream input = connection.getInputStream(); java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream()) {
                        byte[] buffer = new byte[8192]; int count;
                        while ((count = input.read(buffer)) != -1) {
                            if (destroyed || bytes.size() + count > 4000000) throw new java.io.IOException();
                            bytes.write(buffer, 0, count);
                        }
                        result = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
                        new org.json.JSONArray(result); ok = true;
                    }
                } catch (Exception ignored) { result = ""; }
                finally { if (connection != null) connection.disconnect(); }
                final String payload = result; final boolean success = ok;
                runOnUiThread(() -> { if (!destroyed && webView != null) webView.evaluateJavascript(
                    "window.onMusicCatalog && window.onMusicCatalog(" + requestId + "," + success + "," + org.json.JSONObject.quote(payload) + ")", null); });
            });
        }
        @JavascriptInterface public void saveJson(final String text, final String filename) {
            if (text == null || text.length() > 20000000) return;
            runOnUiThread(() -> {
                if (pendingJson != null) return;
                pendingJson = text;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, filename.equals("SJD-Game-All-Cards.json") ? filename : "SJD-Game-My-Cards.json");
                try { startActivityForResult(intent, SAVE_JSON); }
                catch (Exception e) { pendingJson = null; Toast.makeText(MainActivity.this,"ذخیره فایل در دسترس نیست",Toast.LENGTH_LONG).show(); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request,result,data);
        if (request == PICK_JSON && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        }
        if (request == SAVE_JSON) {
            if (result == RESULT_OK && data != null && data.getData() != null && pendingJson != null) {
                try (OutputStream stream = getContentResolver().openOutputStream(data.getData())) {
                    if (stream == null) throw new java.io.IOException();
                    stream.write(pendingJson.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this,"فایل ذخیره شد",Toast.LENGTH_SHORT).show();
                } catch (Exception e) { Toast.makeText(this,"ذخیره فایل انجام نشد",Toast.LENGTH_LONG).show(); }
            }
            pendingJson = null;
        }
    }
    @Override public void onBackPressed() {
        if (webView == null) { super.onBackPressed(); return; }
        webView.evaluateJavascript("window.appBack ? window.appBack() : false", value -> {
            if (!"true".equals(value)) finish();
        });
    }
    @Override protected void onPause() {
        if (webView != null) { webView.evaluateJavascript("if(typeof pauseMusic==='function')pauseMusic();if(typeof pauseExtra==='function')pauseExtra()", null); webView.onPause(); }
        super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }
    @Override protected void onDestroy() {
        destroyed = true; musicWorker.shutdownNow();
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (webView != null) { webView.removeJavascriptInterface("AndroidBridge"); webView.destroy(); }
        super.onDestroy();
    }
}
