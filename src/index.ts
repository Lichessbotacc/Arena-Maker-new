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
  const body = new URLSearchParams({
    name: tour.name,
    description: tour.description,
    "clock.limit": (tour.clock[0] * 60).toString(),
    "clock.increment": tour.clock[1].toString(),
    nbRounds: tour.rounds.toString(),
    rated: tour.rated.toString(),
    variant: tour.variant,
    startsAt: Math.floor(tour.startsAt.getTime() / 1000).toString(), // ✅ FIX
  });

  const response = await fetch(
    `$
