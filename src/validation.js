'use strict';

const {
  isObject,
  isNonEmptyString,
  isPositiveInt,
  hasExactlyKeys,
} = require('./primitives');
const { SETTINGS_RULES } = require('./settings-rules');

const REQUEST_KEYS = Object.freeze(['deviceId', 'expectedVersion', 'settings']);

// Returns null when the request is valid, or a short reason string otherwise.
// The reason is for logs/debugging; the wire response only carries the code.
function validateRequest(request) {
  if (!isObject(request)) return 'request is not an object';
  if (!hasExactlyKeys(request, REQUEST_KEYS)) return 'unexpected request keys';
  if (!isNonEmptyString(request.deviceId)) return 'deviceId must be a non-empty string';
  if (!isPositiveInt(request.expectedVersion)) {
    return 'expectedVersion must be a positive integer';
  }

  const { settings } = request;
  if (!isObject(settings) || Object.keys(settings).length === 0) {
    return 'settings must be a non-empty object';
  }

  for (const [key, value] of Object.entries(settings)) {
    const rule = SETTINGS_RULES[key];
    if (!rule) return `unknown setting: ${key}`;
    if (!rule(value)) return `invalid value for ${key}`;
  }

  return null;
}

module.exports = { validateRequest, REQUEST_KEYS };