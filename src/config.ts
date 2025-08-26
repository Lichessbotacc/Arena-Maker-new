export const config = {
  // API & Auth
  oauthToken: process.env.OAUTH_TOKEN || "",   // Token kommt aus GitHub Secret
  server: "https://lichess.org",              // Lichess-Server
  team: "testing-codes",                      // Team-ID auf Lichess

  // Turnier-Einstellungen
  name: "Daily Testing-Codes Swiss",          // Turniername
  clock: "3+0",                               // Bedenkzeit
  rounds: 11,                                 // Anzahl Runden
  rated: true,                                // gewertet
  variant: "standard",                        // Schachvariante
  startsAt: "16:00",                          // Startzeit (lokale Uhrzeit)

  // Automatisierung
  daysInAdvance: 0,                           // 0 = heute
  dailyTournaments: true,                     // jeden Tag erstellen
  dryRun: false,                              // true = nur testen, false = echt erstellen
};
