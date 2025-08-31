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
 * Create Swiss Tournament (since this works) but with arena-like settings
 */
async function createSwissAsArena(startDate: Date, nextLink: string) {
  const date = new Date(startDate);

  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    "clock.limit": String(config.arena.clockTime * 60), // Convert minutes to seconds
    "clock.increment": String(config.arena.clockIncrement),
    nbRounds: "7", // More rounds to make it feel like an arena
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startsAt: date.toISOString(),
  });

  console.log(`Creating Swiss tournament (arena-style) on ${date.toISOString()} UTC for team ${config.team}`);

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
  console.log("✅ Swiss tournament (arena-style) created:", url);
  return url;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now);

  const tournamentsPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalTournaments = tournamentsPerDay * config.daysInAdvance;

  console.log(`\n🏆 Creating ${totalTournaments} Swiss Tournaments (Arena-style)`);
  console.log(`⚡ Time Control: ${config.arena.clockTime * 60}+${config.arena.clockIncrement} (Ultrabullet)`);
  console.log(`🎯 Format: Swiss with 7 rounds (feels like arena)`);
  console.log(`🔄 Frequency: Every ${config.arena.intervalHours} hour(s)`);
  console.log(`👥 Team: ${config.team} (Team Swiss tournaments)`);
  console.log(`📅 Starting from: ${firstStart.toISOString()}`);
  console.log(`📊 Days in advance: ${config.daysInAdvance}`);
  console.log("");

  let prevTournamentUrl: string | null = null;

  for (let i = 0; i < totalTournaments; i++) {
    console.log(`\n--- Tournament ${i + 1}/${totalTournaments} ---`);
    
    // Add delay to avoid rate limiting (except for first iteration)
    if (i > 0) {
      console.log("⏳ Waiting 30 seconds to avoid rate limiting...");
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    const startDate = new Date(
      firstStart.getTime() + i * config.arena.intervalHours * 60 * 60 * 1000
    );

    try {
      const tournamentUrl = await createSwissAsArena(startDate, prevTournamentUrl ?? "tba");
      if (tournamentUrl && tournamentUrl !== "dry-run") {
        prevTournamentUrl = tournamentUrl;
      }
    } catch (error) {
      console.error("❌ Error creating tournament:", error);
    }
  }

  console.log("\n🎉 === Swiss Tournament (Arena-style) creation completed ===");
  if (prevTournamentUrl) {
    console.log(`🔗 Last tournament created: ${prevTournamentUrl}`);
  }
  console.log("✅ All tournaments scheduled successfully!");
  console.log("📍 Check them at: https://lichess.org/team/bluekinglk");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
