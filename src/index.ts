import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes", // Team-Slug aus der Lichess-URL
  oauthToken: process.env.OAUTH_TOKEN!,
  daysInAdvance: 1, // wie viele Tage im Voraus Arenen erstellt werden
  dryRun: false,
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25, // Minuten → 15 Sekunden
    clockIncrement: 0,
    minutes: 90, // Länge der Arena in Minuten
    rated: true,
    variant: "standard",
    intervalHours: 2, // alle 2 Stunden
  },
};

async function createArena(startDate: Date, nextLink: string) {
  // API erwartet Sekunden für clock.limit
  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    "clock.limit": Math.round(config.arena.clockTime * 60).toString(), // Sekunden
    "clock.increment": config.arena.clockIncrement.toString(),
    minutes: config.arena.minutes.toString(),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: startDate.toISOString(),
  });

  console.log("➡️ Arena request body:", Object.fromEntries(body));

  if (config.dryRun) {
    console.log("✅ DRY RUN Arena:", Object.fromEntries(body));
    return "dry-run-url";
  }

  const res = await fetch(
    `${config.server}/api/team/${config.team}/arena/new`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.oauthToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Arena creation failed:", err);
    return;
  }

  const url = res.headers.get("Location");
  console.log("✅ Arena created:", url);
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
    startDate.setUTCHours(
      Math.floor(now.getUTCHours() / config.arena.intervalHours) *
        config.arena.intervalHours,
      0,
      0,
      0
    );
    startDate.setUTCHours(
      startDate.getUTCHours() + (i + 1) * config.arena.intervalHours
    );

    // mindestens 2 Minuten in der Zukunft
    if (startDate.getTime() < Date.now() + 2 * 60 * 1000) {
      startDate.setTime(Date.now() + 2 * 60 * 1000);
    }

    console.log(
      `Creating arena at ${startDate.toISOString()} (ms=${startDate.getTime()})`
    );
    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) {
      prevUrl = arenaUrl;
    }
  }
}

main().catch((err) => console.error(err));
