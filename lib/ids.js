function id(prefix) {
  return prefix + "_" + Math.random().toString(16).slice(2) + Date.now().toString(16).slice(-4);
}
function pin() {
  return String(1000 + Math.floor(Math.random() * 9000));
}
module.exports = { id, pin };
