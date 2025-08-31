export const config = {
  server: "https://lichess.org",
  team: "aggressivebot", // Your team ID from the team URL
  oauthToken: process.env.OAUTH_TOKEN!, // OAuth token from environment variables
  daysInAdvance: 1, // How many days in advance to create tournaments
  dryRun: false, // true = simulate only, false = actually create

  arena: {
    name: () => "Hourly Ultrabullet Arena",
    description: (nextLink?: string) => `Next: ${nextLink ?? "coming soon"}`,
    
    // Tournament settings
    clockTime: 0.25,        // Minutes -> 0.25 = 15 seconds
    clockIncrement: 0,      // Increment in seconds
    minutes: 60,            // Duration in minutes
    rated: true,            // Rated games
    variant: "standard",    // "standard", "chess960", etc.
    intervalHours: 1,       // Create new arena every 1 hour
  },

  swiss: {
    name: () => "Hourly Ultrabullet Swiss",
    description: (nextLink?: string) => `Next: ${nextLink ?? "coming soon"}`,
    
    // Tournament settings
    clockTime: 0.25,        // Minutes -> 0.25 = 15 seconds
    clockIncrement: 0,      // Increment in seconds
    nbRounds: 5,           // Number of rounds
    rated: true,            // Rated games
    variant: "standard",    // "standard", "chess960", etc.
    intervalHours: 1,       // Create new Swiss every 1 hour
  },

  // Control which tournament types to create
  createArenas: true,  // Create public arena tournaments
  createSwiss: true,   // Create team Swiss tournaments (requires team leadership)
};
