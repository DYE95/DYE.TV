const TokenMaker = {
  img: null,
  x: 0,
  y: 0,
  scale: 1,
  dragging: false,
  last: null,
};

function tokenCanvas() { return document.getElementById("tokenCanvas"); }

function tokenDraw() {
  const canvas = tokenCanvas();
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#1a1010";
  ctx.fillRect(0, 0, size, size);
  if (TokenMaker.img) {
    const iw = TokenMaker.img.width;
    const ih = TokenMaker.img.height;
    const base = Math.max(size / iw, size / ih) * TokenMaker.scale;
    const w = iw * base;
    const h = ih * base;
    ctx.drawImage(TokenMaker.img, size / 2 - w / 2 + TokenMaker.x, size / 2 - h / 2 + TokenMaker.y, w, h);
  }
  ctx.restore();
  const color = document.getElementById("tokenColor")?.value || "#e85d04";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#f4d6a0";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function tokenBind() {
  const canvas = tokenCanvas();
  if (!canvas || canvas.dataset.bound) return;
  canvas.dataset.bound = "1";
  canvas.addEventListener("pointerdown", (ev) => {
    TokenMaker.dragging = true;
    TokenMaker.last = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!TokenMaker.dragging || !TokenMaker.last) return;
    TokenMaker.x += ev.clientX - TokenMaker.last.x;
    TokenMaker.y += ev.clientY - TokenMaker.last.y;
    TokenMaker.last = { x: ev.clientX, y: ev.clientY };
    tokenDraw();
  });
  canvas.addEventListener("pointerup", () => { TokenMaker.dragging = false; });
}

function tokenLoadFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    TokenMaker.img = img;
    TokenMaker.x = 0;
    TokenMaker.y = 0;
    TokenMaker.scale = 1;
    tokenDraw();
  };
  img.src = url;
}

function tokenPng() {
  const canvas = tokenCanvas();
  return canvas.toDataURL("image/png").split(",")[1];
}
