export const config = {
  server: "https://lichess.org",
  team: "darkonteams", // team ID
  oauthToken: process.env.OAUTH_TOKEN!, // OAuth token from environment variables
  daysInAdvance: 1, // How many days in advance to create tournaments
  dryRun: false, // true = simulate only, false = actually create

  arena: {
    name: () => "Hourly Ultrabullet", // Removed "Arena" - Lichess adds it automatically
    description: (nextLink?: string) => `Hourly Ultrabullet tournaments by DarkOnTeams team!`,
    
    // Tournament settings - ULTRABULLET (15+0)
    clockTime: 0.25,        // Minutes -> 0.25 = 15 seconds
    clockIncrement: 0,      // No increment
    minutes: 60,            // Duration: 1 hour
    rated: true,            // Rated games
    variant: "standard",    // Standard chess
    intervalHours: 1,       // Create new arena every 1 hour
  },
};
