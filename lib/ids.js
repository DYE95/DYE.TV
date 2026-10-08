const crypto = require("crypto");

function id(prefix) {
  return prefix + "_" + crypto.randomBytes(6).toString("hex");
}

const PIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function pin() {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) out += PIN_ALPHABET[bytes[i] % PIN_ALPHABET.length];
  return out;
}

module.exports = { id, pin, PIN_ALPHABET };
