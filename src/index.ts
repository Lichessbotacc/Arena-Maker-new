import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes", // dein Team-Slug
  oauthToken: process.env.OAUTH_TOKEN!,
  daysInAdvance: 1, // wie viele Tage im Voraus Arenen erstellt werden
  dryRun: false,
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25, // 15 Sekunden
    clockIncrement: 0,
    minutes: 120, // 2 Stunden
    rated: true,
    variant: "standard",
    intervalHours: 2, // alle 2 Stunden eine Arena
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

  if (config.dryRun) {
    console.log("DRY RUN Arena:", Object.fromEntries(body));
    return;
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

  const data = await res.json();
  const url = `${config.server}/tournament/${data.id}`;
  console.log("Arena created:", url);
  return url;
}

async function main() {
  const now = new Date();
  const arenasPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalArenas = arenasPerDay * config.daysInAdvance;

  console.log(`Creating ${totalArenas} arenas`);

  let prevUrl: string | null = null;

  for (let i = 0; i < totalArenas; i++) {
    // auf nächste gerade Stunde runden
    const startDate = new Date(now);
    startDate.setUTCMinutes(0, 0, 0);

    const nextHour = Math.ceil(now.getUTCHours() / config.arena.intervalHours) * config.arena.intervalHours;
    startDate.setUTCHours(nextHour + i * config.arena.intervalHours);

    // +1 Minute Sicherheitspuffer, damit "in Zukunft"
    startDate.setUTCMinutes(1, 0, 0);

    console.log(`Creating arena at ${startDate.toISOString()} (ms=${startDate.getTime()})`);

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) {
      prevUrl = arenaUrl;
    }
  }
}

main().catch((err) => console.error(err));
