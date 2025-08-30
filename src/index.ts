import fetch from "node-fetch";
import { config } from "./config";

// Hilfsfunktion: Request-Body für Arena bauen
function buildArenaRequest(startDate: Date) {
  return {
    name: config.arena.name(),
    description: config.arena.description(),
    "clock.limit": Math.round(config.arena.clockTime * 60), // Minuten -> Sekunden
    "clock.increment": config.arena.clockIncrement,
    minutes: config.arena.minutes,
    rated: config.arena.rated,
    variant: config.arena.variant,
    startDate: startDate.toISOString(),
    teamId: config.team,
  };
}

// Arena bei Lichess anlegen
async function createArena(startDate: Date) {
  const body = buildArenaRequest(startDate);

  console.log("➡️ Arena request body:", body);

  if (config.dryRun) {
    console.log("✅ DRY RUN Arena:", body);
    return;
  }

  const res = await fetch(
    `${config.server}/api/team/${config.team}/arena/new`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.oauthToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Arena creation failed:", text);
  } else {
    const data = await res.json();
    console.log("✅ Arena created:", data);
  }
}

// Startpunkt
async function main() {
  console.log(`Creating arenas...`);

  const now = new Date();
  const firstArena = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      config.arena.startHour,
      0,
      0,
      0
    )
  );

  for (let i = 0; i < 12; i++) {
    const startDate = new Date(
      firstArena.getTime() + i * config.arena.frequencyMinutes * 60000
    );
    console.log(`Creating arena at ${startDate.toISOString()}`);
    await createArena(startDate);
  }
}

main().catch((e) => console.error(e));
