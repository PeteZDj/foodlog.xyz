using Foodlog.App.Pages;
using Foodlog.App.Services;

namespace Foodlog.App;

public class AppShell : Shell
{
    static readonly Color Ink   = Color.FromArgb("#0A0A0A"); // near-black chrome
    static readonly Color Paper = Color.FromArgb("#F5F5F2");
    static readonly Color Muted = Color.FromArgb("#71716C");

    public AppShell(ApiClient api, AppState appState)
    {
        FlyoutBehavior = FlyoutBehavior.Disabled;
        Title = "Foodlog";

        Shell.SetBackgroundColor(this, Ink);
        Shell.SetForegroundColor(this, Colors.White);
        Shell.SetTitleColor(this, Colors.White);
        SetValue(Shell.TabBarBackgroundColorProperty, Ink);
        SetValue(Shell.TabBarForegroundColorProperty, Colors.White);
        SetValue(Shell.TabBarTitleColorProperty, Colors.White);
        SetValue(Shell.TabBarUnselectedColorProperty, Muted);

        var tabBar = new TabBar();

        tabBar.Items.Add(new Tab
        {
            Title = "Today",
            Items = { new ShellContent { Title = "Today", Content = new TodayPage(api, appState) } }
        });

        tabBar.Items.Add(new Tab
        {
            Title = "History",
            Items = { new ShellContent { Title = "History", Content = new HistoryPage(api, appState) } }
        });

        tabBar.Items.Add(new Tab
        {
            Title = "Account",
            Items = { new ShellContent { Title = "Account", Content = new AccountPage(api, appState) } }
        });

        Items.Add(tabBar);
    }
}
