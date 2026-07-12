using Foodlog.App.Models;
using Foodlog.App.Services;

namespace Foodlog.App.Pages;

// Signed-out: Google sign-in. Signed-in: profile, nutrition goals, body metrics
// (from the synced state) and sign out.
public class AccountPage : ContentPage
{
    readonly ApiClient _api;
    readonly AppState _appState;
    readonly ActivityIndicator _spinner;

    public AccountPage(ApiClient api, AppState appState)
    {
        _api = api;
        _appState = appState;
        Title = "Account";
        BackgroundColor = Ui.Paper;
        _spinner = new ActivityIndicator { Color = Ui.Ink, IsVisible = false, HorizontalOptions = LayoutOptions.Center };
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        Build();
        if (_appState.IsLoggedIn)
        {
            try { await _api.GetStateAsync(false); Build(); } catch { /* keep cached */ }
        }
    }

    void Build() => Content = new ScrollView { Content = _appState.IsLoggedIn ? SignedIn() : SignedOut() };

    View SignedOut()
    {
        var googleBtn = Ui.PrimaryButton("Continue with Google");
        googleBtn.Clicked += OnGoogleClicked;

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(24, 56, 24, 40),
            Spacing = 10,
            Children =
            {
                Mark(72, 34),
                new Label { Text = "Sign in to Foodlog", FontSize = 22, FontAttributes = FontAttributes.Bold, TextColor = Colors.White, HorizontalTextAlignment = TextAlignment.Center },
                new Label { Text = "Your food log syncs securely to your account.", FontSize = 13, TextColor = Color.FromArgb("#B9B9B4"), HorizontalTextAlignment = TextAlignment.Center },
            }
        };

        var card = Ui.Card(new VerticalStackLayout
        {
            Spacing = 14,
            Children =
            {
                _spinner,
                googleBtn,
                new Label { Text = "Use the same Google account you use on foodlog.xyz.", FontSize = 12, TextColor = Ui.Muted, HorizontalTextAlignment = TextAlignment.Center },
            }
        });

        return new VerticalStackLayout { Children = { header, new VerticalStackLayout { Padding = new Thickness(16), Children = { card } } } };
    }

    View SignedIn()
    {
        View avatar = !string.IsNullOrWhiteSpace(_appState.Avatar)
            ? new Frame { WidthRequest = 76, HeightRequest = 76, CornerRadius = 38, Padding = 0, IsClippedToBounds = true, HasShadow = false, BorderColor = Colors.Transparent, HorizontalOptions = LayoutOptions.Center, Content = Ui.RemoteImage(_appState.Avatar, 76, 76) }
            : new Frame { WidthRequest = 76, HeightRequest = 76, CornerRadius = 38, Padding = 0, HasShadow = false, BackgroundColor = Color.FromArgb("#F5F5F2"), BorderColor = Colors.Transparent, HorizontalOptions = LayoutOptions.Center,
                Content = new Label { Text = Ui.Initials(_appState.Name), FontSize = 28, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink, HorizontalOptions = LayoutOptions.Center, VerticalOptions = LayoutOptions.Center } };

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(20, 44, 20, 24),
            Spacing = 8,
            Children =
            {
                avatar,
                new Label { Text = _appState.Name ?? "My foodlog", FontSize = 20, FontAttributes = FontAttributes.Bold, TextColor = Colors.White, HorizontalTextAlignment = TextAlignment.Center },
                new Label { Text = _appState.Email ?? "", FontSize = 13, TextColor = Color.FromArgb("#B9B9B4"), HorizontalTextAlignment = TextAlignment.Center },
            }
        };

        var body = new VerticalStackLayout { Padding = new Thickness(16), Spacing = 14, Children = { _spinner } };

        var state = _api.CachedState;
        if (state is not null)
        {
            var g = state.Goals;
            body.Children.Add(SectionCard("Daily nutrition goals", new()
            {
                ("Calories", $"{Ui.Num(g.Calories)} kcal"),
                ("Protein", $"{Math.Round(g.Protein)} g"),
                ("Carbohydrates", $"{Math.Round(g.Carbs)} g"),
                ("Fat", $"{Math.Round(g.Fat)} g"),
                ("Fiber", $"{Math.Round(g.Fiber)} g"),
                ("Water", $"{Math.Round(g.Water)} glasses"),
            }));

            var p = state.Profile;
            var unit = string.IsNullOrWhiteSpace(p.WeightUnit) ? "lb" : p.WeightUnit;
            var body2 = new List<(string, string)>();
            if (p.CurrentWeight > 0) body2.Add(("Current weight", $"{Round1(p.CurrentWeight)} {unit}"));
            if (p.GoalWeight > 0) body2.Add(("Goal weight", $"{Round1(p.GoalWeight)} {unit}"));
            if (!string.IsNullOrWhiteSpace(p.PrimaryGoal)) body2.Add(("Primary goal", p.PrimaryGoal!));
            if (!string.IsNullOrWhiteSpace(p.ActivityLevel)) body2.Add(("Activity level", p.ActivityLevel!));
            if (!string.IsNullOrWhiteSpace(p.FoodPhilosophy)) body2.Add(("Food philosophy", p.FoodPhilosophy!));
            if (body2.Count > 0) body.Children.Add(SectionCard("Body & goals", body2));
        }

        body.Children.Add(SectionCard("Account", new() { ("Signed in with", "Google") }));

        var signOut = new Button
        {
            Text = "SIGN OUT",
            BackgroundColor = Colors.White,
            TextColor = Ui.Danger,
            BorderColor = Color.FromArgb("#E6C9C9"),
            BorderWidth = 1,
            FontAttributes = FontAttributes.Bold,
            CornerRadius = 12,
            HeightRequest = 52,
        };
        signOut.Clicked += OnSignOut;
        body.Children.Add(signOut);

        return new VerticalStackLayout { Children = { header, body } };
    }

    static string Round1(double v) => v == Math.Floor(v) ? ((int)v).ToString() : v.ToString("0.0");

    static View Mark(double size, double dot)
    {
        var row = new HorizontalStackLayout { Spacing = 6, HorizontalOptions = LayoutOptions.Center };
        for (int i = 0; i < 3; i++)
            row.Children.Add(new BoxView { WidthRequest = 10, HeightRequest = 10, CornerRadius = 5, Color = Colors.White });
        return new Frame { WidthRequest = size, HeightRequest = size, CornerRadius = 18, Padding = 0, HasShadow = false, BackgroundColor = Ui.InkSoft, BorderColor = Color.FromArgb("#2A2A2A"), HorizontalOptions = LayoutOptions.Center, Content = row };
    }

    static View SectionCard(string title, List<(string k, string v)> rows)
    {
        var stack = new VerticalStackLayout { Spacing = 10, Children = { new Label { Text = title, FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted } } };
        foreach (var (k, v) in rows)
        {
            var g = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) }, ColumnSpacing = 12 };
            g.Add(new Label { Text = k, FontSize = 14, TextColor = Ui.Muted }, 0, 0);
            g.Add(new Label { Text = v, FontSize = 14, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink, HorizontalTextAlignment = TextAlignment.End }, 1, 0);
            stack.Children.Add(g);
        }
        return Ui.Card(stack);
    }

    async void OnGoogleClicked(object? sender, EventArgs e)
    {
        try
        {
            _spinner.IsVisible = _spinner.IsRunning = true;
            var auth = await GoogleSignIn.AuthenticateAsync();
            if (auth is null) return;
            _appState.SetSession(auth);
            _api.ClearCache();
            try { await _api.GetStateAsync(true); } catch { }
            Build();
        }
        catch (TaskCanceledException) { /* dismissed */ }
        catch (Exception ex) { await DisplayAlertAsync("Sign-in failed", ex.Message, "OK"); }
        finally { _spinner.IsVisible = _spinner.IsRunning = false; }
    }

    async void OnSignOut(object? sender, EventArgs e)
    {
        var ok = await DisplayAlertAsync("Sign out", "Sign out of Foodlog on this device?", "Sign out", "Cancel");
        if (!ok) return;
        await _api.LogoutAsync();
        _appState.Clear();
        _api.ClearCache();
        Build();
    }
}
