using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Foodlog.App.Models;

namespace Foodlog.App.Services;

// Typed client for the Foodlog API (Express + PostgreSQL behind IIS, proxied to
// the foodlog-api service on :3012). The synced tracker state is fetched once
// and cached so tab switches are instant; pull-to-refresh forces a reload.
public class ApiClient
{
    private readonly HttpClient _http;
    private readonly AppState _appState;

    public const string BaseUrl = "https://foodlog.xyz/api";
    public const string Origin  = "https://foodlog.xyz";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    // Last successfully loaded state (shared across Today / History / Account).
    public FoodlogState? CachedState { get; private set; }

    public ApiClient(AppState appState)
    {
        _appState = appState;
        _http = new HttpClient { BaseAddress = new Uri(BaseUrl + "/"), Timeout = TimeSpan.FromSeconds(30) };
    }

    private void ApplyAuthHeader()
    {
        _http.DefaultRequestHeaders.Authorization = string.IsNullOrEmpty(_appState.Token)
            ? null
            : new AuthenticationHeaderValue("Bearer", _appState.Token);
    }

    // ── Auth ────────────────────────────────────────────────────────────────
    public async Task<User> GetMeAsync()
    {
        ApplyAuthHeader();
        var resp = await _http.GetAsync("auth/me");
        await EnsureSuccess(resp);
        return (await resp.Content.ReadFromJsonAsync<MeResponse>(Json))?.User ?? new User();
    }

    public async Task LogoutAsync()
    {
        ApplyAuthHeader();
        try { await _http.PostAsync("auth/logout", null); } catch { /* best effort */ }
    }

    // ── Synced tracker state ──────────────────────────────────────────────────
    public async Task<FoodlogState?> GetStateAsync(bool force = false)
    {
        if (!force && CachedState is not null) return CachedState;

        ApplyAuthHeader();
        var resp = await _http.GetAsync("sync");
        await EnsureSuccess(resp);
        var state = (await resp.Content.ReadFromJsonAsync<SyncResponse>(Json))?.State;
        if (state is not null) CachedState = state;
        return state;
    }

    public void ClearCache() => CachedState = null;

    private static async Task EnsureSuccess(HttpResponseMessage resp)
    {
        if (resp.IsSuccessStatusCode) return;
        var body = await resp.Content.ReadAsStringAsync();
        string message;
        try
        {
            var doc = JsonDocument.Parse(body);
            message = doc.RootElement.TryGetProperty("error", out var err)
                ? err.GetString() ?? "Request failed"
                : (resp.ReasonPhrase ?? "Request failed");
        }
        catch
        {
            message = string.IsNullOrWhiteSpace(body) ? (resp.ReasonPhrase ?? "Request failed") : body;
        }
        throw new ApiException(resp.StatusCode, message);
    }
}

public class ApiException : Exception
{
    public System.Net.HttpStatusCode StatusCode { get; }
    public ApiException(System.Net.HttpStatusCode statusCode, string message) : base(message) => StatusCode = statusCode;
}
