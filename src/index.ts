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
async function createTeamArena(startDate: Date, nextTournamentUrl?: string) {
  const date = new Date(startDate);

  // Calculate next tournament time (1 hour later for hourly schedule)
  const nextTournamentTime = new Date(startDate.getTime() + 1 * 60 * 60 * 1000);
  const nextTournamentLink = nextTournamentUrl || `Next tournament starts at ${nextTournamentTime.toISOString().replace('T', ' ').substring(0, 16)} UTC`;

  // Try different approaches to create team arena
  const approaches = [
    // Approach 1: Team conditions (preferred - creates regular arena with team restriction)
    {
      name: "Team Conditions",
      body: new URLSearchParams({
        name: config.arena.name(),
        description: `TEST: HOURLY ULTRABULLET TOURNAMENTS

24/7 Ultrabullet tournaments: https://lichess.org/team/aggressivebot001/tournaments

Next tournament: ${nextTournamentLink}

Testing automated tournament creation.

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
    description: `TEST: Hosted by aggressivebot001 team

24/7 Ultrabullet tournaments: https://lichess.org/team/aggressivebot001/tournaments

Next tournament: ${nextTournamentLink}

Join our team: https://lichess.org/team/aggressivebot001

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
  const nextStart = nextUtcHour(now);

  console.log(`\nCreating Hourly Ultrabullet Tournament`);
  console.log(`Time Control: ${config.arena.clockTime * 60}+${config.arena.clockIncrement} (Ultrabullet)`);
  console.log(`Duration: ${config.arena.minutes} minutes`);
  console.log(`Team: ${config.team} (AggressiveBot001 - Testing)`);
  console.log(`Tournament start time: ${nextStart.toISOString()}`);
  console.log("");

  try {
    // Calculate next tournament time (1 hour later)
    const nextTournamentTime = new Date(nextStart.getTime() + 1 * 60 * 60 * 1000);
    const nextTournamentInfo = `Next tournament: ${nextTournamentTime.toISOString().replace('T', ' ').substring(0, 16)} UTC`;
    
    console.log("Creating hourly tournament for AggressiveBot001 (Testing)...");
    const arenaUrl = await createTeamArena(nextStart, nextTournamentInfo);
    
    if (arenaUrl && arenaUrl !== "dry-run") {
      console.log("\n=== Hourly Tournament created successfully ===");
      console.log(`Tournament URL: ${arenaUrl}`);
      console.log(`Start time: ${nextStart.toISOString()}`);
      console.log(`Next tournament: ${nextTournamentTime.toISOString()}`);
    } else {
      console.log("\n=== Tournament creation failed ===");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error creating tournament:", error);
    process.exit(1);
  }

  console.log("Check all tournaments at: https://lichess.org/team/aggressivebot001");
  
  // Properly exit the process to prevent workflow from hanging
  console.log("Process completed successfully. Exiting...");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
