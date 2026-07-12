using Foodlog.App.Models;
using Foodlog.App.Services;

namespace Foodlog.App.Pages;

// The daily dashboard: calories vs goal, macro balance, water and the meal
// timeline for the selected day. Data comes from the signed-in user's synced
// tracker state (/api/sync). ‹ › steps through days from the cached state.
public class TodayPage : ContentPage
{
    static readonly string[] Meals = { "Breakfast", "Lunch", "Dinner", "Snacks" };

    readonly ApiClient _api;
    readonly AppState _appState;
    readonly RefreshView _refresh;
    readonly VerticalStackLayout _body;
    readonly Label _dateLabel;
    readonly ActivityIndicator _spinner;

    DateTime _selected = DateTime.Today;
    bool _loadedOnce;

    public TodayPage(ApiClient api, AppState appState)
    {
        _api = api;
        _appState = appState;
        Title = "Today";
        BackgroundColor = Ui.Paper;

        var title = new Label { Text = "Foodlog", FontSize = 26, FontAttributes = FontAttributes.Bold, TextColor = Colors.White };

        var prev = new Button { Text = "\u2039", FontSize = 22, TextColor = Colors.White, BackgroundColor = Colors.Transparent, WidthRequest = 44, HeightRequest = 40, Padding = 0 };
        var next = new Button { Text = "\u203A", FontSize = 22, TextColor = Colors.White, BackgroundColor = Colors.Transparent, WidthRequest = 44, HeightRequest = 40, Padding = 0 };
        prev.Clicked += (_, _) => { _selected = _selected.AddDays(-1); RenderDay(); };
        next.Clicked += (_, _) => { if (_selected < DateTime.Today) { _selected = _selected.AddDays(1); RenderDay(); } };

        _dateLabel = new Label { Text = "Today", FontSize = 15, FontAttributes = FontAttributes.Bold, TextColor = Colors.White, HorizontalTextAlignment = TextAlignment.Center, VerticalTextAlignment = TextAlignment.Center, HorizontalOptions = LayoutOptions.Fill };
        var dateTap = new TapGestureRecognizer();
        dateTap.Tapped += (_, _) => { _selected = DateTime.Today; RenderDay(); };
        _dateLabel.GestureRecognizers.Add(dateTap);

        var dateRow = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Auto), new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) }, Margin = new Thickness(0, 6, 0, 0) };
        dateRow.Add(prev, 0, 0);
        dateRow.Add(_dateLabel, 1, 0);
        dateRow.Add(next, 2, 0);

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(20, 20, 20, 18),
            Spacing = 0,
            Children = { title, dateRow }
        };

        _spinner = new ActivityIndicator { Color = Ui.Ink, IsVisible = false, HorizontalOptions = LayoutOptions.Center, Margin = new Thickness(0, 24) };
        _body = new VerticalStackLayout { Padding = new Thickness(16), Spacing = 14 };

        _refresh = new RefreshView { Content = new ScrollView { Content = _body } };
        _refresh.Refreshing += async (_, _) => await LoadAsync(force: true);

        var root = new Grid { RowDefinitions = { new RowDefinition(GridLength.Auto), new RowDefinition(GridLength.Star) } };
        root.Add(header, 0, 0);
        root.Add(_refresh, 0, 1);
        root.Add(_spinner, 0, 1);
        Content = root;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (!_appState.IsLoggedIn) { RenderDay(); return; }
        if (_loadedOnce) { RenderDay(); return; }
        await LoadAsync(force: false);
    }

    async Task LoadAsync(bool force)
    {
        if (!_appState.IsLoggedIn) { _refresh.IsRefreshing = false; RenderDay(); return; }
        if (!_refresh.IsRefreshing) { _spinner.IsVisible = _spinner.IsRunning = true; }
        try
        {
            await _api.GetStateAsync(force);
            _loadedOnce = true;
            RenderDay();
        }
        catch (Exception ex)
        {
            _body.Children.Clear();
            _body.Children.Add(Ui.Card(new Label { Text = "Couldn't load your log. " + ex.Message, TextColor = Ui.Danger, FontSize = 13 }));
        }
        finally
        {
            _spinner.IsVisible = _spinner.IsRunning = false;
            _refresh.IsRefreshing = false;
        }
    }

    void RenderDay()
    {
        var isToday = _selected.Date == DateTime.Today;
        var isYesterday = _selected.Date == DateTime.Today.AddDays(-1);
        _dateLabel.Text = (isToday ? "Today" : isYesterday ? "Yesterday" : _selected.ToString("dddd")) + " \u00B7 " + _selected.ToString("MMM d");

        _body.Children.Clear();

        if (!_appState.IsLoggedIn) { _body.Children.Add(SignInPrompt()); return; }

        var state = _api.CachedState;
        if (state is null)
        {
            _body.Children.Add(Ui.Card(new Label { Text = "Pull down to load your synced food log.", TextColor = Ui.Muted, FontSize = 13, HorizontalTextAlignment = TextAlignment.Center }));
            return;
        }

        var key = _selected.ToString("yyyy-MM-dd");
        var day = state.Entries.TryGetValue(key, out var d) ? d : new DayEntry();
        var items = day.Items ?? new List<FoodItem>();
        var totals = DayTotals.Of(items);
        var goals = state.Goals;

        _body.Children.Add(CaloriesCard(totals, goals));
        _body.Children.Add(MacrosCard(totals, goals));
        _body.Children.Add(WaterCard(day.Water, goals.Water));
        _body.Children.Add(new Label { Text = "MEAL TIMELINE", FontSize = 11, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted, Margin = new Thickness(4, 6, 0, 0) });

        foreach (var meal in Meals)
            _body.Children.Add(MealCard(meal, items.Where(i => string.Equals(i.Meal, meal, StringComparison.OrdinalIgnoreCase)).ToList()));
    }

    View CaloriesCard(DayTotals t, Goals g)
    {
        var remaining = Math.Max(0, g.Calories - t.Calories);
        var pct = g.Calories > 0 ? t.Calories / g.Calories : 0;
        var over = t.Calories > g.Calories * 1.1;

        var big = new Label { Text = Ui.Num(t.Calories), FontSize = 40, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink };
        var of = new Label { Text = $"of {Ui.Num(g.Calories)} kcal", FontSize = 13, TextColor = Ui.Muted };

        var statusPill = Ui.Pill(over ? "Over target" : pct >= 0.75 ? "On track" : "In progress",
            over ? Color.FromArgb("#F6E4E4") : pct >= 0.75 ? Color.FromArgb("#E1F0E8") : Ui.Paper,
            over ? Ui.Danger : pct >= 0.75 ? Ui.Success : Ui.Muted);

        var top = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) } };
        top.Add(new VerticalStackLayout { Spacing = 0, Children = { new Label { Text = "Daily calories", FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted }, big, of } }, 0, 0);
        top.Add(new VerticalStackLayout { VerticalOptions = LayoutOptions.Start, Children = { statusPill } }, 1, 0);

        var stats = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Star) }, Margin = new Thickness(0, 12, 0, 0) };
        stats.Add(Stat("Consumed", Ui.Num(t.Calories)), 0, 0);
        stats.Add(Stat("Remaining", Ui.Num(remaining)), 1, 0);
        stats.Add(Stat("Progress", $"{Math.Round(pct * 100)}%"), 2, 0);

        return Ui.Card(new VerticalStackLayout { Spacing = 10, Children = { top, Ui.Meter(over ? Ui.Danger : Ui.Success, pct), stats } });
    }

    static View Stat(string k, string v) => new VerticalStackLayout
    {
        Spacing = 1,
        Children =
        {
            new Label { Text = v, FontSize = 16, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink },
            new Label { Text = k, FontSize = 11, TextColor = Ui.Muted },
        }
    };

    View MacrosCard(DayTotals t, Goals g)
    {
        var stack = new VerticalStackLayout { Spacing = 12, Children =
        {
            new Label { Text = "Macro balance", FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted },
            MacroRow("Protein", t.Protein, g.Protein, Ui.Protein),
            MacroRow("Carbohydrates", t.Carbs, g.Carbs, Ui.Carbs),
            MacroRow("Fat", t.Fat, g.Fat, Ui.Fat),
            MacroRow("Fiber", t.Fiber, g.Fiber, Ui.Fiber),
        } };
        return Ui.Card(stack);
    }

    static View MacroRow(string name, double value, double goal, Color fill)
    {
        var head = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) } };
        head.Add(new Label { Text = name, FontSize = 13, TextColor = Ui.InkSoft }, 0, 0);
        head.Add(new Label { Text = $"{Math.Round(value)} / {Math.Round(goal)} g", FontSize = 13, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink }, 1, 0);
        return new VerticalStackLayout { Spacing = 6, Children = { head, Ui.Meter(fill, goal > 0 ? value / goal : 0) } };
    }

    View WaterCard(double glasses, double goal)
    {
        var g = (int)Math.Max(1, Math.Round(goal));
        var cups = new HorizontalStackLayout { Spacing = 6 };
        for (int i = 0; i < g; i++)
            cups.Children.Add(new BoxView { WidthRequest = 16, HeightRequest = 22, CornerRadius = 4, Color = i < glasses ? Ui.Ink : Color.FromArgb("#E6E6E2") });

        var row = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) } };
        row.Add(new VerticalStackLayout { Spacing = 2, Children = { new Label { Text = "Hydration", FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted }, cups } }, 0, 0);
        row.Add(new Label { Text = $"{Math.Round(glasses)} / {g}", FontSize = 15, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink, VerticalOptions = LayoutOptions.Center }, 1, 0);
        return Ui.Card(row);
    }

    static View MealCard(string meal, List<FoodItem> items)
    {
        var totals = DayTotals.Of(items);
        var head = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) } };
        head.Add(new VerticalStackLayout { Spacing = 0, Children =
        {
            new Label { Text = meal, FontSize = 15, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink },
            new Label { Text = $"{items.Count} item{(items.Count == 1 ? "" : "s")}", FontSize = 11, TextColor = Ui.Muted },
        } }, 0, 0);
        head.Add(new VerticalStackLayout { HorizontalOptions = LayoutOptions.End, Children =
        {
            new Label { Text = Ui.Num(totals.Calories), FontSize = 15, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink, HorizontalTextAlignment = TextAlignment.End },
            new Label { Text = "kcal", FontSize = 11, TextColor = Ui.Muted, HorizontalTextAlignment = TextAlignment.End },
        } }, 1, 0);

        var stack = new VerticalStackLayout { Spacing = 10, Children = { head } };

        if (items.Count == 0)
        {
            stack.Children.Add(new Label { Text = "Nothing logged.", FontSize = 12, TextColor = Ui.MutedLite });
        }
        else
        {
            foreach (var it in items)
            {
                var line = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) }, Margin = new Thickness(0, 2) };
                line.Add(new VerticalStackLayout { Spacing = 0, Children =
                {
                    new Label { Text = it.Name ?? "Food", FontSize = 13, FontAttributes = FontAttributes.Bold, TextColor = Ui.InkSoft, LineBreakMode = LineBreakMode.TailTruncation },
                    new Label { Text = $"{Round1(it.Servings)} \u00D7 {it.Serving}", FontSize = 11, TextColor = Ui.Muted },
                } }, 0, 0);
                line.Add(new Label { Text = $"{Ui.Num(it.CalTotal)} kcal", FontSize = 13, TextColor = Ui.Ink, VerticalOptions = LayoutOptions.Center }, 1, 0);
                stack.Children.Add(line);
            }
        }

        return Ui.Card(stack);
    }

    static string Round1(double v) => v == Math.Floor(v) ? ((int)v).ToString() : v.ToString("0.0");

    View SignInPrompt()
    {
        var btn = Ui.PrimaryButton("Continue with Google");
        btn.Clicked += OnGoogleClicked;
        return new VerticalStackLayout
        {
            Spacing = 14,
            Padding = new Thickness(4, 30, 4, 0),
            Children =
            {
                new Label { Text = "Your food log, on your phone", FontSize = 20, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink, HorizontalTextAlignment = TextAlignment.Center },
                new Label { Text = "Sign in with the same Google account you use on foodlog.xyz to see today's nutrition, macros and history.", FontSize = 13, TextColor = Ui.Muted, HorizontalTextAlignment = TextAlignment.Center },
                _spinner,
                btn,
            }
        };
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
            await LoadAsync(force: true);
        }
        catch (TaskCanceledException) { /* dismissed */ }
        catch (Exception ex) { await DisplayAlertAsync("Sign-in failed", ex.Message, "OK"); }
        finally { _spinner.IsVisible = _spinner.IsRunning = false; }
    }
}
