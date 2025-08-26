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

const looksLike = (existing: any, candidate: any) =>
  dateIsEqual(new Date(existing.startsAt), candidate.startsAt) &&
  existing.clock.limit / 60 == candidate.clock[0] &&
  existing.clock.increment == candidate.clock[1];

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
  const body = new URLSearchParams();
  for (const k of Object.keys(tour)) body.append(k, tour[k]);
  const response = await fetch(
    `${config.server}/api/swiss/new/${config.team}`,
    {
      method: "POST",
      body,
      headers: { Authorization: `Bearer ${config.oauthToken}` },
    }
  );
  if (response.status != 200) {
    const error = await response.text();
    console.error("Swiss creation failed:", response.status, error);
    return null;
  }
  const loc = response.headers.get("location");
  console.log("Swiss created:", loc);
  return loc ? loc.split("/").pop()! : null;
}

async function updateSwissDescription(swissId: string, desc: string, tour: any) {
  const body = new URLSearchParams({
    name: tour.name,
    description: desc,
    "clock.limit": (tour.clock[0] * 60).toString(),
    "clock.increment": tour.clock[1].toString(),
    nbRounds: tour.rounds.toString(),
    rated: tour.rated.toString(),
    variant: tour.variant,
    startsAt: tour.startsAt.getTime().toString(),
  });

  const response = await fetch(`${config.server}/api/swiss/${swissId}/edit`, {
    method: "POST",
    body,
    headers: { Authorization: `Bearer ${config.oauthToken}` },
  });

  if (response.status != 200) {
    console.error("Update error:", response.status, await response.text());
  } else {
    console.log(`Swiss ${swissId} updated with next link`);
  }
}

async function createArena(name: string, description: string, startDate: Date) {
  const body = new URLSearchParams({
    name,
    description,
    minutes: "120",
    "clock.limit": (3 * 60).toString(),
    "clock.increment": "0",
    startDate: startDate.getTime().toString(), // FIX: millis, nicht sekunden
    rated: "true",
    variant: "standard",
  });

  const response = await fetch(`${config.server}/api/tournament`, {
    method: "POST",
    body,
    headers: { Authorization: `Bearer ${config.oauthToken}` },
  });

  if (response.status != 200) {
    console.error("Arena creation failed:", response.status, await response.text());
  } else {
    console.log("Arena created:", await response.text());
  }
}

async function main() {
  const existing = await getLatestTournaments(200);
  console.log(`Found ${existing.length} tournaments`);

  const missing = candidates.filter(c => !existing.some(e => looksLike(e, c)));

  const posts = missing.map(m => ({
    ...m,
    name: m.name(),
    description: m.description(),
    "clock.limit": m.clock[0] * 60,
    "clock.increment": m.clock[1],
    nbRounds: m.rounds,
    rated: m.rated,
    variant: m.variant,
    startsAt: m.startsAt,
  }));

  console.log(`Creating ${posts.length} tournaments`);

  let lastSwissId: string | null = null;

  for (const m of posts) {
    console.log(`${new Date(m.startsAt)} ${m.name}`);

    if (!config.dryRun) {
      const swissId = await createSwiss(m);
      if (!swissId) continue;

      // Swiss mit Link zum letzten Swiss updaten
      if (lastSwissId) {
        await updateSwissDescription(
          lastSwissId,
          `Tägliches Teamturnier!\n\nNächstes Turnier: https://lichess.org/swiss/${swissId}`,
          m
        );
      }

      // Arena 2 Stunden vor Swiss
      const arenaStart = dateAdd(m.startsAt, { hours: -2 });
      await createArena(
        `${m.name} Arena`,
        `Aufwärm-Arena vor dem Swiss!\n\nNächstes Swiss: https://lichess.org/swiss/${swissId}`,
        arenaStart
      );

      lastSwissId = swissId;
    }
  }
}

main();
