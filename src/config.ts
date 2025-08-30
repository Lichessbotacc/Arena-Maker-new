export const config = {
  server: "https://lichess.org",
  teamId: "testing-codes",   // <-- wichtig: teamId statt team!
  oauthToken: process.env.OAUTH_TOKEN!,
  daysInAdvance: 1,          // wie viele Tage im Voraus Arenen erstellt werden
  dryRun: false,             // true = nur anzeigen, false = wirklich erstellen

  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink?: string) =>
      `Next: ${nextLink ?? "coming soon"}`,

    // Turnier-Einstellungen
    clockTime: 0.25,         // Minuten (z. B. 3 für 3+0)
    clockIncrement: 0,       // Inkrement in Sekunden
    minutes: 90,             // Dauer in Minuten
    rated: true,             // true = gewertet, false = Trainingsarena
    variant: "standard",     // z. B. "standard", "chess960", ...
    rounds: undefined,       // nur für Swiss relevant, Arena ignoriert das
    frequencyMinutes: 120,   // alle 2 Stunden neue Arena
    startHour: 14,           // erste Arena pro Tag startet um 14:00 UTC
  },
};
