export const config = {
  server: "https://lichess.org",
  team: "testing-codes",   // <-- deinen Teamnamen eintragen
  oauthToken: process.env.OAUTH_TOKEN!,
  daysInAdvance: 10,       // wie viele Tage im Voraus Arenen erstellt werden
  dryRun: false,           // true = nur anzeigen, false = wirklich erstellen

  arena: {
    name: (date: Date) =>
      `Daily Arena ${date.toISOString().slice(0, 10)} ${date.getUTCHours()}:00`, 
    description: (nextLink?: string) =>
      `Tägliches Arena-Turnier!\n\nNächste Arena: ${nextLink ?? "folgt bald"}`,

    // Turnier-Einstellungen
    clockTime: 3,          // Minuten (z. B. 3 für 3+0)
    clockIncrement: 0,     // Inkrement in Sekunden
    minutes: 120,          // Dauer in Minuten
    rated: true,           // true = gewertet, false = Trainingsarena
    variant: "standard",   // z. B. "standard", "chess960", ...
    rounds: undefined,     // nur für Swiss relevant, Arena ignoriert das
    frequencyMinutes: 120, // alle 2 Stunden neue Arena
    startHour: 14,         // erste Arena pro Tag startet um 14:00 UTC
  },
};
