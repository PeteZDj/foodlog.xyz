using Android.App;
using Android.Content;
using Android.Content.PM;

namespace Foodlog.App;

// Captures the "foodlog://auth" redirect from the Google sign-in browser tab and
// hands it back to WebAuthenticator.
[Activity(NoHistory = true, LaunchMode = LaunchMode.SingleTop, Exported = true)]
[IntentFilter(
    new[] { Intent.ActionView },
    Categories = new[] { Intent.CategoryDefault, Intent.CategoryBrowsable },
    DataScheme = "foodlog",
    DataHost = "auth")]
public class WebAuthenticationCallbackActivity : Microsoft.Maui.Authentication.WebAuthenticatorCallbackActivity
{
}
