'use strict';

const { STATUS } = require('./constants');
const { deepFreeze } = require('./primitives');

// HTTP like response
// Responses are frozen. Callers get a value they can read and serialize
// but cannot accidentally reshape, which keeps one request from leaking
// state into another.
const ok = (record) =>
  Object.freeze({ status: STATUS.OK, record: deepFreeze(record) });

const fail = (status, error) =>
  Object.freeze({ status, error });

module.exports = { ok, fail };