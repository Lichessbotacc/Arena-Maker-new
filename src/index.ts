import fetch from "node-fetch";
import { URLSearchParams } from "url";
import eachDayOfInterval from "date-fns/eachDayOfInterval";
import dateAdd from "date-fns/add";
import dateSet from "date-fns/set";
import dateIsAfter from "date-fns/isAfter";
import dateIsEqual from "date-fns/isEqual";
import { config } from "./config";

const candidates = eachDayOfInterval({
  start: new Date(),
  end: dateAdd(new Date(), { days: config.daysInAdvance }),
})
  .flatMap(day =>
    config.dailyTournaments.map(blueprint => ({
      ...blueprint,
      startsAt: dateSet(day, {
        hours: parseInt(blueprint.time.split(":")[0]),
        minutes: parseInt(blueprint.time.split(":")[1]),
      }),
    }))
  )
  .filter(c => dateIsAfter(c.startsAt, new Date()));

function looksLike(existing: any, candidate: any): boolean {
  return (
    dateIsEqual(new Date(existing.startsAt), candidate.startsAt) &&
    existing.clock.limit / 60 === candidate.clock[0] &&
    existing.clock.increment === candidate.clock[1]
  );
}

async function getLatestTournaments(nb: number) {
  const response = await fetch(
    `${config.server}/api/team/${config.team}/swiss?max=${nb}`
  );
  const body = await response.text();
  return body
    .split("\n")
    .filter(line => line)
    .map(line => JSON.parse(line));
}

async function createSwiss(tour: any): Promise<string | null> {
  const body = new URLSearchParams({
    name: tour.name,
    description: tour.description,
    "clock.limit": (tour.clock[0] * 60).toString(),
    "clock.increment": tour.clock[1].toString(),
    nbRounds: tour.rounds.toString(),
    rated: tour.rated.toString(),
    variant: tour.variant,
    startsAt: Math.floor(tour.startsAt.getTime() / 1000).toString(), // ✅ fix
  });

  const response = await fetch(
    `${config.server}/api/swiss/new/${config.team}`,
    {
      method: "POST",
      body,
      headers: { Authorization: `Bearer ${config.oauthToken}` },
    }
  );

  if (response.status !== 200) {
    const error = await response.text();
    console.error("Swiss creation failed:", response.status, error);
    return null;
  }

  const json = await response.json();
  const url = `${config.server}/swiss/${json.id}`;
  console.log("Swiss created:", url);
  return url;
}

async function createArena(
  name: string,
  description: string,
  startDate: Date
): Promise<string | null> {
  const body = new URLSearchParams({
    name,
    description,
    minutes: "120",
    "clock.limit": (3 * 60).toString(),
    "clock.increment": "0",
    startDate: Math.floor(startDate.getTime() / 1000).toString(), // ✅ fix
    rated: "true",
    variant: "standard",
  });

  const response = await fetch(`${config.server}/api/tournament`, {
    method: "POST",
    body,
    headers: { Authorization: `Bearer ${config.oauthToken}` },
  });

  if (response.status !== 200) {
    const error = await response.text();
    console.error("Arena creation failed:", response.status, error);
    return null;
  }

  const json = await response.json();
  const url = `${config.server}/tournament/${json.id}`;
  console.log("Arena created:", url);
  return url;
}

async function main() {
  const existing = await getLatestTournaments(200);
  console.log(`Found ${existing.length} tournaments`);

  const missing = candidates.filter(c => !existing.some(e => looksLike(e, c)));
  console.log(`Creating ${missing.length} tournaments`);

  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];
    const next = missing[i + 1];

    const swissUrl = await createSwiss({
      ...m,
      name: m.name(),
      description: m.description().replace(
        "{{nextLink}}",
        next ? "https://lichess.org/swiss/PLACEHOLDER" : ""
      ),
    });

    if (swissUrl && next) {
      await fetch(
        `${config.server}/api/swiss/${swissUrl.split("/").pop()}/edit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${config.oauthToken}` },
          body: new URLSearchParams({
            description: m
              .description()
              .replace("{{nextLink}}", swissUrl),
          }),
        }
      );
    }

    const arenaStart = new Date(m.startsAt.getTime() - 2 * 60 * 60 * 1000);
    await createArena(
      `Arena vor ${m.name()}`,
      `Aufwärmen vor dem Swiss!\n\nNächstes Swiss: ${swissUrl ?? ""}`,
      arenaStart
    );

    await new Promise(r => setTimeout(r, 1500));
  }
}

main();
