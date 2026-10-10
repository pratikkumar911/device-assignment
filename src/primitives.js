'use strict';

const isObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const isNonEmptyString = (v) =>
  typeof v === 'string' && v.length > 0;

const isPositiveInt = (v) =>
  Number.isInteger(v) && v > 0;

const isIntInRange = (v, { min, max }) =>
  Number.isInteger(v) && v >= min && v <= max;

const hasExactlyKeys = (obj, keys) => {
  const actual = Object.keys(obj);
  return (
    actual.length === keys.length &&
    keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k))
  );
};

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

module.exports = {
  isObject,
  isNonEmptyString,
  isPositiveInt,
  isIntInRange,
  hasExactlyKeys,
  deepFreeze,
};
