"use strict";

/** Protocol identifiers. Used as config keys, API values and log fields. */
const PROTOCOL = Object.freeze({
  AAVE_V3: "aave-v3",
  COMPOUND_V3: "compound-v3",
  MORPHO_BLUE: "morpho-blue",
});

const ALL_PROTOCOLS = Object.values(PROTOCOL);

module.exports = { PROTOCOL, ALL_PROTOCOLS };
