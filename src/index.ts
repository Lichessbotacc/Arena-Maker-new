import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes",               // dein Team
  oauthToken: process.env.OAUTH_TOKEN!,// GitHub Secret
  daysInAdvance: 1,                    // wie viele Tage im Voraus
  dryRun: true,                        // ⚡ TESTMODUS: nichts wird erstellt
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25,                   // 15 Sekunden (Ultrabullet)
    clockIncrement: 0,
    minutes: 120,                      // 2 Stunden Turnierdauer
    rated: true,
    variant: "standard",
    intervalHours: 2,                  // alle 2 Stunden
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

  console.log("Creating arena at", startDate.toISOString(), "(ms=" + startDate.getTime() + ")");
  console.log("➡️ Arena request body:", Object.fromEntries(body));

  if (config.dryRun) {
    console.log("✅ DRY RUN Arena:", Object.fromEntries(body));
    return "dry-run-url";
  }

  const res = await fetch(`${config.server}/api/tournament/arena`, {
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
    startDate.setUTCMinutes(0, 0, 0);
    startDate.setUTCHours(Math.floor(now.getUTCHours() / config.arena.intervalHours) * config.arena.intervalHours);
    startDate.setUTCHours(startDate.getUTCHours() + (i + 1) * config.arena.intervalHours);

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) {
      prevUrl = arenaUrl;
    }
  }
}

main().catch((err) => console.error(err));
