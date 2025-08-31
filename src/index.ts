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
 * Try to create team-restricted Arena tournament
 */
async function createTeamArena(startDate: Date, nextLink: string) {
  const date = new Date(startDate);

  // Try different approaches to create team arena
  const approaches = [
    // Approach 1: Team conditions
    {
      name: "Team Conditions",
      body: new URLSearchParams({
        name: "Hourly Ultrabullet Arena",
        description: `Must be in team bluekinglk

24/7 Ultrabullet tournaments: https://lichess.org/team/bluekinglk/tournaments

Next tournament: ${nextLink ?? "coming soon"}

Join our team: https://lichess.org/team/bluekinglk

Have fun!`,
        clockTime: String(config.arena.clockTime),
        clockIncrement: String(config.arena.clockIncrement),
        minutes: String(config.arena.minutes),
        rated: config.arena.rated ? "true" : "false",
        variant: config.arena.variant,
        startDate: date.toISOString(),
        "conditions.teamMember.teamId": config.team,
      })
    },
    // Approach 2: Team battle with single team
    {
      name: "Team Battle",
      body: new URLSearchParams({
        name: "Hourly Ultrabullet Arena",
        description: `Must be in team bluekinglk

24/7 Ultrabullet tournaments: https://lichess.org/team/bluekinglk/tournaments

Next tournament: ${nextLink ?? "coming soon"}

Join our team: https://lichess.org/team/bluekinglk

Have fun!`,
        clockTime: String(config.arena.clockTime),
        clockIncrement: String(config.arena.clockIncrement),
        minutes: String(config.arena.minutes),
        rated: config.arena.rated ? "true" : "false",
        variant: config.arena.variant,
        startDate: date.toISOString(),
        teamBattleByTeam: config.team,
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
      console.log(`✅ Arena created with ${approach.name}:`, url);
      return url;
    } else {
      const errText = await res.text();
      console.error(`❌ ${approach.name} failed:`, res.status, errText);
    }
  }

  console.error("❌ All approaches failed - creating public arena as fallback");
  
  // Fallback: Create public arena
  const fallbackBody = new URLSearchParams({
    name: "Hourly Ultrabullet Arena",
    description: `Hosted by bluekinglk team

24/7 Ultrabullet tournaments: https://lichess.org/team/bluekinglk/tournaments

Join our team: https://lichess.org/team/bluekinglk

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
    console.log("✅ Public arena created as fallback:", url);
    return url;
  }

  return null;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now);

  const arenasPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalArenas = arenasPerDay * config.daysInAdvance;

  console.log(`\n🏆 Attempting to create ${totalArenas} Team Arena Tournaments`);
  console.log(`⚡ Time Control: ${config.arena.clockTime * 60}+${config.arena.clockIncrement} (Ultrabullet)`);
  console.log(`⏱️  Duration: ${config.arena.minutes} minutes`);
  console.log(`🔄 Frequency: Every ${config.arena.intervalHours} hour(s)`);
  console.log(`👥 Team: ${config.team} (Attempting team restriction)`);
  console.log(`📅 Starting from: ${firstStart.toISOString()}`);
  console.log(`📊 Days in advance: ${config.daysInAdvance}`);
  console.log("");
  console.log("🔬 Testing multiple approaches to create team arenas...");
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
      const arenaUrl = await createTeamArena(startDate, prevArenaUrl ?? "tba");
      if (arenaUrl && arenaUrl !== "dry-run") {
        prevArenaUrl = arenaUrl;
      }
    } catch (error) {
      console.error("❌ Error creating arena:", error);
    }
  }

  console.log("\n🎉 === Arena creation completed ===");
  if (prevArenaUrl) {
    console.log(`🔗 Last arena created: ${prevArenaUrl}`);
  }
  console.log("✅ Check results and see which approach worked!");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
