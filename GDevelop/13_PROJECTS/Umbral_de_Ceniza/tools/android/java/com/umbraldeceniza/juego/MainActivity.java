package com.umbraldeceniza.juego;

import android.app.Activity;
import android.graphics.Color;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Umbral de Ceniza on Android: one full-screen activity whose WebView runs GDevelop's HTML5 export from assets/www.
 *
 * Files are served from https://appassets.androidplatform.net/ (the same scheme as AndroidX's WebViewAssetLoader) so
 * the game gets a stable https origin: XHR/fetch of the audio, the fonts and the localStorage save all work there.
 * Every other request is blocked; the game does not use the network.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final Pattern RANGE = Pattern.compile("bytes=(\\d*)-(\\d*)");

    private WebView web;
    private long lastBack;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true); // localStorage holds the saved game
        settings.setMediaPlaybackRequiresUserGesture(false); // title music starts without a first tap
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        web.setWebViewClient(new AssetClient());
        setContentView(web);
        web.requestFocus(); // key events (Back -> Esc) reach the page
        enterImmersiveMode();
        web.loadUrl(START_URL);
    }

    // ------------------------------------------------------------------ lifecycle
    // GDevelop's sound manager pauses/resumes the music on Cordova's "pause"/"resume" events (listened to after
    // "deviceready"), so this activity fires those same events.

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) {
            web.evaluateJavascript("document.dispatchEvent(new Event('pause'));window.dispatchEvent(new Event('pause'));", null);
            web.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            web.evaluateJavascript("document.dispatchEvent(new Event('resume'));window.dispatchEvent(new Event('resume'));", null);
        }
        enterImmersiveMode();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveMode();
    }

    /** Back = the game's Esc key (opens the pause menu or closes the open one); twice in a row = quit. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        long now = SystemClock.uptimeMillis();
        if (now - lastBack < 2000) {
            finish();
            return;
        }
        lastBack = now;
        if (web != null) {
            web.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ESCAPE));
            web.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ESCAPE));
        }
        Toast.makeText(this, "Pulsa atrás otra vez para salir", Toast.LENGTH_SHORT).show();
    }

    @SuppressWarnings("deprecation")
    private void enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController bars = getWindow().getInsetsController();
            if (bars != null) {
                bars.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                bars.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    // ------------------------------------------------------------------ asset server
    private class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (!HOST.equals(url.getHost())) return empty(403, "Forbidden");
            String path = url.getPath();
            if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
            String range = null;
            Map<String, String> headers = request.getRequestHeaders();
            if (headers != null) {
                for (Map.Entry<String, String> h : headers.entrySet()) {
                    if ("range".equalsIgnoreCase(h.getKey())) range = h.getValue();
                }
            }
            try {
                return serve("www" + path, range);
            } catch (IOException e) {
                return empty(404, "Not Found");
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return !HOST.equals(request.getUrl().getHost()); // never navigate away from the game
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            view.evaluateJavascript("document.dispatchEvent(new Event('deviceready'));", null);
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // If the WebView renderer dies (e.g. out of memory), restart the activity instead of crashing the app.
            if (web == view) {
                web.destroy();
                web = null;
            }
            recreate();
            return true;
        }
    }

    private WebResourceResponse serve(String path, String range) throws IOException {
        String mime = mimeType(path);
        String encoding = mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") ? "utf-8" : null;
        Map<String, String> headers = new HashMap<String, String>();
        headers.put("Cache-Control", "no-cache");
        if (range == null) {
            InputStream data = getAssets().open(path);
            return new WebResourceResponse(mime, encoding, 200, "OK", headers, data);
        }
        // Partial requests (HTML5 audio, used for the music, streams with Range).
        byte[] all = readAll(getAssets().open(path));
        long total = all.length;
        long start = 0;
        long end = total - 1;
        Matcher m = RANGE.matcher(range);
        if (m.find()) {
            if (!m.group(1).isEmpty()) {
                start = Long.parseLong(m.group(1));
                if (!m.group(2).isEmpty()) end = Math.min(Long.parseLong(m.group(2)), total - 1);
            } else if (!m.group(2).isEmpty()) {
                start = Math.max(0, total - Long.parseLong(m.group(2)));
            }
        }
        if (start > end || start >= total) {
            headers.put("Content-Range", "bytes */" + total);
            return new WebResourceResponse(mime, encoding, 416, "Range Not Satisfiable", headers, new ByteArrayInputStream(new byte[0]));
        }
        int length = (int) (end - start + 1);
        headers.put("Accept-Ranges", "bytes");
        headers.put("Content-Range", "bytes " + start + "-" + end + "/" + total);
        headers.put("Content-Length", String.valueOf(length));
        return new WebResourceResponse(mime, encoding, 206, "Partial Content", headers, new ByteArrayInputStream(all, (int) start, length));
    }

    private static WebResourceResponse empty(int status, String reason) {
        return new WebResourceResponse("text/plain", "utf-8", status, reason, new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    private static byte[] readAll(InputStream in) throws IOException {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            in.close();
        }
    }

    private static String mimeType(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".txt")) return "text/plain";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".ogg")) return "audio/ogg";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".otf")) return "font/otf";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }
}
