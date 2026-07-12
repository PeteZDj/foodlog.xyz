namespace Foodlog.App.Pages;

// Shared Foodlog palette + small view builders so pages stay declarative and
// visually consistent with the web app's refined monochrome design.
public static class Ui
{
    public static readonly Color Ink     = Color.FromArgb("#0A0A0A"); // headers, primary buttons
    public static readonly Color InkSoft = Color.FromArgb("#202020");
    public static readonly Color Paper   = Color.FromArgb("#F5F5F2"); // page background
    public static readonly Color Panel   = Colors.White;
    public static readonly Color Line     = Color.FromArgb("#DDDDDA");
    public static readonly Color Muted    = Color.FromArgb("#71716C");
    public static readonly Color MutedLite = Color.FromArgb("#9A9A94");
    public static readonly Color Success  = Color.FromArgb("#1D6B42"); // on-track green
    public static readonly Color Danger   = Color.FromArgb("#A12828"); // over target red

    // Grayscale macro bars, matching the web app's protein/carbs/fat/fiber shades.
    public static readonly Color Protein = Color.FromArgb("#0A0A0A");
    public static readonly Color Carbs   = Color.FromArgb("#3F3F3D");
    public static readonly Color Fat     = Color.FromArgb("#696965");
    public static readonly Color Fiber   = Color.FromArgb("#999993");

    public static Button PrimaryButton(string text) => new()
    {
        Text = text,
        BackgroundColor = Ink,
        TextColor = Colors.White,
        FontAttributes = FontAttributes.Bold,
        CornerRadius = 12,
        HeightRequest = 52,
        FontSize = 16,
    };

    public static Frame Card(View content, Thickness? margin = null) => new()
    {
        BackgroundColor = Panel,
        CornerRadius = 16,
        HasShadow = false,
        BorderColor = Line,
        Padding = new Thickness(16),
        Margin = margin ?? new Thickness(0),
        Content = content,
    };

    public static View Pill(string text, Color bg, Color fg) => new Frame
    {
        BackgroundColor = bg,
        CornerRadius = 999,
        Padding = new Thickness(10, 4),
        HasShadow = false,
        BorderColor = Colors.Transparent,
        HorizontalOptions = LayoutOptions.Start,
        Content = new Label { Text = text, FontSize = 11, FontAttributes = FontAttributes.Bold, TextColor = fg },
    };

    // A thin labelled progress bar (value / goal) used for calories + macros.
    public static View Meter(Color fill, double fraction)
    {
        var f = Math.Clamp(fraction, 0, 1);
        var track = new Grid { HeightRequest = 8, ColumnDefinitions = { new ColumnDefinition(new GridLength(f, GridUnitType.Star)), new ColumnDefinition(new GridLength(Math.Max(0.0001, 1 - f), GridUnitType.Star)) } };
        track.Add(new BoxView { Color = fill, CornerRadius = 4 }, 0, 0);
        track.Add(new BoxView { Color = Color.FromArgb("#E6E6E2"), CornerRadius = 4 }, 1, 0);
        return new Frame { Padding = 0, CornerRadius = 4, IsClippedToBounds = true, HasShadow = false, BorderColor = Colors.Transparent, Content = track };
    }

    public static Image RemoteImage(string? url, double height, double width = -1) => new()
    {
        Source = string.IsNullOrWhiteSpace(url) ? null : ImageSource.FromUri(new Uri(url)),
        Aspect = Aspect.AspectFill,
        HeightRequest = height,
        WidthRequest = width,
        BackgroundColor = Line,
    };

    // 1794 -> "1,794"
    public static string Num(double n) => $"{Math.Round(n):#,0}";

    public static string Initials(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "FL";
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length == 1 ? parts[0][..1].ToUpperInvariant() : (parts[0][..1] + parts[^1][..1]).ToUpperInvariant();
    }
}
