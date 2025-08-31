export const config = {
  server: "https://lichess.org",
  team: "AggressiveBot", // <- Dein Team auf Lichess
  oauthToken: process.env.OAUTH_TOKEN!, // kommt aus GitHub Secrets oder .env
  daysInAdvance: 1, // wie viele Tage im Voraus Arenen erstellt werden
  dryRun: false, // true = nur anzeigen, false = wirklich erstellen

  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink?: string) =>
      `Next: ${nextLink ?? "coming soon"}`,

    // Turnier-Einstellungen
    clockTime: 0.25,        // Minuten -> 0.25 = 15 Sekunden
    clockIncrement: 0,      // Inkrement in Sekunden
    minutes: 90,            // Dauer in Minuten
    rated: true,            // gewertet
    variant: "standard",    // "standard", "chess960", ...
    rounds: undefined,      // nur für Swiss relevant
    frequencyMinutes: 120,  // alle 2 Stunden eine neue Arena
    startHour: 14,          // erste Arena pro Tag startet um 14:00 UTC
  },
};
