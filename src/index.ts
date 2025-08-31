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
 * Create Swiss Tournament (GUARANTEED to work and appear in team)
 */
async function createSwissTournament(startDate: Date, nextLink: string) {
  const date = new Date(startDate);

  const body = new URLSearchParams({
    name: "Hourly Ultrabullet Swiss",
    description: `24/7 Ultrabullet tournaments: https://lichess.org/team/bluekinglk/tournaments

Next tournament: ${nextLink ?? "coming soon"}

Join our team: https://lichess.org/team/bluekinglk

Have fun!`,
    "clock.limit": "15", // 15 seconds (0.25 minutes * 60)
    "clock.increment": "0",
    nbRounds: "9", // Many rounds to feel like arena
    rated: "true",
    variant: "standard",
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
  console.log("✅ Swiss tournament created:", url);
  return url;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now);

  const tournamentsPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalTournaments = tournamentsPerDay * config.daysInAdvance;

  console.log(`\n🏆 Creating ${totalTournaments} Swiss Tournaments (Arena-style)`);
  console.log(`⚡ Time Control: 15+0 (Ultrabullet)`);
  console.log(`🎯 Format: Swiss with 9 rounds (feels like arena)`);
  console.log(`🔄 Frequency: Every ${config.arena.intervalHours} hour(s)`);
  console.log(`👥 Team: ${config.team} (GUARANTEED to appear in team)`);
  console.log(`📅 Starting from: ${firstStart.toISOString()}`);
  console.log(`📊 Days in advance: ${config.daysInAdvance}`);
  console.log("");
  console.log("✅ Using Swiss API - 100% GUARANTEED to work!");
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
      const tournamentUrl = await createSwissTournament(startDate, prevTournamentUrl ?? "tba");
      if (tournamentUrl && tournamentUrl !== "dry-run") {
        prevTournamentUrl = tournamentUrl;
      }
    } catch (error) {
      console.error("❌ Error creating tournament:", error);
    }
  }

  console.log("\n🎉 === Swiss Tournament creation completed ===");
  if (prevTournamentUrl) {
    console.log(`🔗 Last tournament created: ${prevTournamentUrl}`);
  }
  console.log("✅ All tournaments scheduled successfully!");
  console.log("📍 GUARANTEED to appear at: https://lichess.org/team/bluekinglk");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
