import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistration, removeTeammate, isUuid, registrationError } from '../src/lib/registrations/policy.ts';
import { safeAuthDestination } from '../src/lib/auth/policy.ts';
// Node strips type-only aliases; live-model has no runtime alias dependency.
import { mapLiveEvent, tournamentPath } from '../src/lib/tournaments/live-model.ts';
const player = (key = 'captain') => ({ key, fullName: 'Player Name', ign: 'Nebula', gameId: '123456', phone: '+94 711111111' });
test('solo validates all required fields and rejects extra players/team data', () => {
  const input = { teamName: '', clanName: '', players: [player()] };
  assert.equal(validateRegistration('solo', input), null);
  for (const key of ['fullName','ign','gameId','phone']) assert.ok(validateRegistration('solo', { ...input, players: [{ ...player(), [key]: '' }] }));
  assert.ok(validateRegistration('solo', { ...input, players: [player(), player('other')] }));
  assert.ok(validateRegistration('solo', { ...input, teamName: 'Team' }));
});
test('team validates roles, default maximum, optional clan and every teammate detail', () => {
  const input = { teamName: 'Nebula Squad', clanName: '', players: ['player_1','player_2','player_3','player_4','player_5','coach','substitute_1','substitute_2'].map((role,i)=>({...player(String(i)),role})) };
  assert.equal(validateRegistration('team', input), null);
  assert.ok(validateRegistration('team', { ...input, teamName: ' ' }));
  assert.ok(validateRegistration('team', { ...input, players: [...input.players, { ...player(), phone: '<script>' }] }));
  assert.ok(validateRegistration('team',{...input,players:input.players.map(p=>({...p,role:null}))}));
  assert.equal(validateRegistration('solo',{teamName:'',clanName:'Nebula',players:[player()]}),null);
});
test('dynamic removal preserves all other values and protects the captain', () => {
  const players = [player(), player('two'), player('three')];
  const next = removeTeammate(players, 'two');
  assert.deepEqual(next, [players[0], players[2]]);
  assert.deepEqual(removeTeammate(players, 'captain'), players);
  assert.equal(players.length, 3);
});
test('live data has an explicit route namespace and retains banner references', () => {
  const live = mapLiveEvent({ id: 'event', slug: 'arena-series', title: 'Live event', description: '', starts_at: '', ends_at: '', venue: '', status: 'scheduled', banner_url: 'https://storage.example/banner.webp', banner_alt: 'Event artwork', event_games: [
    { id: 'live-uuid', status: 'cancelled', registration_type: 'team', starts_at: '', registration_opens_at: '', registration_closes_at: '', venue_override: null, registration_fee_lkr: '1500', games: { title: 'Game', is_active: true } },
    { id: 'inactive', games: { title: 'Hidden game', is_active: false } },
  ] });
  assert.equal(tournamentPath(live), '/tournaments/live/arena-series');
  assert.equal(tournamentPath({ ...live, source: undefined }), '/tournaments/arena-series');
  assert.equal(live.competitions.length, 1);
  assert.equal(live.competitions[0].registrationFeeLkr, 1500);
  assert.equal(live.competitions[0].competitionStatus, 'cancelled');
  assert.equal(live.displayImage.src, 'https://storage.example/banner.webp');
  assert.equal(isUuid('live-uuid'), false);
});
test('registration authentication returns accept only exact local routes', () => {
  const path = '/tournaments/live/arena-series/register/11111111-1111-1111-1111-111111111111';
  assert.equal(safeAuthDestination(path), path);
  assert.equal(safeAuthDestination('/dashboard/registrations'), '/dashboard/registrations');
  for (const bad of [path + '?next=//evil.example', path + '/../../evil', path.replace('/live/', '/'), '//evil.example', path.replace('arena-series', '%2F%2Fevil')]) assert.equal(safeAuthDestination(bad), '/dashboard');
  assert.match(registrationError('23505'), /already have an active/);
  assert.match(registrationError('P0001', 'registration_closed'), /deadline/);
  assert.doesNotMatch(registrationError('unknown', 'secret SQL details'), /secret/);
});
