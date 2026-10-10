const test = require("node:test");
const assert = require("node:assert/strict");
const qr = require("../public/js/qr.js");

test("Reed-Solomon: Referenzwerte für HELLO WORLD 1-M", () => {
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(qr.reedSolomon(data, 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

test("Formatbits für Fehlerkorrektur M, alle acht Masken (Normtabelle)", () => {
  const table = [
    "101010000010010", "101000100100101", "101111001111100", "101101101001011",
    "100010111111001", "100000011001110", "100111110010111", "100101010100000",
  ];
  table.forEach((bits, mask) => assert.equal(qr.formatBits(mask).toString(2).padStart(15, "0"), bits));
});

test("Versionsbits für Version 7 bis 10 (Normtabelle)", () => {
  assert.equal(qr.versionBits(7), 0x07c94);
  assert.equal(qr.versionBits(8), 0x085bc);
  assert.equal(qr.versionBits(9), 0x09a99);
  assert.equal(qr.versionBits(10), 0x0a4d3);
});

test("Version passt zur Länge, 213 Bytes gehen, 214 nicht", () => {
  assert.equal(qr.chooseVersion(14), 1);
  assert.equal(qr.chooseVersion(15), 2);
  assert.equal(qr.chooseVersion(213), 10);
  assert.throws(() => qr.encode("x".repeat(214)), /zu lang/);
});

test("Datenbits: Modus, Länge, Füllbytes", () => {
  const cw = qr.dataCodewords([0x41], 1);
  assert.equal(cw.length, 16);
  assert.deepEqual(cw.slice(0, 3), [0x40, 0x14, 0x10]);
  assert.deepEqual(cw.slice(3, 5), [0xec, 0x11]);
});

test("Matrix: Finder, Timing, dunkles Modul und lesbare Formatbits", () => {
  const code = qr.encode("https://glut-fuchs-laterne-test.trycloudflare.com/player");
  const { size, modules: m, mask, version } = code;
  assert.equal(size, version * 4 + 17);
  // Finder oben links: aeusserer Ring dunkel, zweiter Ring hell, Kern dunkel
  for (let i = 0; i < 7; i += 1) assert.equal(m[0][i], true);
  assert.equal(m[1][1], false);
  assert.equal(m[3][3], true);
  for (let i = 8; i < size - 8; i += 1) assert.equal(m[6][i], i % 2 === 0);
  assert.equal(m[size - 8][8], true);
  // Formatbits zuruecklesen (Kopie neben dem Finder oben links)
  let bits = 0;
  const read = [];
  for (let i = 0; i <= 5; i += 1) read.push(m[i][8]);
  read.push(m[7][8], m[8][8], m[8][7]);
  for (let i = 9; i < 15; i += 1) read.push(m[8][14 - i]);
  read.forEach((b, i) => { if (b) bits |= 1 << i; });
  assert.equal(bits, qr.formatBits(mask));
});

test("SVG ist sauber und skaliert", () => {
  const svg = qr.toSvg(qr.encode("hallo"), { label: "Spieler <Link>" });
  assert.match(svg, /^<svg [^>]*viewBox="0 0 29 29"/);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.ok(!svg.includes("<Link>"));
});
