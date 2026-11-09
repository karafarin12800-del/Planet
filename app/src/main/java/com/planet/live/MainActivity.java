package com.planet.live;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import org.json.JSONObject;

import java.security.SecureRandom;
import java.util.concurrent.Executor;

import ir.cafebazaar.poolakey.Connection;
import ir.cafebazaar.poolakey.Payment;
import ir.cafebazaar.poolakey.config.PaymentConfiguration;
import ir.cafebazaar.poolakey.config.SecurityCheck;
import ir.cafebazaar.poolakey.request.PurchaseRequest;
import ir.cafebazaar.poolakey.entity.PurchaseInfo;
import kotlin.Unit;

public final class MainActivity extends ComponentActivity {
    private static final int FILE_CHOOSER_REQUEST = 7301;
    private static final String BILLING_PREFS = "planet_billing_private";
    private static final String PENDING_TOKEN_KEY = "pending_purchase_token";
    private static final String PENDING_PRODUCT_KEY = "pending_purchase_product";
    private static final String PENDING_VIP_TOKEN_KEY = "pending_vip_subscription_token";
    private static final String VIP_PRODUCT_ID = "planet_vip_60d";

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private CredentialManager credentialManager;
    private Payment payment;
    private Connection paymentConnection;
    private volatile boolean bazaarConnected;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(5, 11, 23));
        getWindow().setNavigationBarColor(Color.rgb(5, 11, 23));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(5, 11, 23));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !"appassets.androidplatform.net".equals(uri.getHost());
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = filePathCallback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (ActivityNotFoundException ex) {
                    fileChooserCallback = null;
                    filePathCallback.onReceiveValue(null);
                    showFileChooserUnavailableToast();
                }
                return true;
            }
        });

        credentialManager = CredentialManager.create(this);
        webView.addJavascriptInterface(new AndroidCommerceBridge(), "AndroidCommerceBridge");
        setContentView(webView);
        initializeBazaar();
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    private void initializeBazaar() {
        String rsaKey = BuildConfig.PLANET_BAZAAR_RSA_PUBLIC_KEY == null
                ? "" : BuildConfig.PLANET_BAZAAR_RSA_PUBLIC_KEY.trim();
        if (rsaKey.isEmpty()) return;

        try {
            PaymentConfiguration configuration =
                    new PaymentConfiguration(new SecurityCheck.Enable(rsaKey), true);
            payment = new Payment(this, configuration);
            paymentConnection = payment.connect(callback -> {
                callback.connectionSucceed(() -> {
                    bazaarConnected = true;
                    callJs("onBazaarReady", "");
                    restoreVipSubscription();
                    return Unit.INSTANCE;
                });
                callback.connectionFailed(error -> {
                    bazaarConnected = false;
                    callJs("handleBazaarNativeError", safeMessage(error));
                    return Unit.INSTANCE;
                });
                callback.disconnected(() -> {
                    bazaarConnected = false;
                    callJs("handleBazaarNativeError", "ارتباط با سرویس پرداخت کافه‌بازار قطع شد.");
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            });
        } catch (RuntimeException error) {
            bazaarConnected = false;
            callJs("handleBazaarNativeError", "راه‌اندازی پرداخت کافه‌بازار انجام نشد.");
        }
    }

    private void restoreVipSubscription() {
        if (payment == null || !bazaarConnected) return;
        payment.getSubscribedProducts(callback -> {
            callback.querySucceed(purchases -> {
                for (PurchaseInfo purchase : purchases) {
                    if (VIP_PRODUCT_ID.equals(purchase.getProductId())
                            && purchase.getPurchaseToken() != null
                            && !purchase.getPurchaseToken().trim().isEmpty()) {
                        String token = purchase.getPurchaseToken();
                        billingPrefs().edit().putString(PENDING_VIP_TOKEN_KEY, token).apply();
                        callJs("handleBazaarVipPurchaseToken", token);
                        break;
                    }
                }
                return Unit.INSTANCE;
            });
            callback.queryFailed(error -> {
                callJs("handleBazaarStatus", "بازیابی وضعیت اشتراک VIP از کافه‌بازار انجام نشد؛ بعداً دوباره تلاش کن.");
                return Unit.INSTANCE;
            });
            return Unit.INSTANCE;
        });
    }

    private void startGoogleSignIn() {
        String clientId = BuildConfig.PLANET_GOOGLE_WEB_CLIENT_ID == null
                ? "" : BuildConfig.PLANET_GOOGLE_WEB_CLIENT_ID.trim();
        if (clientId.isEmpty()) {
            callJs("handleGoogleError", "شناسهٔ OAuth ورود Google در تنظیمات ساخت برنامه ثبت نشده است.");
            return;
        }

        String nonce = newNonce();
        GetSignInWithGoogleOption option =
                new GetSignInWithGoogleOption.Builder(clientId).setNonce(nonce).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(option)
                .build();
        Executor mainExecutor = command -> runOnUiThread(command);

        credentialManager.getCredentialAsync(
                this,
                request,
                null,
                mainExecutor,
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        Credential credential = response.getCredential();
                        if (!(credential instanceof CustomCredential)
                                || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                                .equals(credential.getType())) {
                            callJs("handleGoogleError", "پاسخ ورود Google قابل شناسایی نیست.");
                            return;
                        }
                        try {
                            GoogleIdTokenCredential google =
                                    GoogleIdTokenCredential.createFrom(
                                            ((CustomCredential) credential).getData());
                            callJs("handleGoogleIdToken", google.getIdToken(), nonce);
                        } catch (RuntimeException error) {
                            callJs("handleGoogleError", "خواندن پاسخ امن Google ناموفق بود.");
                        }
                    }

                    @Override
                    public void onError(GetCredentialException error) {
                        callJs("handleGoogleError", "ورود Google کامل نشد؛ می‌توانی با ایمیل وارد شوی.");
                    }
                });
    }

    private String newNonce() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.encodeToString(
                bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private void startBazaarPurchase(String productId) {
        if (!("planet_tokens_200".equals(productId) || "planet_tokens_500".equals(productId)
                || "planet_tokens_1000".equals(productId))) {
            callJs("handleBazaarNativeError", "بستهٔ توکن انتخاب‌شده معتبر نیست.");
            return;
        }
        if (payment == null || paymentConnection == null || !bazaarConnected) {
            callJs("handleBazaarNativeError",
                    "سرویس پرداخت آماده نیست؛ نصب بودن کافه‌بازار و تنظیم کلید عمومی را بررسی کن.");
            return;
        }

        PurchaseRequest request = new PurchaseRequest(productId, productId, null);
        payment.purchaseProduct(getActivityResultRegistry(), request, callback -> {
            callback.purchaseFlowBegan(() -> {
                callJs("handleBazaarStatus", "در انتظار تأیید خرید در کافه‌بازار…");
                return Unit.INSTANCE;
            });
            callback.failedToBeginFlow(error -> {
                callJs("handleBazaarNativeError", safeMessage(error));
                return Unit.INSTANCE;
            });
            callback.purchaseSucceed(purchase -> {
                String token = purchase.getPurchaseToken();
                if (token == null || token.trim().isEmpty()) {
                    callJs("handleBazaarNativeError", "رسید خرید فاقد شناسهٔ معتبر است.");
                    return Unit.INSTANCE;
                }
                // Persist before any network call. Do not consume until the Worker verifies it.
                billingPrefs().edit().putString(PENDING_TOKEN_KEY, token)
                        .putString(PENDING_PRODUCT_KEY, productId).apply();
                callJs("handleBazaarPurchaseToken", token, productId);
                return Unit.INSTANCE;
            });
            callback.purchaseCanceled(() -> {
                callJs("handleBazaarStatus", "خرید لغو شد؛ مبلغی به کیف پول اضافه نشد.");
                return Unit.INSTANCE;
            });
            callback.purchaseFailed(error -> {
                callJs("handleBazaarNativeError", safeMessage(error));
                return Unit.INSTANCE;
            });
            return Unit.INSTANCE;
        });
    }

    private void startBazaarVipSubscription() {
        if (payment == null || paymentConnection == null || !bazaarConnected) {
            callJs("handleBazaarNativeError", "سرویس پرداخت آماده نیست؛ اتصال کافه‌بازار را بررسی کن.");
            return;
        }
        PurchaseRequest request = new PurchaseRequest(VIP_PRODUCT_ID, VIP_PRODUCT_ID, null);
        payment.subscribeProduct(getActivityResultRegistry(), request, callback -> {
            callback.purchaseFlowBegan(() -> {
                callJs("handleBazaarStatus", "در انتظار تأیید اشتراک VIP در کافه‌بازار…");
                return Unit.INSTANCE;
            });
            callback.failedToBeginFlow(error -> {
                callJs("handleBazaarNativeError", safeMessage(error));
                return Unit.INSTANCE;
            });
            callback.purchaseSucceed(purchase -> {
                String token = purchase.getPurchaseToken();
                if (token == null || token.trim().isEmpty()) {
                    callJs("handleBazaarNativeError", "رسید اشتراک فاقد شناسهٔ معتبر است.");
                    return Unit.INSTANCE;
                }
                billingPrefs().edit().putString(PENDING_VIP_TOKEN_KEY, token).apply();
                callJs("handleBazaarVipPurchaseToken", token);
                return Unit.INSTANCE;
            });
            callback.purchaseCanceled(() -> {
                callJs("handleBazaarStatus", "خرید اشتراک VIP لغو شد.");
                return Unit.INSTANCE;
            });
            callback.purchaseFailed(error -> {
                callJs("handleBazaarNativeError", safeMessage(error));
                return Unit.INSTANCE;
            });
            return Unit.INSTANCE;
        });
    }

    private void consumeVerifiedPurchase(String token, String productId) {
        String pending = pendingPurchaseToken();
        String pendingProduct = billingPrefs().getString(PENDING_PRODUCT_KEY, "planet_tokens_200");
        if (token == null || token.isEmpty() || !token.equals(pending) || !productId.equals(pendingProduct)) {
            callJs("handleBazaarNativeError", "رسید تأییدشده با رسید ذخیره‌شده مطابقت ندارد.");
            return;
        }
        if (payment == null || !bazaarConnected) {
            callJs("handleBazaarNativeError", "رسید محفوظ ماند؛ پس از اتصال دوباره نهایی‌سازی می‌شود.");
            return;
        }

        payment.consumeProduct(token, callback -> {
            callback.consumeSucceed(() -> {
                billingPrefs().edit().remove(PENDING_TOKEN_KEY).remove(PENDING_PRODUCT_KEY).apply();
                callJs("onBazaarConsumed", productId);
                return Unit.INSTANCE;
            });
            callback.consumeFailed(error -> {
                callJs("handleBazaarNativeError",
                        "توکن‌ها در سرور تأیید شدند، اما نهایی‌سازی رسید کامل نشد؛ دوباره تلاش کن.");
                return Unit.INSTANCE;
            });
            return Unit.INSTANCE;
        });
    }

    private SharedPreferences billingPrefs() {
        return getSharedPreferences(BILLING_PREFS, MODE_PRIVATE);
    }

    private String pendingPurchaseToken() {
        return billingPrefs().getString(PENDING_TOKEN_KEY, "");
    }

    private String safeMessage(Throwable error) {
        return error == null || error.getMessage() == null
                ? "عملیات کافه‌بازار کامل نشد." : error.getMessage();
    }

    private void callJs(String method, String value) {
        callJs(method, value, null);
    }

    private void callJs(String method, String first, String second) {
        WebView target = webView;
        if (target == null) return;
        String args = JSONObject.quote(first == null ? "" : first);
        if (second != null) args += "," + JSONObject.quote(second);
        String script = "if(window.PlanetCommerceUI&&window.PlanetCommerceUI."
                + method + "){window.PlanetCommerceUI." + method + "(" + args + ");}";
        target.post(() -> {
            if (webView != null) webView.evaluateJavascript(script, null);
        });
    }

    private void showFileChooserUnavailableToast() {
        if (webView == null) {
            Toast.makeText(this, "فایل‌گزین در دسترس نیست", Toast.LENGTH_LONG).show();
            return;
        }
        webView.evaluateJavascript("(document.documentElement.lang || 'fa')", value -> {
            boolean english = "\"en\"".equals(value) || "en".equals(value);
            String message = english ? "File picker is unavailable" : "فایل‌گزین در دسترس نیست";
            Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show();
        });
    }

    private final class AndroidCommerceBridge {
        @JavascriptInterface
        public boolean isGoogleConfigured() {
            return !BuildConfig.PLANET_GOOGLE_WEB_CLIENT_ID.trim().isEmpty();
        }

        @JavascriptInterface
        public boolean isBazaarConfigured() {
            return !BuildConfig.PLANET_BAZAAR_RSA_PUBLIC_KEY.trim().isEmpty();
        }

        @JavascriptInterface
        public void startGoogleSignIn() {
            runOnUiThread(MainActivity.this::startGoogleSignIn);
        }

        @JavascriptInterface
        public void startBazaarPurchase(String productId) {
            runOnUiThread(() -> MainActivity.this.startBazaarPurchase(productId));
        }

        @JavascriptInterface
        public void startBazaarVipSubscription() {
            runOnUiThread(MainActivity.this::startBazaarVipSubscription);
        }

        @JavascriptInterface
        public String getPendingBazaarPurchaseToken() {
            return pendingPurchaseToken();
        }

        @JavascriptInterface
        public String getPendingBazaarPurchaseProductId() {
            return billingPrefs().getString(PENDING_PRODUCT_KEY, "planet_tokens_200");
        }

        @JavascriptInterface
        public void consumeBazaarPurchase(String token, String productId) {
            runOnUiThread(() -> consumeVerifiedPurchase(token, productId));
        }

        @JavascriptInterface
        public String getPendingVipSubscriptionToken() {
            return billingPrefs().getString(PENDING_VIP_TOKEN_KEY, "");
        }

        @JavascriptInterface
        public void clearPendingVipSubscription(String token) {
            runOnUiThread(() -> {
                if (token != null && token.equals(billingPrefs().getString(PENDING_VIP_TOKEN_KEY, ""))) {
                    billingPrefs().edit().remove(PENDING_VIP_TOKEN_KEY).apply();
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            if (fileChooserCallback != null) {
                fileChooserCallback.onReceiveValue(results);
                fileChooserCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
        if (paymentConnection != null) {
            try { paymentConnection.disconnect(); } catch (RuntimeException ignored) { }
        }
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidCommerceBridge");
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
