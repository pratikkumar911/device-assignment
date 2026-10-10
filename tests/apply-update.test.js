'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { apply_update, STATUS, ERROR } = require('../src');

const savedRecord = () => ({
  deviceId: 'D01',
  siteId: 'S01',
  version: 3,
  settings: { language: 'en', volume: 2 },
});

const editor = () => ({ siteId: 'S01', role: 'editor' });

// Freeze every nested property so any write inside apply_update throws.
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

// 1. The happy path: a partial update merges only the supplied key,
//    bumps the version by one, and returns a fresh (unshared) record.
test('applies a partial update and bumps the version once', () => {
  const current = deepFreeze(savedRecord());
  const actor = deepFreeze(editor());
  const request = deepFreeze({
    deviceId: 'D01',
    expectedVersion: 3,
    settings: { volume: 4 },
  });

  const result = apply_update(current, actor, request);

  assert.equal(result.status, STATUS.OK);

  assert.deepEqual(result.record, {
    deviceId: 'D01',
    siteId: 'S01',
    version: 4,
    settings: { language: 'en', volume: 4 },
  });
  assert.equal(current.version, 3);
  assert.equal(current.settings.volume, 2);
});

// 2. Permission gate: non-editors and editors from another site are
//    rejected before any other check runs.
test('rejects actors who are not editors of this site with 403', () => {
  const current = deepFreeze(savedRecord());
  const request = deepFreeze({
    deviceId: 'D01',
    expectedVersion: 3,
    settings: { volume: 4 },
  });

  const viewer = { siteId: 'S01', role: 'viewer' };
  const wrongSite = { siteId: 'S99', role: 'editor' };

  assert.deepEqual(apply_update(current, viewer, request), {
    status: STATUS.FORBIDDEN,
    error: ERROR.FORBIDDEN,
  });
  assert.deepEqual(apply_update(current, wrongSite, request), {
    status: STATUS.FORBIDDEN,
    error: ERROR.FORBIDDEN,
  });
});

// 3. Validation gate: bad shapes, unknown settings keys, and bad values
//    all collapse to the same 422, and inputs stay frozen/unchanged.
test('rejects malformed requests or invalid settings with 422', () => {
  const current = deepFreeze(savedRecord());
  const actor = deepFreeze(editor());

  const badRequests = [
    { deviceId: 'D01', expectedVersion: 3, settings: {} },              // empty settings
    { deviceId: 'D01', expectedVersion: 3, settings: { volume: true } },// boolean volume
    { deviceId: 'D01', expectedVersion: 3, settings: { volume: 9 } },   // out of range
    { deviceId: 'D01', expectedVersion: 3, settings: { language: 'fr' } }, // unsupported lang
    { deviceId: 'D01', expectedVersion: 3, settings: { brightness: 5 } },  // unknown key
    { deviceId: '',    expectedVersion: 3, settings: { volume: 4 } },   // empty deviceId
    { deviceId: 'D01', expectedVersion: 0, settings: { volume: 4 } },   // non-positive version
    { deviceId: 'D01', expectedVersion: 3, settings: { volume: 4 }, extra: 1 }, // extra key
  ];

  for (const request of badRequests) {
    deepFreeze(request);
    assert.deepEqual(
      apply_update(current, actor, request),
      { status: STATUS.INVALID_INPUT, error: ERROR.INVALID_INPUT },
      `expected 422 for ${JSON.stringify(request)}`,
    );
  }
});

// 4. Concurrency gates: unknown device -> 404, stale version -> 409.
//    Both must leave the saved record exactly as it was.
test('returns 404 for a different device and 409 for a stale version', () => {
  const current = deepFreeze(savedRecord());
  const actor = deepFreeze(editor());

  const wrongDevice = deepFreeze({
    deviceId: 'D02',
    expectedVersion: 3,
    settings: { volume: 4 },
  });
  const staleVersion = deepFreeze({
    deviceId: 'D01',
    expectedVersion: 2,
    settings: { volume: 4 },
  });

  assert.deepEqual(apply_update(current, actor, wrongDevice), {
    status: STATUS.NOT_FOUND,
    error: ERROR.NOT_FOUND,
  });
  assert.deepEqual(apply_update(current, actor, staleVersion), {
    status: STATUS.CONFLICT,
    error: ERROR.CONFLICT,
  });

  assert.equal(current.version, 3);
  assert.deepEqual(current.settings, { language: 'en', volume: 2 });
});