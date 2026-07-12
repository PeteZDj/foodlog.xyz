using Foodlog.App.Models;

namespace Foodlog.App.Services;

// Session store backed by MAUI Preferences (survives app restarts).
public class AppState
{
    public string? Token { get; private set; }
    public string? UserId { get; private set; }
    public string? Name { get; private set; }
    public string? Email { get; private set; }
    public string? Avatar { get; private set; }

    public bool IsLoggedIn => !string.IsNullOrEmpty(Token);

    public AppState()
    {
        Token  = Preferences.Get(nameof(Token), null);
        UserId = Preferences.Get(nameof(UserId), null);
        Name   = Preferences.Get(nameof(Name), null);
        Email  = Preferences.Get(nameof(Email), null);
        Avatar = Preferences.Get(nameof(Avatar), null);
    }

    public void SetSession(AuthResponse auth)
    {
        Token = auth.Token;
        ApplyUser(auth.User);
        Preferences.Set(nameof(Token), Token);
    }

    public void ApplyUser(User user)
    {
        UserId = user.Id;
        Name   = user.Name;
        Email  = user.Email;
        Avatar = user.Avatar;

        Preferences.Set(nameof(UserId), UserId ?? string.Empty);
        Preferences.Set(nameof(Name), Name ?? string.Empty);
        Preferences.Set(nameof(Email), Email ?? string.Empty);
        Preferences.Set(nameof(Avatar), Avatar ?? string.Empty);
    }

    public void Clear()
    {
        Token = UserId = Name = Email = Avatar = null;
        Preferences.Clear();
    }
}
