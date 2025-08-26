export const config = {
  server: 'https://lichess.org',
  team: 'testing-codes',
  oauthToken: process.env.OAUTH_TOKEN!,
  daysInAdvance: 10,
  dryRun: false,

  dailyTournaments: [
    {
      name: () => 'Daily Testing-Codes Swiss',
      description: () => 'Tägliches Teamturnier!\n\nNächstes Turnier: {{nextLink}}',
      clock: [3, 0], // 3+0
      rounds: 11,
      rated: true,
      variant: 'standard',
      time: '16:00',
    },
  ],
};
