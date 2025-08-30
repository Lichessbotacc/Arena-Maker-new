import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes", // Team-Slug oder ID
  oauthToken: process.env.OAUTH_TOKEN!,
  daysInAdvance: 1, // wie viele Tage im Voraus Arenen erstellt werden
  dryRun: false,
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25, // 15 Sekunden
    clockIncrement: 0,
    minutes: 120, // Dauer: 2 Stunden
    rated: true,
    variant: "standard",
    intervalHours: 2, // alle 2 Stunden eine Arena
  },
};

function nextEvenUtcHour(from: Date): Date {
  const d = new Date(from);
  const h = d.getUTCHours();
  const nextEven = Math.floor(h / 2) * 2 + 2; // nächste gerade Stunde
  d.setUTCHours(nextEven, 0, 0, 0);
  return d;
}

async function createArena(startDate: Date, nextLink: string) {
  const startDateMs = startDate.getTime(); // ✅ Lichess erwartet ms

  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    clockTime: String(config.arena.clockTime),
    clockIncrement: String(config.arena.clockIncrement),
    minutes: String(config.arena.minutes),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: String(startDateMs),
  });

  console.log(`Creating arena at ${startDate.toISOString()} (ms=${startDateMs})`);

  if (config.dryRun) {
    console.log("DRY RUN Arena:", Object.fromEntries(body));
    return "dry-run";
  }

  const res = await fetch(
    `${config.server}/api/team/${config.team}/arena`, // ✅ richtiges Endpoint
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.oauthToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    }
  );

  if (!res.ok) {
    console.error("Arena creation failed:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const url = `${config.server}/tournament/${data.id}`;
  console.log("Arena created:", url);
  return url;
}

async function main() {
  const now = new Date();
  const firstStart = nextEvenUtcHour(now);
  const arenasPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalArenas = arenasPerDay * config.daysInAdvance;

  let prevUrl: string | null = null;
  for (let i = 0; i < totalArenas; i++) {
    const startDate = new Date(
      firstStart.getTime() + i * config.arena.intervalHours * 60 * 60 * 1000
    );

    // ✅ Sicherheits-Puffer: mindestens 5 Min in die Zukunft
    const minFuture = Date.now() + 5 * 60 * 1000;
    if (startDate.getTime() <= minFuture) {
      startDate.setUTCHours(startDate.getUTCHours() + config.arena.intervalHours);
    }

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) prevUrl = arenaUrl;
  }
}

main().catch(console.error);
