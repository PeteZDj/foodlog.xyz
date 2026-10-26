# Add project specific ProGuard rules here.
# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Google Play Billing, Wallet, Play Core (Review / App-Update / Integrity)
-keep class com.android.vending.billing.** { *; }
-keep class com.android.billingclient.** { *; }
-keep class com.google.android.gms.wallet.** { *; }
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.play.core.** { *; }
-keep class com.google.android.play.integrity.** { *; }
