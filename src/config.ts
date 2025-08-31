export const config = {
  server: "https://lichess.org",
  team: "aggressivebot", // Your team ID from the team URL
  oauthToken: process.env.OAUTH_TOKEN!, // OAuth token from environment variables
  daysInAdvance: 1, // How many days in advance to create tournaments
  dryRun: false, // true = simulate only, false = actually create

  arena: {
    name: () => "Hourly Ultrabullet Team Battle",
    description: (nextLink?: string) => `Next: ${nextLink ?? "coming soon"}`,
    
    // Tournament settings - ULTRABULLET (15+0)
    clockTime: 0.25,        // Minutes -> 0.25 = 15 seconds
    clockIncrement: 0,      // No increment
    minutes: 60,            // Duration: 1 hour
    rated: true,            // Rated games
    variant: "standard",    // Standard chess
    intervalHours: 1,       // Create new arena every 1 hour
  },

  swiss: {
    name: () => "Hourly Blitz Swiss",
    description: (nextLink?: string) => `Next: ${nextLink ?? "coming soon"}`,
    
    // Tournament settings - BLITZ (3+0)
    clockTime: 3,           // Minutes -> 3 minutes
    clockIncrement: 0,      // No increment
    nbRounds: 5,           // Number of rounds
    rated: true,            // Rated games
    variant: "standard",    // Standard chess
    intervalHours: 1,       // Create new Swiss every 1 hour
  },

  // Control which tournament types to create
  createArenas: true,  // Create team battle arena tournaments (Ultrabullet 15+0)
  createSwiss: true,   // Create team Swiss tournaments (Blitz 3+0) - requires team leadership
};
