using Foodlog.App.Models;
using Foodlog.App.Services;

namespace Foodlog.App.Pages;

// A scrollable record of logged days, newest first: calories vs goal, an
// on-track/over pill, and the day's macro split.
public class HistoryPage : ContentPage
{
    readonly ApiClient _api;
    readonly AppState _appState;
    readonly RefreshView _refresh;
    readonly CollectionView _list;
    readonly ActivityIndicator _spinner;
    readonly Label _empty;
    bool _loadedOnce;

    public HistoryPage(ApiClient api, AppState appState)
    {
        _api = api;
        _appState = appState;
        Title = "History";
        BackgroundColor = Ui.Paper;

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(20, 20, 20, 18),
            Spacing = 2,
            Children =
            {
                new Label { Text = "History", FontSize = 26, FontAttributes = FontAttributes.Bold, TextColor = Colors.White },
                new Label { Text = "Your nutrition, day by day", FontSize = 13, TextColor = Color.FromArgb("#B9B9B4") },
            }
        };

        _spinner = new ActivityIndicator { Color = Ui.Ink, IsVisible = false, HorizontalOptions = LayoutOptions.Center, Margin = new Thickness(0, 24) };
        _empty = new Label { Text = "", IsVisible = false, FontSize = 13, TextColor = Ui.Muted, HorizontalTextAlignment = TextAlignment.Center, Margin = new Thickness(24, 40) };

        _list = new CollectionView
        {
            Margin = new Thickness(12, 12),
            ItemTemplate = new DataTemplate(BuildRow),
            SelectionMode = SelectionMode.None,
        };

        _refresh = new RefreshView { Content = _list };
        _refresh.Refreshing += async (_, _) => await LoadAsync(force: true);

        var root = new Grid { RowDefinitions = { new RowDefinition(GridLength.Auto), new RowDefinition(GridLength.Star) } };
        root.Add(header, 0, 0);
        root.Add(_refresh, 0, 1);
        root.Add(_spinner, 0, 1);
        root.Add(_empty, 0, 1);
        Content = root;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (!_appState.IsLoggedIn) { ShowEmpty("Sign in on the Today tab to see your history."); return; }
        if (_loadedOnce) { Render(); return; }
        await LoadAsync(force: false);
    }

    async Task LoadAsync(bool force)
    {
        if (!_appState.IsLoggedIn) { _refresh.IsRefreshing = false; ShowEmpty("Sign in on the Today tab to see your history."); return; }
        if (!_refresh.IsRefreshing) { _spinner.IsVisible = _spinner.IsRunning = true; }
        try
        {
            await _api.GetStateAsync(force);
            _loadedOnce = true;
            Render();
        }
        catch (Exception ex)
        {
            ShowEmpty("Couldn't load history. " + ex.Message);
        }
        finally
        {
            _spinner.IsVisible = _spinner.IsRunning = false;
            _refresh.IsRefreshing = false;
        }
    }

    void Render()
    {
        var state = _api.CachedState;
        if (state is null) { ShowEmpty("Pull down to load your history."); return; }

        var goal = state.Goals.Calories;
        var days = new List<DaySummary>();
        foreach (var kv in state.Entries)
        {
            var items = kv.Value?.Items ?? new List<FoodItem>();
            if (items.Count == 0) continue;
            if (!DateTime.TryParse(kv.Key, out var date)) continue;
            if (date.Date > DateTime.Today) continue; // skip planned/future days
            var t = DayTotals.Of(items);
            var over = t.Calories > goal * 1.1;
            var onTrack = t.Calories >= goal * 0.75 && !over;
            days.Add(new DaySummary
            {
                Sort = date,
                Friendly = date.Date == DateTime.Today ? "Today" : date.Date == DateTime.Today.AddDays(-1) ? "Yesterday" : date.ToString("ddd, MMM d"),
                CalText = $"{Ui.Num(t.Calories)} kcal",
                GoalText = $"of {Ui.Num(goal)}",
                MacroText = $"P {Math.Round(t.Protein)}  \u00B7  C {Math.Round(t.Carbs)}  \u00B7  F {Math.Round(t.Fat)} g",
                ItemsText = $"{t.Items} item{(t.Items == 1 ? "" : "s")}",
                Status = over ? "Over" : onTrack ? "On track" : "Under",
                StatusBg = over ? Color.FromArgb("#F6E4E4") : onTrack ? Color.FromArgb("#E1F0E8") : Ui.Paper,
                StatusFg = over ? Ui.Danger : onTrack ? Ui.Success : Ui.Muted,
            });
        }

        var ordered = days.OrderByDescending(d => d.Sort).ToList();
        if (ordered.Count == 0) { ShowEmpty("No logged days yet. Add meals on foodlog.xyz to see them here."); return; }

        _empty.IsVisible = false;
        _list.IsVisible = true;
        _list.ItemsSource = ordered;
    }

    void ShowEmpty(string message)
    {
        _list.IsVisible = false;
        _empty.Text = message;
        _empty.IsVisible = true;
    }

    static View BuildRow()
    {
        var friendly = new Label { FontSize = 14, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink };
        friendly.SetBinding(Label.TextProperty, "Friendly");

        var items = new Label { FontSize = 11, TextColor = Ui.Muted };
        items.SetBinding(Label.TextProperty, "ItemsText");

        var statusLabel = new Label { FontSize = 11, FontAttributes = FontAttributes.Bold };
        statusLabel.SetBinding(Label.TextProperty, "Status");
        statusLabel.SetBinding(Label.TextColorProperty, "StatusFg");
        var statusPill = new Frame { CornerRadius = 999, Padding = new Thickness(10, 4), HasShadow = false, BorderColor = Colors.Transparent, HorizontalOptions = LayoutOptions.End, Content = statusLabel };
        statusPill.SetBinding(VisualElement.BackgroundColorProperty, "StatusBg");

        var top = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) } };
        top.Add(new VerticalStackLayout { Spacing = 0, Children = { friendly, items } }, 0, 0);
        top.Add(statusPill, 1, 0);

        var cal = new Label { FontSize = 20, FontAttributes = FontAttributes.Bold, TextColor = Ui.Ink };
        cal.SetBinding(Label.TextProperty, "CalText");
        var goal = new Label { FontSize = 12, TextColor = Ui.Muted, VerticalTextAlignment = TextAlignment.End, Margin = new Thickness(6, 0, 0, 3) };
        goal.SetBinding(Label.TextProperty, "GoalText");
        var calRow = new HorizontalStackLayout { Spacing = 0, Children = { cal, goal } };

        var macro = new Label { FontSize = 12, TextColor = Ui.InkSoft };
        macro.SetBinding(Label.TextProperty, "MacroText");

        var card = new Frame
        {
            BackgroundColor = Ui.Panel, CornerRadius = 14, HasShadow = false, BorderColor = Ui.Line,
            Padding = new Thickness(14), Margin = new Thickness(0, 5),
            Content = new VerticalStackLayout { Spacing = 6, Children = { top, calRow, macro } }
        };
        return card;
    }

    class DaySummary
    {
        public DateTime Sort { get; set; }
        public string Friendly { get; set; } = "";
        public string CalText { get; set; } = "";
        public string GoalText { get; set; } = "";
        public string MacroText { get; set; } = "";
        public string ItemsText { get; set; } = "";
        public string Status { get; set; } = "";
        public Color StatusBg { get; set; } = Colors.Transparent;
        public Color StatusFg { get; set; } = Colors.Black;
    }
}
