'use strict';

const STATUS = Object.freeze({
  OK: 200,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_INPUT: 422,
});

const ERROR = Object.freeze({
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_INPUT: 'INVALID_INPUT',
});

module.exports = { STATUS, ERROR };
