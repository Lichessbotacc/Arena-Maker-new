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
 * Create Team-Only Ultrabullet Arena Tournament
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
    conditions: JSON.stringify({
      teamMember: {
        teamId: config.team
      }
    })
  });

  console.log(`Creating team-only Hourly Ultrabullet Arena on ${date.toISOString()} UTC for team ${config.team}`);

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
  console.log("Hourly Ultrabullet Arena created:", url);
  return url;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now);

  const arenasPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalArenas = arenasPerDay * config.daysInAdvance;

  console.log(`\n🏆 Creating ${totalArenas} Team-Only Hourly Ultrabullet Arenas`);
  console.log(`⚡ Time Control: ${config.arena.clockTime * 60}+${config.arena.clockIncrement} (Ultrabullet)`);
  console.log(`⏱️  Duration: ${config.arena.minutes} minutes`);
  console.log(`🔄 Frequency: Every ${config.arena.intervalHours} hour(s)`);
  console.log(`👥 Team: ${config.team} (Only team members can join)`);
  console.log(`🌍 Type: Team-restricted Arena`);
  console.log(`📅 Starting from: ${firstStart.toISOString()}`);
  console.log(`📊 Days in advance: ${config.daysInAdvance}`);
  console.log("");

  let prevArenaUrl: string | null = null;

  for (let i = 0; i < totalArenas; i++) {
    console.log(`\n--- Arena ${i + 1}/${totalArenas} ---`);
    
    // Add delay to avoid rate limiting (except for first iteration)
    if (i > 0) {
      console.log("⏳ Waiting 30 seconds to avoid rate limiting...");
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    const startDate = new Date(
      firstStart.getTime() + i * config.arena.intervalHours * 60 * 60 * 1000
    );

    try {
      const arenaUrl = await createArena(startDate, prevArenaUrl ?? "tba");
      if (arenaUrl && arenaUrl !== "dry-run") {
        prevArenaUrl = arenaUrl;
      }
    } catch (error) {
      console.error("❌ Error creating arena:", error);
    }
  }

  console.log("\n🎉 === Hourly Ultrabullet Arena creation completed ===");
  if (prevArenaUrl) {
    console.log(`🔗 Last arena created: ${prevArenaUrl}`);
  }
  console.log("✅ All tournaments scheduled successfully!");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
