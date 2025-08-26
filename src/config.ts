export const config = {
  server: 'https://lichess.org',
  team: 'testing-codes',       // 👈 dein Team
  oauthToken: process.env.OAUTH_TOKEN || '',

  // Wie viele Tage im Voraus Turniere erstellt werden sollen
  daysInAdvance: 1,

  // Kein Testlauf – wirklich erstellen
  dryRun: false,

  // Hier definierst du deine täglichen Turniere
  dailyTournaments: [
    {
      time: '16:00', // Startzeit UTC (18:00 deutscher Sommerzeit)
      clock: [3, 0], // 3+0
      rounds: 11,    // Anzahl Runden
      rated: true,
      variant: 'standard',
      name: () => `Daily Testing-Codes Swiss`,
      description: () => `11-Runden 3+0 gewertetes Standard-Swiss-Turnier für Team Testing-Codes`,
    },
  ],
};
