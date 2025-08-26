export const config = {
  oauthToken: process.env.OAUTH_TOKEN || "",  // kommt aus GitHub Secret
  server: "https://lichess.org",
  team: "testing-codes",

  daysInAdvance: 0,   // Turniere nur heute erstellen
  dryRun: false,      // true = nur anzeigen, false = wirklich erstellen

  dailyTournaments: [
    {
      name: () => "Daily Testing-Codes Swiss",
      description: () => "Tägliches 3+0 Standard-Swiss für das Team Testing-Codes.",
      time: "16:00",         // Startzeit
      clock: [3, 0],         // 3 Minuten + 0 Sekunden
      rounds: 11,            // 11 Runden
      rated: true,           // gewertet
      variant: "standard",   // Standard-Schach
    },
  ],
};
