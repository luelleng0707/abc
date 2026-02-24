// Copy this file to config.js and add your Google Maps API keys.
// config.js is in .gitignore so your keys won't be committed.
// Restrict keys in Google Cloud Console: APIs & Services > Credentials
// - Web: HTTP referrers (localhost, your domain)
// - iOS: iOS apps + bundle ID (com.globecity.app)
// - Android: Android apps + package name (com.globecity.app)
(function () {
  var webKey = "YOUR_WEB_API_KEY";
  var iosKey = "YOUR_IOS_API_KEY";
  var androidKey = "YOUR_ANDROID_API_KEY";
  var key = webKey;
  if (typeof window !== "undefined" && window.Capacitor?.getPlatform) {
    var p = window.Capacitor.getPlatform();
    if (p === "ios") key = iosKey;
    else if (p === "android") key = androidKey;
  }
  window.GOOGLE_MAPS_API_KEY = key;
})();
