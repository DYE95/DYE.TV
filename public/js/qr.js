// public/js/qr.js — kleiner QR-Code-Encoder ohne Abhaengigkeiten.
// Byte-Modus (UTF-8), Fehlerkorrektur M, Versionen 1 bis 10 (bis 213 Bytes,
// reicht locker fuer eine trycloudflare-Adresse). Laeuft im Browser
// (window.EmberQR) und in Node (require) fuer die Tests.
// Aufbau nach ISO/IEC 18004; Platzierung wie in Nayukis Referenz-Implementierung.
(function (root) {
  "use strict";

  // [Fehlerkorrektur-Bytes pro Block, Bloecke Gruppe 1, Datenbytes G1, Bloecke G2, Datenbytes G2]
  const BLOCKS_M = [
    null,
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
  ];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const MAX_VERSION = 10;

  // ---------- Galois-Feld GF(256), Polynom 0x11D ----------
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    return a && b ? EXP[LOG[a] + LOG[b]] : 0;
  }

  function generator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i += 1) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j += 1) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  // Reed-Solomon: Rest von data * x^degree geteilt durch das Generatorpolynom.
  function reedSolomon(data, degree) {
    const gen = generator(degree);
    const rem = new Array(degree).fill(0);
    for (const byte of data) {
      const factor = byte ^ rem.shift();
      rem.push(0);
      for (let i = 0; i < degree; i += 1) rem[i] ^= gfMul(gen[i + 1], factor);
    }
    return rem;
  }

  function dataCapacity(version) {
    const b = BLOCKS_M[version];
    return b[1] * b[2] + b[3] * b[4];
  }

  function utf8(text) {
    return Array.from(new TextEncoder().encode(String(text)));
  }

  function chooseVersion(length) {
    for (let v = 1; v <= MAX_VERSION; v += 1) {
      const countBits = v < 10 ? 8 : 16;
      if (4 + countBits + length * 8 <= dataCapacity(v) * 8) return v;
    }
    return 0;
  }

  // Bitstrom: Modus 0100, Laenge, Bytes, Terminator, Fuellbytes 0xEC/0x11.
  function dataCodewords(bytes, version) {
    const bits = [];
    const push = (value, len) => { for (let i = len - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1); };
    push(0b0100, 4);
    push(bytes.length, version < 10 ? 8 : 16);
    for (const b of bytes) push(b, 8);
    const capacity = dataCapacity(version) * 8;
    push(0, Math.min(4, capacity - bits.length));
    while (bits.length % 8) bits.push(0);
    const out = [];
    for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, bit) => (a << 1) | bit, 0));
    for (let pad = 0xec; out.length < dataCapacity(version); pad ^= 0xec ^ 0x11) out.push(pad);
    return out;
  }

  // In Bloecke teilen, je Block Fehlerkorrektur, dann verschraenken.
  function interleave(data, version) {
    const [ec, n1, d1, n2, d2] = BLOCKS_M[version];
    const blocks = [];
    let pos = 0;
    for (let i = 0; i < n1 + n2; i += 1) {
      const len = i < n1 ? d1 : d2;
      const chunk = data.slice(pos, pos + len);
      pos += len;
      blocks.push({ data: chunk, ec: reedSolomon(chunk, ec) });
    }
    const out = [];
    const maxData = Math.max(d1, d2);
    for (let i = 0; i < maxData; i += 1) for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
    for (let i = 0; i < ec; i += 1) for (const b of blocks) out.push(b.ec[i]);
    return out;
  }

  // Formatbits: Fehlerkorrektur M (00) + Maske, BCH(15,5), XOR 0x5412.
  function formatBits(mask) {
    const data = (0 << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }

  // Versionsbits ab Version 7: BCH(18,6) mit 0x1F25.
  function versionBits(version) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    return (version << 12) | rem;
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  function blankMatrix(size) {
    return {
      size,
      modules: Array.from({ length: size }, () => new Array(size).fill(false)),
      fn: Array.from({ length: size }, () => new Array(size).fill(false)),
    };
  }

  function setFn(m, x, y, dark) {
    m.modules[y][x] = Boolean(dark);
    m.fn[y][x] = true;
  }

  function drawFunctionPatterns(m, version) {
    const size = m.size;
    for (let i = 0; i < size; i += 1) {
      setFn(m, 6, i, i % 2 === 0);
      setFn(m, i, 6, i % 2 === 0);
    }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy += 1) {
        for (let dx = -4; dx <= 4; dx += 1) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          setFn(m, x, y, d !== 2 && d !== 4);
        }
      }
    };
    finder(3, 3);
    finder(size - 4, 3);
    finder(3, size - 4);
    const pos = ALIGN[version];
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = 0; j < pos.length; j += 1) {
        if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) setFn(m, pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
    drawFormat(m, 0);
    if (version >= 7) {
      const bits = versionBits(version);
      for (let i = 0; i < 18; i += 1) {
        const bit = (bits >>> i) & 1;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFn(m, a, b, bit);
        setFn(m, b, a, bit);
      }
    }
  }

  function drawFormat(m, mask) {
    const size = m.size;
    const bits = formatBits(mask);
    const bit = (i) => (bits >>> i) & 1;
    for (let i = 0; i <= 5; i += 1) setFn(m, 8, i, bit(i));
    setFn(m, 8, 7, bit(6));
    setFn(m, 8, 8, bit(7));
    setFn(m, 7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) setFn(m, 14 - i, 8, bit(i));
    for (let i = 0; i < 8; i += 1) setFn(m, size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) setFn(m, 8, size - 15 + i, bit(i));
    setFn(m, 8, size - 8, 1); // dunkles Modul
  }

  function drawCodewords(m, codewords) {
    const size = m.size;
    let i = 0;
    const total = codewords.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (m.fn[y][x]) continue;
          if (i < total) {
            m.modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
            i += 1;
          }
        }
      }
    }
  }

  function applyMask(m, mask) {
    for (let y = 0; y < m.size; y += 1) {
      for (let x = 0; x < m.size; x += 1) {
        if (!m.fn[y][x] && MASKS[mask](x, y)) m.modules[y][x] = !m.modules[y][x];
      }
    }
  }

  // Strafpunkte nach Norm (N1 bis N4); die Maske mit den wenigsten gewinnt.
  function penalty(m) {
    const size = m.size;
    const g = (x, y) => m.modules[y][x];
    let score = 0;
    const lines = (getter) => {
      for (let a = 0; a < size; a += 1) {
        let run = 1;
        for (let b = 1; b <= size; b += 1) {
          if (b < size && getter(a, b) === getter(a, b - 1)) run += 1;
          else {
            if (run >= 5) score += 3 + (run - 5);
            run = 1;
          }
        }
        const seq = [];
        for (let b = 0; b < size; b += 1) seq.push(getter(a, b) ? 1 : 0);
        const s = `0000${seq.join("")}0000`;
        for (const pat of ["10111010000", "00001011101"]) {
          let idx = s.indexOf(pat);
          while (idx !== -1) {
            score += 40;
            idx = s.indexOf(pat, idx + 1);
          }
        }
      }
    };
    lines((a, b) => g(b, a));
    lines((a, b) => g(a, b));
    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const c = g(x, y);
        if (c === g(x + 1, y) && c === g(x, y + 1) && c === g(x + 1, y + 1)) score += 3;
      }
    }
    let dark = 0;
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (g(x, y)) dark += 1;
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    score += Math.max(0, k) * 10;
    return score;
  }

  function encode(text) {
    const bytes = utf8(text);
    const version = chooseVersion(bytes.length);
    if (!version) throw new Error("Text zu lang für den QR-Code (höchstens 213 Bytes).");
    const codewords = interleave(dataCodewords(bytes, version), version);
    const size = version * 4 + 17;
    let best = null;
    for (let mask = 0; mask < 8; mask += 1) {
      const m = blankMatrix(size);
      drawFunctionPatterns(m, version);
      drawCodewords(m, codewords);
      applyMask(m, mask);
      drawFormat(m, mask);
      const score = penalty(m);
      if (!best || score < best.score) best = { score, mask, m };
    }
    return { version, mask: best.mask, size, modules: best.m.modules };
  }

  // SVG mit einem einzigen Pfad; crispEdges haelt die Kanten auch in 4K scharf.
  function toSvg(qr, opts = {}) {
    const border = opts.border == null ? 4 : opts.border;
    const dark = opts.dark || "#000";
    const light = opts.light || "#fff";
    const dim = qr.size + border * 2;
    let path = "";
    for (let y = 0; y < qr.size; y += 1) {
      for (let x = 0; x < qr.size; x += 1) {
        if (qr.modules[y][x]) path += `M${x + border} ${y + border}h1v1h-1z`;
      }
    }
    const label = opts.label ? ` aria-label="${String(opts.label).replace(/[<>&"]/g, "")}"` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img"${label}>`
      + `<rect width="${dim}" height="${dim}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
  }

  const api = { encode, toSvg, reedSolomon, formatBits, versionBits, chooseVersion, dataCodewords, MAX_VERSION };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EmberQR = api;
})(typeof window !== "undefined" ? window : globalThis);
