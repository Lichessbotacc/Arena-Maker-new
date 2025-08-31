export const config = {
  server: "https://lichess.org",
  team: "bluekinglk", // Your team ID
  oauthToken: process.env.OAUTH_TOKEN!, // OAuth token from environment variables
  daysInAdvance: 1, // How many days in advance to create tournaments
  dryRun: false, // true = simulate only, false = actually create

  arena: {
    name: () => "Hourly Ultrabullet Arena",
    description: (nextLink?: string) => `24/7 Ultrabullet tournaments!

Next tournament: ${nextLink ?? "coming soon"}

Join our team: https://lichess.org/team/bluekinglk

Have fun!`,
    
    // Tournament settings - ULTRABULLET (15+0)
    clockTime: 0.25,        // Minutes -> 0.25 = 15 seconds
    clockIncrement: 0,      // No increment
    minutes: 60,            // Duration: 1 hour
    rated: true,            // Rated games
    variant: "standard",    // Standard chess
    intervalHours: 1,       // Create new arena every 1 hour
  },
};
