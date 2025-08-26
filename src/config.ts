export const config = {
  // API & Auth
  oauthToken: process.env.OAUTH_TOKEN || "",   // Token kommt aus GitHub Secret
  server: "https://lichess.org",              // Lichess-Server
  team: "testing-codes",                      // Team-ID auf Lichess

  // Automatisierung
  daysInAdvance: 0,                           // 0 = heute
  dryRun: false,                              // true = nur testen, false = echt erstellen

  // Liste der Turniere
  dailyTournaments: [
    {
      name: "Daily Testing-Codes Swiss",
      clock: "3+0",
      rounds: 11,
      rated: true,
      variant: "standard",
      startsAt: "16:00",
    },
  ],
};
