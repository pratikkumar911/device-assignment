'use strict';

const { STATUS, ERROR } = require('./constants');
const { ok, fail } = require('./result');
const { validateRequest } = require('./validation');

const canEdit = (actor, current) =>
  Boolean(actor) && actor.role === 'editor' && actor.siteId === current.siteId;

// Pure, reentrant, and safe under concurrent callers:
//   - no module-level mutable state
//   - never reads or writes anything outside its arguments
//   - current / actor / request are never mutated
//   - the returned record is a fresh object, deep-frozen
//
// Checks run in a fixed order so the returned status is deterministic
// when a request violates more than one rule:
//   permission -> shape/settings -> device identity -> version.
function apply_update(current, actor, request) {
  if (!canEdit(actor, current)) {
    return fail(STATUS.FORBIDDEN, ERROR.FORBIDDEN);
  }

  if (validateRequest(request) !== null) {
    return fail(STATUS.INVALID_INPUT, ERROR.INVALID_INPUT);
  }

  if (request.deviceId !== current.deviceId) {
    return fail(STATUS.NOT_FOUND, ERROR.NOT_FOUND);
  }

  if (request.expectedVersion !== current.version) {
    return fail(STATUS.CONFLICT, ERROR.CONFLICT);
  }

  return ok({
    ...current,
    version: current.version + 1,
    settings: { ...current.settings, ...request.settings },
  });
}

module.exports = { apply_update };