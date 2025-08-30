import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes",
  oauthToken: process.env.OAUTH_TOKEN!,
  daysInAdvance: 1, // wie viele Tage im Voraus Arenen erstellt werden
  dryRun: false,
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`, // ✅ Backtick korrekt geschlossen
    clockTime: 0.25, // 15 Sekunden (Ultrabullet)
    clockIncrement: 0,
    minutes: 120, // Länge: 2 Stunden
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

  const res = await fetch(`${config.server}/api/tournament`, { ... })
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
    const startDate = new Date(now);
    startDate.setUTCHours(Math.floor(now.getUTCHours() / 2) * 2, 0, 0, 0);
    startDate.setUTCHours(startDate.getUTCHours() + (i + 1) * config.arena.intervalHours);

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) {
      prevUrl = arenaUrl;
    }
  }
}

main().catch((err) => console.error(err));
