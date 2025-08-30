import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes",                // dein Team
  oauthToken: process.env.OAUTH_TOKEN!, // GitHub Secret
  daysInAdvance: 1,                     // wie viele Tage im Voraus Arenen erstellt werden
  dryRun: false,                        // auf true lassen zum Testen
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25,  // 15 Sekunden = Ultrabullet
    clockIncrement: 0,
    minutes: 90,      // Länge der Arena in Minuten
    rated: true,
    variant: "standard",
    intervalHours: 2, // alle 2 Stunden
  },
};

async function createArena(startDate: Date, nextLink: string) {
  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    clockTime: config.arena.clockTime.toString(),
    clockIncrement: config.arena.clockIncrement.toString(),
    minutes: config.arena.minutes.toString(),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: startDate.toISOString(),
    teamId: config.team,
  });

  console.log(`Creating arena at ${startDate.toISOString()} (ms=${startDate.getTime()})`);
  console.log("➡️ Arena request body:", Object.fromEntries(body));

  if (config.dryRun) {
    console.log("✅ DRY RUN Arena:", Object.fromEntries(body));
    return `dry-run-url`;
  }

  const res = await fetch(`${config.server}/api/team/${config.team}/arena/new`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.oauthToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Arena creation failed:", err);
    return;
  }

  const url = res.headers.get("Location");
  console.log("🎉 Arena created:", url);
  return url;
}

async function main() {
  const now = new Date();
  const arenasPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalArenas = arenasPerDay * config.daysInAdvance;

  console.log(`Creating ${totalArenas} arenas`);

  let prevUrl: string | null = null;

  for (let i = 0; i < totalArenas; i++) {
    const startDate = new Date(now);
    startDate.setUTCMinutes(startDate.getUTCMinutes() + 5); // mindestens 5 Min. in Zukunft
    startDate.setUTCHours(
      Math.floor(startDate.getUTCHours() / config.arena.intervalHours) * config.arena.intervalHours
    );
    startDate.setUTCHours(startDate.getUTCHours() + (i + 1) * config.arena.intervalHours, 0, 0, 0);

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) {
      prevUrl = arenaUrl;
    }
  }
}

main().catch((err) => console.error(err));
