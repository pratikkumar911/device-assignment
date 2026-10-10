'use strict';

const { isIntInRange } = require('./primitives');

const LANGUAGES = Object.freeze(['en', 'hi', 'kn']);
const VOLUME = Object.freeze({ min: 0, max: 5 });

const SETTINGS_RULES = Object.freeze({
  language: (value) => typeof value === 'string' && LANGUAGES.includes(value),
  volume: (value) => isIntInRange(value, VOLUME),
});

module.exports = { LANGUAGES, VOLUME, SETTINGS_RULES };