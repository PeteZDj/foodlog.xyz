using System.Text.Json;
using System.Text.Json.Serialization;

namespace Foodlog.App.Models;

// Mirrors the Foodlog API JSON. System.Text.Json's web defaults handle the
// camelCase <-> PascalCase mapping. The synced state was authored by the web
// app (app-v2.js), so numeric fields can occasionally arrive as strings — the
// FlexibleDouble converter tolerates both.

public class User
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    // Unused by Foodlog but kept so the shared Google sign-in bridge maps cleanly.
    public string? Role { get; set; }
    public string? Location { get; set; }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public User User { get; set; } = new();
}

public class MeResponse { public User? User { get; set; } }

// ── Synced tracker state (GET/POST /api/sync -> { state }) ──────────────────────
public class SyncResponse { public FoodlogState? State { get; set; } }

public class FoodlogState
{
    public Goals Goals { get; set; } = new();
    public Profile Profile { get; set; } = new();
    public Dictionary<string, DayEntry> Entries { get; set; } = new();
    public List<WeightEntry> Weights { get; set; } = new();
    public List<ExerciseEntry> Exercises { get; set; } = new();
}

public class Goals
{
    [JsonConverter(typeof(FlexibleDouble))] public double Calories { get; set; } = 2200;
    [JsonConverter(typeof(FlexibleDouble))] public double Protein { get; set; } = 150;
    [JsonConverter(typeof(FlexibleDouble))] public double Carbs { get; set; } = 240;
    [JsonConverter(typeof(FlexibleDouble))] public double Fat { get; set; } = 70;
    [JsonConverter(typeof(FlexibleDouble))] public double Fiber { get; set; } = 30;
    [JsonConverter(typeof(FlexibleDouble))] public double Water { get; set; } = 8;
}

public class Profile
{
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public string? FavoriteFood { get; set; }
    public string? Location { get; set; }
    public string? FoodPhilosophy { get; set; }
    public string? Bio { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double CurrentWeight { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double GoalWeight { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double Height { get; set; }
    public string? ActivityLevel { get; set; }
    public string? PrimaryGoal { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double ExerciseGoal { get; set; }
    public string? WeightUnit { get; set; }
}

public class DayEntry
{
    [JsonConverter(typeof(FlexibleDouble))] public double Water { get; set; }
    public List<FoodItem> Items { get; set; } = new();
}

// A logged food. Nutrition fields are per single serving; multiply by Servings.
public class FoodItem
{
    public string? Name { get; set; }
    public string? Serving { get; set; }
    public string? Meal { get; set; }
    public string? Category { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double Servings { get; set; } = 1;
    [JsonConverter(typeof(FlexibleDouble))] public double Calories { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double Protein { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double Carbs { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double Fat { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double Fiber { get; set; }

    public double CalTotal => Calories * Servings;
    public double ProteinTotal => Protein * Servings;
    public double CarbsTotal => Carbs * Servings;
    public double FatTotal => Fat * Servings;
    public double FiberTotal => Fiber * Servings;
}

public class WeightEntry
{
    public string? Date { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double Weight { get; set; }
    public string? Notes { get; set; }
}

public class ExerciseEntry
{
    public string? Date { get; set; }
    public string? Type { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double Minutes { get; set; }
    [JsonConverter(typeof(FlexibleDouble))] public double Calories { get; set; }
    public string? Notes { get; set; }
}

// Aggregate nutrition for a set of logged items.
public struct DayTotals
{
    public double Calories, Protein, Carbs, Fat, Fiber;
    public int Items;

    public static DayTotals Of(IEnumerable<FoodItem> items)
    {
        var t = new DayTotals();
        foreach (var it in items)
        {
            t.Calories += it.CalTotal;
            t.Protein  += it.ProteinTotal;
            t.Carbs    += it.CarbsTotal;
            t.Fat      += it.FatTotal;
            t.Fiber    += it.FiberTotal;
            t.Items++;
        }
        return t;
    }
}

// Reads a JSON number OR a numeric string into a double (0 for null/blank/bad).
public class FlexibleDouble : JsonConverter<double>
{
    public override double Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.Number:
                return reader.GetDouble();
            case JsonTokenType.String:
                var s = reader.GetString();
                return double.TryParse(s, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0;
            case JsonTokenType.Null:
                return 0;
            default:
                reader.Skip();
                return 0;
        }
    }

    public override void Write(Utf8JsonWriter writer, double value, JsonSerializerOptions options)
        => writer.WriteNumberValue(value);
}
