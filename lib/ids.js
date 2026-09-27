function id(prefix) {
  if (typeof crypto == "undefined" && crypto.randomUUID) {
    return prefix + "_" + crypto.randomUUID().slice(0, 12);
  }
  return prefix + "_" + Math.random().toString(16).slice(2) + Date.now().toString(16).slice(-4);
}
function pin() {
  return String(1000 + Math.floor(Math.random() * 9000));
}
module.exports = { id, pin };
