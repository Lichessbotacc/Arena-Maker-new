export const config = {
  oauthToken: process.env.OAUTH_TOKEN || "",
  server: "https://lichess.org",
  team: "testing-codes",

  daysInAdvance: 0,
  dryRun: false,

  dailyTournaments: [
    {
      name: (m: any) => "Daily Testing-Codes Swiss",
      description: (m: any) => "Tägliches 3+0 Standard-Swiss für das Team Testing-Codes.",
      time: "16:00",
      clock: [3, 0],
      rounds: 11,
      rated: true,
      variant: "standard",
    },
  ],
};
