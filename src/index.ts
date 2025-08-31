import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "aggressivebot",              // Team-ID aus der URL
  oauthToken: process.env.OAUTH_TOKEN!, // dein Token (in GitHub Actions gesetzt)
  daysInAdvance: 1,                     // wie viele Tage im Voraus
  dryRun: false,                        // true = nur simulieren, false = wirklich erstellen
  arena: {
    name: () => "Hourly Ultrabullet Arena",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25,       // Minuten pro Spieler (0.25 = 15 Sekunden)
    clockIncrement: 0,
    minutes: 60,          // Turnierdauer (1h)
    rated: true,
    variant: "standard",
    intervalHours: 1,      // alle 1 Stunde
  },
  swiss: {
    name: () => "Hourly Ultrabullet Swiss",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25,       // Minuten pro Spieler (0.25 = 15 Sekunden)
    clockIncrement: 0,
    nbRounds: 5,          // Number of rounds in Swiss tournament
    rated: true,
    variant: "standard",
    intervalHours: 1,      // alle 1 Stunde
  },
  // Set which tournament types to create
  createArenas: true,
  createSwiss: false,  // Set to false initially due to team leadership issue
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
  const date = new Date(startDate);
  date.setDate(date.getDate() + 0);

  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    clockTime: String(config.arena.clockTime), // in Minuten
    clockIncrement: String(config.arena.clockIncrement),
    minutes: String(config.arena.minutes),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: date.toISOString(),
  });

  console.log(`Creating team arena tournament on ${date.toISOString()} UTC for team ${config.team}`);

  if (config.dryRun) {
    console.log("DRY RUN Team Arena:", Object.fromEntries(body));
    return "dry-run";
  }

  console.log("Making API request to:", `${config.server}/api/tournament/team/${config.team}`);
  console.log("Request body:", Object.fromEntries(body));

  const res = await fetch(
    `${config.server}/api/tournament/team/${config.team}`,
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

  const data = await res.json();
  console.log("Response body:", data);
  const url = data.id ? `${config.server}/tournament/${data.id}` : res.headers.get("Location");
  console.log("Arena created:", url);
  return url;
}

async function createSwiss(startDate: Date, nextLink: string) {
   // Start date in YYYY-MM-DD (add 0 days to make it today)
   const date = new Date(startDate);
   date.setDate(date.getDate() + 0);

  const body = new URLSearchParams({
    name: config.swiss.name(),
    description: config.swiss.description(nextLink),
    "clock.limit": String(config.swiss.clockTime * 60), // Convert minutes to seconds
    "clock.increment": String(config.swiss.clockIncrement),
    nbRounds: String(config.swiss.nbRounds),
    rated: config.swiss.rated ? "true" : "false",
    variant: config.swiss.variant,
    startsAt: date.toISOString(),
  });

  console.log(`Creating Swiss tournament on ${date.toISOString()} UTC for team ${config.team}`);

  if (config.dryRun) {
    console.log("DRY RUN Swiss:", Object.fromEntries(body));
    return "dry-run";
  }

  console.log("Making API request to:", `${config.server}/api/swiss/new/${config.team}`);
  console.log("Request body:", Object.fromEntries(body));

  const res = await fetch(
    `${config.server}/api/swiss/new/${config.team}`,
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
    console.error("Swiss tournament creation failed:", res.status, errText);
    return null;
  }

  const data = await res.json();
  console.log("Response body:", data);
  const url = data.id ? `${config.server}/swiss/${data.id}` : res.headers.get("Location");
  console.log("Swiss tournament created:", url);
  return url;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now);

  let totalTournaments = 0;
  let tournamentsPerDay = 0;

  // Calculate total tournaments based on enabled types
  if (config.createArenas) {
    tournamentsPerDay += Math.floor(24 / config.arena.intervalHours);
  }
  if (config.createSwiss) {
    tournamentsPerDay += Math.floor(24 / config.swiss.intervalHours);
  }
  
  totalTournaments = tournamentsPerDay * config.daysInAdvance;

  console.log(`Creating ${totalTournaments} tournaments:`);
  if (config.createArenas) console.log(`- Arena tournaments enabled`);
  if (config.createSwiss) console.log(`- Swiss tournaments enabled for team ${config.team}`);

  let prevArenaUrl: string | null = null;
  let prevSwissUrl: string | null = null;

  for (let i = 0; i < Math.max(
    config.createArenas ? Math.floor(24 / config.arena.intervalHours) * config.daysInAdvance : 0,
    config.createSwiss ? Math.floor(24 / config.swiss.intervalHours) * config.daysInAdvance : 0
  ); i++) {
    
    // Add delay to avoid rate limiting (except for first iteration)
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 30000)); // Reduced delay

    const startDate = new Date(
      firstStart.getTime() + i * Math.min(
        config.createArenas ? config.arena.intervalHours : Infinity,
        config.createSwiss ? config.swiss.intervalHours : Infinity
      ) * 60 * 60 * 1000
    );

    // Create arena tournament if enabled
    if (config.createArenas && i < Math.floor(24 / config.arena.intervalHours) * config.daysInAdvance) {
      const arenaUrl = await createArena(startDate, prevArenaUrl ?? "tba");
      if (arenaUrl) prevArenaUrl = arenaUrl;
    }

    // Create Swiss tournament if enabled (with additional delay)
    if (config.createSwiss && i < Math.floor(24 / config.swiss.intervalHours) * config.daysInAdvance) {
      if (config.createArenas) await new Promise(resolve => setTimeout(resolve, 10000)); // Extra delay if both types
      const swissUrl = await createSwiss(startDate, prevSwissUrl ?? "tba");
      if (swissUrl) prevSwissUrl = swissUrl;
    }
  }
}

main().catch((err) => console.error(err));
