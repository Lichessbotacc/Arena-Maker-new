export const config = {
  server: "https://lichess.org",
  team: "darkonteams", // team ID
  oauthToken: process.env.OAUTH_TOKEN!, // OAuth token from environment variables
  daysInAdvance: 0, // Create tournaments for current time slot only
  dryRun: false, // true = simulate only, false = actually create

  arena: {
    name: () => "Hourly Blitz", // Lichess will add "Arena" automatically
    description: (nextLink?: string) => `Professional Ultrabullet tournaments by DarkOnTeams team!`,
    
    // Tournament settings - ULTRABULLET (15+0)
    clockTime: 3,       // Minutes -> 0.25 = 15 seconds
    clockIncrement: 0,      // No increment
    minutes: 60,            // Duration: 1 hour
    rated: true,            // Rated games
    variant: "standard",    // Standard chess
    intervalHours: 3,       // Create new arena every 3 hours (matches workflow schedule)
  },

  // Fixed tournament schedule - every 3 hours starting at specific UTC hours
  schedule: {
    startHours: [0, 3, 6, 9, 12, 15, 18, 21], // Every 3 hours in UTC (matches workflow)
    timezone: 'UTC'
  }
};
