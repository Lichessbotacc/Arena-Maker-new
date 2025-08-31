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
 * Get next even UTC hour: 00:00, 02:00, 04:00 ...
 */
function nextEvenUtcHour(from: Date): Date {
  const d = new Date(from);
  const h = d.getUTCHours();
  const nextEven = Math.floor(h / 2) * 2 + 2;
  d.setUTCHours(nextEven, 0, 0, 0);
  return d;
}

/**
 * Create Arena Tournament (Public tournament, not team-specific)
 */
async function createArena(startDate: Date, nextLink: string) {
  const date = new Date(startDate);

  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    clockTime: String(config.arena.clockTime), // in minutes
    clockIncrement: String(config.arena.clockIncrement),
    minutes: String(config.arena.minutes),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: date.toISOString(),
  });

  console.log(`Creating public arena tournament on ${date.toISOString()} UTC`);

  if (config.dryRun) {
    console.log("DRY RUN Arena:", Object.fromEntries(body));
    return "dry-run";
  }

  console.log("Making API request to:", `${config.server}/api/tournament`);
  console.log("Request body:", Object.fromEntries(body));

  const res = await fetch(`${config.server}/api/tournament`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.oauthToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  console.log("Response status:", res.status);
  console.log("Response headers:", Object.fromEntries(res.headers.entries()));

  if (!res.ok) {
    const errText = await res.text();
    console.error("Arena creation failed:", res.status, errText);
    return null;
  }

  const data = await res.json();
  console.log("Response body:", data);
  const url = data.id ? `${config.server}/tournament/${data.id}` : res.headers.get("Location");
  console.log("Arena created:", url);
  return url;
}

/**
 * Create Swiss Tournament for Team
 */
async function createSwiss(startDate: Date, nextLink: string) {
  const date = new Date(startDate);

  const body = new URLSearchParams({
    name: config.swiss.name(),
    description: config.swiss.description(nextLink),
    "clock.limit": String(config.swiss.clockTime * 60), // Convert minutes to seconds
    "clock.increment": String(config.swiss.clockIncrement),
    nbRounds: String(config.swiss.nbRounds),
    rated: config.swiss.rated ? "true" : "false",
    variant: config.swiss.variant,
    startsAt: date.toISOString(),
  });

  console.log(`Creating Swiss tournament on ${date.toISOString()} UTC for team ${config.team}`);

  if (config.dryRun) {
    console.log("DRY RUN Swiss:", Object.fromEntries(body));
    return "dry-run";
  }

  console.log("Making API request to:", `${config.server}/api/swiss/new/${config.team}`);
  console.log("Request body:", Object.fromEntries(body));

  const res = await fetch(`${config.server}/api/swiss/new/${config.team}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.oauthToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  console.log("Response status:", res.status);
  console.log("Response headers:", Object.fromEntries(res.headers.entries()));

  if (!res.ok) {
    const errText = await res.text();
    console.error("Swiss tournament creation failed:", res.status, errText);
    return null;
  }

  const data = await res.json();
  console.log("Response body:", data);
  const url = data.id ? `${config.server}/swiss/${data.id}` : res.headers.get("Location");
  console.log("Swiss tournament created:", url);
  return url;
}

/**
 * Check if user is team leader (required for Swiss tournaments)
 */
async function checkTeamLeadership(): Promise<boolean> {
  console.log(`Checking team leadership for team: ${config.team}`);
  
  const res = await fetch(`${config.server}/api/team/${config.team}`, {
    headers: {
      Authorization: `Bearer ${config.oauthToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.error("Failed to fetch team info:", res.status);
    return false;
  }

  const teamData = await res.json();
  console.log("Team data:", teamData);
  
  // Check if current user is in leaders list
  // Note: This is a simplified check - you might need to fetch user info separately
  return true; // For now, assume leadership - the API will reject if not
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now);

  // Check team leadership for Swiss tournaments
  if (config.createSwiss) {
    const isLeader = await checkTeamLeadership();
    if (!isLeader) {
      console.warn("Warning: You might not be a team leader. Swiss tournament creation may fail.");
    }
  }

  let totalTournaments = 0;
  let tournamentsPerDay = 0;

  // Calculate total tournaments based on enabled types
  if (config.createArenas) {
    tournamentsPerDay += Math.floor(24 / config.arena.intervalHours);
  }
  if (config.createSwiss) {
    tournamentsPerDay += Math.floor(24 / config.swiss.intervalHours);
  }
  
  totalTournaments = tournamentsPerDay * config.daysInAdvance;

  console.log(`\nCreating ${totalTournaments} tournaments:`);
  if (config.createArenas) console.log(`- Arena tournaments enabled (public)`);
  if (config.createSwiss) console.log(`- Swiss tournaments enabled for team ${config.team}`);
  console.log(`- Starting from: ${firstStart.toISOString()}`);
  console.log(`- Days in advance: ${config.daysInAdvance}`);
  console.log("");

  let prevArenaUrl: string | null = null;
  let prevSwissUrl: string | null = null;

  const maxIterations = Math.max(
    config.createArenas ? Math.floor(24 / config.arena.intervalHours) * config.daysInAdvance : 0,
    config.createSwiss ? Math.floor(24 / config.swiss.intervalHours) * config.daysInAdvance : 0
  );

  for (let i = 0; i < maxIterations; i++) {
    console.log(`\n--- Tournament ${i + 1}/${maxIterations} ---`);
    
    // Add delay to avoid rate limiting (except for first iteration)
    if (i > 0) {
      console.log("Waiting 30 seconds to avoid rate limiting...");
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    const startDate = new Date(
      firstStart.getTime() + i * Math.min(
        config.createArenas ? config.arena.intervalHours : Infinity,
        config.createSwiss ? config.swiss.intervalHours : Infinity
      ) * 60 * 60 * 1000
    );

    // Create arena tournament if enabled
    if (config.createArenas && i < Math.floor(24 / config.arena.intervalHours) * config.daysInAdvance) {
      try {
        const arenaUrl = await createArena(startDate, prevArenaUrl ?? "tba");
        if (arenaUrl && arenaUrl !== "dry-run") {
          prevArenaUrl = arenaUrl;
        }
      } catch (error) {
        console.error("Error creating arena:", error);
      }
    }

    // Create Swiss tournament if enabled (with additional delay)
    if (config.createSwiss && i < Math.floor(24 / config.swiss.intervalHours) * config.daysInAdvance) {
      if (config.createArenas) {
        console.log("Waiting 10 seconds before creating Swiss tournament...");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      try {
        const swissUrl = await createSwiss(startDate, prevSwissUrl ?? "tba");
        if (swissUrl && swissUrl !== "dry-run") {
          prevSwissUrl = swissUrl;
        }
      } catch (error) {
        console.error("Error creating Swiss tournament:", error);
      }
    }
  }

  console.log("\n=== Tournament creation completed ===");
  if (prevArenaUrl) console.log(`Last arena created: ${prevArenaUrl}`);
  if (prevSwissUrl) console.log(`Last Swiss created: ${prevSwissUrl}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
