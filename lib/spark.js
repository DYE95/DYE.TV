// lib/spark.js — kleine Terminal-Zeremonien für Ember
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RESET = "\x1b[0m";
const DIM   = "\x1b[2m";
const EMBER = "\x1b[38;5;208m"; // orange
const GOLD  = "\x1b[38;5;222m"; // gold

async function ignite({ width = 22, duration = 900, label = "Zündung" } = {}) {
  if (!process.stdout.isTTY) return;
  const start = Date.now();
  for (;;) {
    const t = Math.min(1, (Date.now() - start) / duration);
    const filled = Math.round(t * width);
    const bar = "#".repeat(filled) + "-".repeat(width - filled);
    process.stdout.write(`\r  ${EMBER}[${bar}]${RESET} ${DIM}${label}${RESET}  `);
    if (t >= 1) break;
    await sleep(40);
  }
  process.stdout.write("\n");
}

async function detonate({ width = 22, label = "Selbstzerstörung" } = {}) {
  if (!process.stdout.isTTY) return;
  for (let i = 0; i < width * 2 + 4; i++) {
    const pos = i % width;
    const cells = new Array(width).fill("*");
    cells[pos] = "#";
    process.stdout.write(`\r  ${EMBER}[${cells.join("")}]${RESET} ${DIM}${label}${RESET}  `);
    await sleep(45);
  }
  /* still */
  await sleep(300);
}

module.exports = { ignite, detonate, sleep };