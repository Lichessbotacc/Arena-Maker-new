import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes",
  oauthToken: process.env.OAUTH_TOKEN!, // muss in GitHub Actions gesetzt sein
  daysInAdvance: 1, // wie viele Tage im Voraus Arenen erstellt werden
  dryRun: false,
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
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
    startDate: Math.floor(startDate.getTime() / 1000).toString(), // ✅ Unix Timestamp in Sekunden
    teamId: config.team,
  });

  if (config.dryRun) {
    console.log("DRY RUN Arena:", Object.fromEntries(body));
    return;
  }

  console.log("Creating arena starting at:", startDate.toISOString());

  const res = await fetch(`${config.server}/api/tournament`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.oauthToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Arena creation failed:", res.status, err);
    return;
  }

  const data = await res.json();
  const url = `${config.server}/tournament/${data.id}`;
  console.log("Arena created:", url);
  return url;
}

async function main() {
  if (!config.oauthToken) {
    throw new Error("No OAuth token provided. Did you set OAUTH_TOKEN?");
  }
  console.log("Using Lichess token:", config.oauthToken.slice(0, 8) + "...");

  const now = new Date();
  const arenasPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalArenas = arenasPerDay * config.daysInAdvance;

  console.log(`Creating ${totalArenas} arenas in advance`);

  let prevUrl: string | null = null;

  for (let i = 0; i < totalArenas; i++) {
    const startDate = new Date(now);
    // auf gerade 2h-Stunde runden
    startDate.setUTCHours(Math.floor(now.getUTCHours() / 2) * 2, 0, 0, 0);
    // + Intervall draufpacken
    startDate.setUTCHours(startDate.getUTCHours() + (i + 1) * config.arena.intervalHours);

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) {
      prevUrl = arenaUrl;
    }
  }
}

main().catch((err) => console.error(err));
