// src/index.ts
import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes",              // Team-ID (genau wie im Lichess-Link)
  oauthToken: process.env.OAUTH_TOKEN!, // muss gesetzt sein
  daysInAdvance: 1,                     // wie viele Tage im Voraus
  dryRun: false,
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25,        // 15 Sekunden = 0.25 Minuten
    clockIncrement: 0,
    minutes: 120,           // Turnierlänge: 2h
    rated: true,
    variant: "standard",
    intervalHours: 2,       // alle 2 Stunden
  },
};

function assertEnv() {
  if (!config.oauthToken) {
    throw new Error("OAUTH_TOKEN fehlt. Setze die Umgebungsvariable OAUTH_TOKEN.");
  }
}

/**
 * Liefert den nächsten geraden UTC-Stunden-Slot strikt in der Zukunft:
 * ..., 20:00, 22:00, 00:00, 02:00, ...
 */
function nextEvenUtcHour(from: Date): Date {
  const d = new Date(from);
  const h = d.getUTCHours();
  const nextEven = Math.floor(h / 2) * 2 + 2; // immer strikt später
  d.setUTCHours(nextEven, 0, 0, 0);
  return d;
}

async function createArena(startDate: Date, nextLink: string) {
  const startDateMs = startDate.getTime();

  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    "clock.limit": String(Math.round(config.arena.clockTime * 60)), // in Sekunden
    "clock.increment": String(config.arena.clockIncrement),
    minutes: String(config.arena.minutes),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: String(startDateMs), // ms seit Unix epoch
  });

  console.log(
    `Creating arena starting at: ${startDate.toISOString()} (ms=${startDateMs})`
  );

  if (config.dryRun) {
    console.log("DRY RUN Arena:", Object.fromEntries(body));
    return "dry-run";
  }

  // *** FIX: richtige URL! ***
  const res = await fetch(
    `${config.server}/api/team/${config.team}/arena/new`,
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
    const errText = await res.text();
    console.error("Arena creation failed:", res.status, errText);
    return null;
  }

  const url = res.headers.get("Location");
  console.log("Arena created:", url);
  return url;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now);

  const arenasPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalArenas = arenasPerDay * config.daysInAdvance;

  console.log(`Creating ${totalArenas} arenas`);

  let prevUrl: string | null = null;

  for (let i = 0; i < totalArenas; i++) {
    const startDate = new Date(
      firstStart.getTime() + i * config.arena.intervalHours * 60 * 60 * 1000
    );

    if (startDate.getTime() <= Date.now()) {
      startDate.setTime(startDate.getTime() + config.arena.intervalHours * 60 * 60 * 1000);
    }

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) prevUrl = arenaUrl;
  }
}

main().catch((err) => console.error(err));
