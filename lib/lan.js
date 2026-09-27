const os = require("os");
function addresses() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const row of ifs[name] || []) {
      if (row.family === "IPv4" && !row.internal) out.push({ name, address: row.address });
    }
  }
  return out;
}
module.exports = { addresses };
