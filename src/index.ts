import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import eachDayOfInterval from 'date-fns/eachDayOfInterval';
import dateAdd from 'date-fns/add';
import dateSet from 'date-fns/set';
import dateIsAfter from 'date-fns/isAfter';
import dateIsEqual from 'date-fns/isEqual';
import { config } from './config';

// Kandidaten: 10 Tage im Voraus
const candidates = eachDayOfInterval({
  start: new Date(),
  end: dateAdd(new Date(), { days: 10 }),
})
  .flatMap(day =>
    config.dailyTournaments.map(blueprint => ({
      ...blueprint,
      startsAt: dateSet(day, {
        hours: parseInt(blueprint.time.split(':')[0]),
        minutes: parseInt(blueprint.time.split(':')[1]),
      }),
    }))
  )
  .filter(c => dateIsAfter(c.startsAt, new Date()));

// Vergleich, ob ein Turnier schon existiert
const looksLike = (existing: any, candidate: any) =>
  dateIsEqual(new Date(existing.startsAt), candidate.startsAt) &&
  existing.clock.limit / 60 == candidate.clock[0] &&
  existing.cloc
