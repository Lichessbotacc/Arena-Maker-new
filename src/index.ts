import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "aggressivebot",              // Team-ID aus der URL
  oauthToken: process.env.OAUTH_TOKEN!, // dein Token (in GitHub Actions gesetzt)
  daysInAdvance: 1,                     // wie viele Tage im Voraus
  dryRun: false,                        // true = nur simulieren, false = wirklich erstellen
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25,       // Minuten pro Spieler (0.25 = 15 Sekunden)
    clockIncrement: 0,
    minutes: 120,          // Turnierdauer (2h)
    rated: true,
    variant: "standard",
    intervalHours: 2,      // alle 2 Stunden
  },
};

function assertEnv() {
  console.log("Debug: OAUTH_TOKEN is set:", !!process.env.OAUTH_TOKEN);
  console.log("Debug: OAUTH_TOKEN length:", process.env.OAUTH_TOKEN ? process.env.OAUTH_TOKEN.length : 0);
  if (!config.oauthToken) {
    throw new Error("OAUTH_TOKEN fehlt. Setze die Umgebungsvariable OAUTH_TOKEN.");
  }
}

/**
 * Liefert nächste gerade UTC-Stunde: 00:00, 02:00, 04:00 ...
 */
function nextEvenUtcHour(from: Date): Date {
  const d = new Date(from);
  const h = d.getUTCHours();
  const nextEven = Math.floor(h / 2) * 2 + 2;
  d.setUTCHours(nextEven, 0, 0, 0);
  return d;
}

async function createArena(startDate: Date, nextLink: string) {
  // Datum in YYYY-MM-DD
  const dateStr = startDate.toISOString().slice(0, 10);

  // Uhrzeit in HH:mm (UTC)
  const timeStr = startDate.toISOString().slice(11, 16);

  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    "clock.limit": String(Math.round(config.arena.clockTime * 60)), // in Sekunden
    "clock.increment": String(config.arena.clockIncrement),
    minutes: String(config.arena.minutes),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: dateStr,
    startTime: timeStr,
  });

  console.log(`Creating arena on ${dateStr} at ${timeStr} UTC`);

  if (config.dryRun) {
    console.log("DRY RUN Arena:", Object.fromEntries(body));
    return "dry-run";
  }

  console.log("Making API request to:", `${config.server}/api/team/${config.team}/arena/new`);
  console.log("Request body:", Object.fromEntries(body));

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

  console.log("Response status:", res.status);
  console.log("Response headers:", Object.fromEntries(res.headers.entries()));

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

  console.log(`Creating ${totalArenas} arenas for team ${config.team}`);

  let prevUrl: string | null = null;

  for (let i = 0; i < totalArenas; i++) {
    const startDate = new Date(
      firstStart.getTime() + i * config.arena.intervalHours * 60 * 60 * 1000
    );

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) prevUrl = arenaUrl;
  }
}

main().catch((err) => console.error(err));
