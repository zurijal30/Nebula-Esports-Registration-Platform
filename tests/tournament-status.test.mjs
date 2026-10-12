import test from "node:test";
import assert from "node:assert/strict";
import { getCompetitionStatus, getTournamentStatus, filterTournaments } from "../src/lib/tournament-status.ts";
import { formatDateTime, formatFee } from "../src/lib/tournament-format.ts";
import { demoTournaments } from "../src/data/tournaments.ts";

const event = demoTournaments[0];
const competition = event.competitions[0];
const now = Date.parse("2026-10-11T12:00:00+05:30");

test("registration transitions at opening and deadline instants in Colombo", () => {
  const opening = Date.parse(competition.registrationOpensAt);
  const closing = Date.parse(competition.registrationClosesAt);
  assert.equal(getCompetitionStatus(event, competition, opening - 1), "upcoming");
  assert.equal(getCompetitionStatus(event, competition, opening), "open");
  assert.equal(getCompetitionStatus(event, competition, closing - 1), "open");
  assert.equal(getCompetitionStatus(event, competition, closing), "closed");
});

test("cancellation overrides both open and future registration windows", () => {
  const cancelled = { ...event, eventStatus: "cancelled" };
  assert.equal(getCompetitionStatus(cancelled, competition, now), "cancelled");
  assert.equal(getCompetitionStatus(cancelled, event.competitions[1], now), "cancelled");
  assert.equal(getTournamentStatus(cancelled, now), "cancelled");
});

test("event completion and invalid windows fail closed", () => {
  const completed = { ...event, endsAt: "2026-10-10T20:00:00+05:30" };
  assert.equal(getCompetitionStatus(completed, competition, now), "closed");
  assert.equal(getCompetitionStatus(event, { ...competition, registrationOpensAt: "invalid" }, now), "closed");
  assert.equal(getCompetitionStatus(event, { ...competition, registrationClosesAt: competition.registrationOpensAt }, now), "closed");
});

test("independent competition windows aggregate without hiding future games", () => {
  assert.equal(getCompetitionStatus(event, event.competitions[0], now), "open");
  assert.equal(getCompetitionStatus(event, event.competitions[1], now), "upcoming");
  assert.equal(getTournamentStatus(event, now), "open");
  const laterGame = { ...event.competitions[1], registrationOpensAt: "2026-11-02T09:00:00+05:30" };
  assert.equal(getTournamentStatus({ ...event, competitions: [competition, laterGame] }, Date.parse("2026-11-02T08:00:00+05:30")), "upcoming");
  assert.equal(getTournamentStatus(event, Date.parse(event.endsAt)), "closed");
});

test("directory filters, case-insensitive search, combined queries and empty results", () => {
  const slugs = (query, filter) => filterTournaments(demoTournaments, query, filter, now).map((item) => item.slug);
  assert.equal(slugs("", "all").length, 4);
  assert.deepEqual(slugs("", "upcoming"), ["arena-series", "mobile-showdown", "versus-cup"]);
  assert.deepEqual(slugs("", "open"), ["arena-series"]);
  assert.deepEqual(slugs("", "closed"), ["versus-cup"]);
  assert.deepEqual(slugs("", "cancelled"), ["arena-rematch"]);
  assert.deepEqual(slugs("  ARENA  ", "all"), ["arena-series", "arena-rematch"]);
  assert.deepEqual(slugs("arena", "cancelled"), ["arena-rematch"]);
  assert.deepEqual(slugs("versus", "open"), []);
  assert.deepEqual(slugs("no matching event", "all"), []);
});

test("dates use Colombo even when UTC timestamps cross midnight", () => {
  assert.match(formatDateTime("2026-10-10T20:00:00Z"), /^11 Oct 2026 · 1:30 am$/);
  assert.equal(formatFee(undefined, "solo"), "Free entry");
  assert.equal(formatFee(2500, "team"), "LKR 2,500 / team");
});

test("demo routes are unique, windows ordered and competitions inside their events", () => {
  assert.equal(new Set(demoTournaments.map((item) => item.slug)).size, demoTournaments.length);
  for (const tournament of demoTournaments) {
    assert.ok(Date.parse(tournament.startsAt) < Date.parse(tournament.endsAt));
    assert.equal(new Set(tournament.competitions.map((item) => item.id)).size, tournament.competitions.length);
    for (const game of tournament.competitions) {
      assert.ok(Date.parse(game.registrationOpensAt) < Date.parse(game.registrationClosesAt));
      assert.ok(Date.parse(game.registrationClosesAt) < Date.parse(game.startsAt));
      assert.ok(Date.parse(game.startsAt) >= Date.parse(tournament.startsAt));
      assert.ok(Date.parse(game.startsAt) <= Date.parse(tournament.endsAt));
    }
  }
});
