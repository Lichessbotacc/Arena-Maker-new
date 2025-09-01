export const config = {
  server: "https://lichess.org",
  team: "rare", // team ID
  oauthToken: process.env.OAUTH_TOKEN!, // OAuth token from environment variables
  daysInAdvance: 0, // Create tournaments for current time slot only
  dryRun: false, // true = simulate only, false = actually create

  arena: {
    name: () => "Hourly UltraBullet", // Lichess will add "Arena" automatically
    description: (nextLink?: string) => `Professional Ultrabullet tournaments by DarkOnTeams team!`,
    
    // Tournament settings - ULTRABULLET (15+0)
    clockTime: 0.25,        // Minutes -> 0.25 = 15 seconds
    clockIncrement: 0,      // No increment
    minutes: 60,            // Duration: 1 hour
    rated: true,            // Rated games
    variant: "standard",    // Standard chess
    intervalHours: 1,       // Create new arena every 1 hour (hourly schedule)
  },

  // Fixed tournament schedule - every hour starting at each UTC hour
  schedule: {
    startHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], // Every hour in UTC
    timezone: 'UTC'
  }
};
