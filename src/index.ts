import fetch from "node-fetch";
import { URLSearchParams } from "url";
import { config } from "./config";

function assertEnv() {
  console.log("Debug: OAUTH_TOKEN is set:", !!process.env.OAUTH_TOKEN);
  console.log("Debug: OAUTH_TOKEN length:", process.env.OAUTH_TOKEN ? process.env.OAUTH_TOKEN.length : 0);
  if (!config.oauthToken) {
    throw new Error("OAUTH_TOKEN missing. Set the OAUTH_TOKEN environment variable.");
  }
}

/**
 * Get next UTC hour: 00:00, 01:00, 02:00, 03:00 ...
 */
function nextUtcHour(from: Date): Date {
  const d = new Date(from);
  const h = d.getUTCHours();
  const nextHour = h + 1;
  d.setUTCHours(nextHour, 0, 0, 0);
  return d;
}

/**
 * Try to create team-restricted Arena tournament
 */
async function createTeamArena(startDate: Date, nextTournamentUrl: string) {
  const date = new Date(startDate);

  // Try different approaches to create team arena
  const approaches = [
    // Approach 1: Team conditions (preferred - creates regular arena with team restriction)
    {
      name: "Team Conditions",
      body: new URLSearchParams({
        name: config.arena.name(),
        description: `THE HOURLY ULTRABULLET TOURNAMENTS ARE BACK!!!

Next tournament: ${nextTournamentUrl}

New Year Money Swiss: https://lichess.org/swiss/8rDR3Mbi
DarkOnCrack Birthday Money Swiss: https://lichess.org/swiss/B032EEeq
Our Discord Group: https://discord.gg/cNS3u7Gnbn
Our Whatsapp Group: https://chat.whatsapp.com/CLdKn9VzUrL0VN2vrcOJDT?mode=ac_t

Have fun!`,
        clockTime: String(config.arena.clockTime),
        clockIncrement: String(config.arena.clockIncrement),
        minutes: String(config.arena.minutes),
        rated: config.arena.rated ? "true" : "false",
        variant: config.arena.variant,
        startDate: date.toISOString(),
        "conditions.teamMember.teamId": config.team,
      })
    }
  ];

  console.log(`Trying to create team arena on ${date.toISOString()} UTC for team ${config.team}`);

  if (config.dryRun) {
    console.log("DRY RUN - would try multiple approaches");
    return "dry-run";
  }

  // Try each approach
  for (const approach of approaches) {
    console.log(`\nTrying approach: ${approach.name}`);
    console.log("Making API request to:", `${config.server}/api/tournament`);
    console.log("Request body:", Object.fromEntries(approach.body));

    const res = await fetch(`${config.server}/api/tournament`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.oauthToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: approach.body,
    });

    console.log("Response status:", res.status);
    console.log("Response headers:", Object.fromEntries(res.headers.entries()));

    if (res.ok) {
      const data = await res.json();
      console.log("Response body:", data);
      const url = data.id ? `${config.server}/tournament/${data.id}` : res.headers.get("Location");
      console.log(`Arena created with ${approach.name}:`, url);
      return url;
    } else {
      const errText = await res.text();
      console.error(`${approach.name} failed:`, res.status, errText);
      
      // If rate limited, wait longer before trying next approach
      if (res.status === 429) {
        console.log("Rate limited - waiting 3 minutes before next approach...");
        await new Promise(resolve => setTimeout(resolve, 180000)); // 3 minutes
      }
    }
  }

  console.error("All approaches failed - creating public arena as fallback");
  
  // Fallback: Create public arena
  const fallbackBody = new URLSearchParams({
    name: config.arena.name(),
    description: `Hosted by darkonteams team

Next tournament: ${nextTournamentUrl}

Join our team: https://lichess.org/team/darkonteams

Have fun!`,
    clockTime: String(config.arena.clockTime),
    clockIncrement: String(config.arena.clockIncrement),
    minutes: String(config.arena.minutes),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: date.toISOString(),
  });

  const fallbackRes = await fetch(`${config.server}/api/tournament`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.oauthToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: fallbackBody,
  });

  if (fallbackRes.ok) {
    const data = await fallbackRes.json();
    const url = data.id ? `${config.server}/tournament/${data.id}` : fallbackRes.headers.get("Location");
    console.log("Public arena created as fallback:", url);
    return url;
  }

  return null;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextUtcHour(now);

  console.log(`\n=== Creating 3 Hourly UltraBullet Tournaments ===`);
  console.log(`Time Control: ${config.arena.clockTime * 60}+${config.arena.clockIncrement} (UltraBullet)`);
  console.log(`Duration: ${config.arena.minutes} minutes each`);
  console.log(`Team: ${config.team} (DarkOnTeams)`);
  console.log(`First tournament starts: ${firstStart.toISOString()}`);
  console.log(`Creating tournaments for: ${firstStart.toISOString()}, ${new Date(firstStart.getTime() + 60*60*1000).toISOString()}, ${new Date(firstStart.getTime() + 2*60*60*1000).toISOString()}`);
  console.log("");

  const createdTournaments = [];

  try {
    // Create tournaments in normal order (1→2→3) but with smart linking
    console.log("Creating tournaments in chronological order...");
    
    // First pass: Create all tournaments with temporary "next tournament" text
    const tempTournaments = [];
    
    for (let i = 0; i < 3; i++) {
      console.log(`\n--- Creating Tournament ${i + 1}/3 ---`);
      
      // Add delay between tournaments (except first)
      if (i > 0) {
        console.log("Waiting 2 minutes to avoid rate limiting...");
        await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
      }

      const startDate = new Date(firstStart.getTime() + i * 60 * 60 * 1000); // Each hour
      
      // For now, use team page as next tournament link
      // We'll update this after all tournaments are created
      const nextTournamentUrl = "https://lichess.org/team/darkonteams/tournaments";

      console.log(`Creating tournament for ${startDate.toISOString()}`);
      const arenaUrl = await createTeamArena(startDate, nextTournamentUrl);
      
      if (arenaUrl && arenaUrl !== "dry-run") {
        tempTournaments.push({
          url: arenaUrl,
          startTime: startDate,
          index: i
        });
        console.log(`✅ Tournament ${i + 1} created: ${arenaUrl}`);
      } else {
        console.error(`❌ Tournament ${i + 1} creation failed`);
      }
    }

    // Copy to main array
    createdTournaments.push(...tempTournaments);

    // Summary
    console.log("\n=== Tournament Creation Summary ===");
    if (createdTournaments.length > 0) {
      console.log(`✅ Successfully created ${createdTournaments.length}/3 tournaments:`);
      createdTournaments.forEach((tournament, index) => {
        console.log(`   ${index + 1}. ${tournament.url} (starts: ${tournament.startTime.toISOString()})`);
      });
    } else {
      console.log("❌ No tournaments were created successfully");
      process.exit(1);
    }

  } catch (error) {
    console.error("Error in tournament creation process:", error);
    process.exit(1);
  }

  console.log("\nCheck all tournaments at: https://lichess.org/team/darkonteams/tournaments");
  console.log("Next workflow will run in 3 hours to create the next batch of tournaments.");
  
  // Properly exit the process to prevent workflow from hanging
  console.log("Process completed successfully. Exiting...");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
