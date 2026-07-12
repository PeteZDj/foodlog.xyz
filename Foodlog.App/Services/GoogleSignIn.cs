using System.Text;
using System.Text.Json;
using Microsoft.Maui.Authentication;
using Foodlog.App.Models;

namespace Foodlog.App.Services;

// Runs Google sign-in in the system browser against the hosted bridge page
// (/mobile-signin.html), which returns a real Foodlog session token via the
// "foodlog://auth" custom scheme.
public static class GoogleSignIn
{
    public static async Task<AuthResponse?> AuthenticateAsync()
    {
        var result = await WebAuthenticator.Default.AuthenticateAsync(
            new Uri(ApiClient.Origin + "/mobile-signin.html"),
            new Uri("foodlog://auth"));

        string Get(string key) => result.Properties.TryGetValue(key, out var v) ? v : string.Empty;

        var token = Get("token");
        if (string.IsNullOrEmpty(token)) return null; // cancelled / no token

        // The bridge sends the full user object as base64(JSON); fall back to the
        // discrete id/name/email fields if needed.
        var user = TryDecodeUser(Get("user")) ?? new User
        {
            Id = Get("id"),
            Name = Get("name"),
            Email = Get("email"),
        };

        return new AuthResponse { Token = token, User = user };
    }

    private static User? TryDecodeUser(string b64)
    {
        if (string.IsNullOrWhiteSpace(b64)) return null;
        try
        {
            var s = b64.Replace('-', '+').Replace('_', '/');
            switch (s.Length % 4) { case 2: s += "=="; break; case 3: s += "="; break; }
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(s));
            return JsonSerializer.Deserialize<User>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        }
        catch { return null; }
    }
}
