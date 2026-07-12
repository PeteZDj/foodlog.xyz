using Foodlog.App.Services;

namespace Foodlog.App;

public class App : Application
{
    // The app opens straight into the tracker shell. Each data tab handles the
    // Google sign-in gate itself (Foodlog data is per-account and synced).
    public App(ApiClient api, AppState appState)
    {
        MainPage = new AppShell(api, appState);
    }
}
