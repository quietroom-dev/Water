const canvas = document.getElementById("waterCanvas");
const ctx = canvas.getContext("2d", { alpha: true });
const app = document.getElementById("app");
const bg = document.getElementById("background");
const amount = document.getElementById("waterAmount");
const waterValue = document.getElementById("waterValue");
const input = document.getElementById("backgroundInput");
const reset = document.getElementById("resetButton");

let W = 0, H = 0, dpr = 1;
let particles = [];
let impacts = [];
let drops = [];
let lastTime = performance.now();
let backgroundUrl = null;

function resize() {
  const r = app.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width;
  H = r.height;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

amount.addEventListener("input", () => {
  waterValue.textContent = amount.value + "%";
});

input.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
  backgroundUrl = URL.createObjectURL(file);
  bg.src = backgroundUrl;
});

reset.addEventListener("click", () => {
  particles.length = 0;
  impacts.length = 0;
  drops.length = 0;
});

app.addEventListener("pointerdown", (e) => {
  // Don't spray when the user is operating the UI.
  if (e.target.closest(".controls, .topbar")) return;

  const rect = app.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  spray(x, y, Number(amount.value));
});

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function gaussian() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function spray(targetX, targetY, water) {
  const sourceX = W * 0.5;
  // Source is visually "behind" the screen; the stream expands toward the glass.
  const sourceY = H * 0.42;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.hypot(dx, dy);
  const nx = dx / Math.max(distance, 1);
  const ny = dy / Math.max(distance, 1);
  const px = -ny, py = nx;

  const count = Math.floor(90 + water * 2.8);
  const duration = rand(0.34, 0.62);
  const streamWidth = 7 + water * 0.115;

  // Dense coherent core: this makes it feel like a hose stream rather than rain.
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const spread = streamWidth * (0.15 + t * 1.8);
    const side = gaussian() * spread;
    const along = rand(-5, 5);
    const startX = sourceX + dx * t * 0.92 + px * side + nx * along;
    const startY = sourceY + dy * t * 0.92 + py * side + ny * along;

    const speed = rand(520, 860) * (0.7 + water / 120);
    particles.push({
      x: startX,
      y: startY,
      vx: nx * speed + px * rand(-65, 65),
      vy: ny * speed + py * rand(-65, 65),
      r: rand(1.1, 3.7) * (0.65 + water / 110),
      life: duration + rand(-.08, .12),
      maxLife: duration + .12,
      drag: rand(.91, .975),
      gravity: rand(30, 100)
    });
  }

  // Impact "fan" on the glass.
  impacts.push({
    x: targetX,
    y: targetY,
    age: 0,
    life: rand(.34, .7),
    radius: 4,
    maxRadius: 35 + water * .85,
    strength: water / 100
  });

  // A limited number of larger droplets remain on the virtual glass surface.
  const dropCount = Math.floor(3 + water * .09);
  for (let i = 0; i < dropCount; i++) {
    drops.push({
      x: targetX + rand(-18, 18) * (0.5 + water / 100),
      y: targetY + rand(-15, 15) * (0.5 + water / 100),
      r: rand(1.8, 5.5) * (0.7 + water / 120),
      vy: rand(2, 8),
      life: rand(1.0, 2.6),
      maxLife: 2.6,
      drift: rand(-3, 3)
    });
  }
}

function drawWaterParticle(p) {
  const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
  const g = ctx.createRadialGradient(p.x - p.r*.35, p.y - p.r*.35, .2, p.x, p.y, p.r*1.7);
  g.addColorStop(0, `rgba(255,255,255,${alpha*.92})`);
  g.addColorStop(.22, `rgba(235,248,255,${alpha*.62})`);
  g.addColorStop(.62, `rgba(160,205,225,${alpha*.18})`);
  g.addColorStop(1, `rgba(120,180,210,0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 1.65, 0, Math.PI * 2);
  ctx.fill();
}

function drawImpact(i) {
  const t = i.age / i.life;
  const r = 4 + (i.maxRadius - 4) * Math.min(1, t);
  const alpha = (1 - t) * .48 * i.strength + .08;

  ctx.save();
  ctx.translate(i.x, i.y);

  // Thin wet-glass ring.
  ctx.strokeStyle = `rgba(240,250,255,${alpha})`;
  ctx.lineWidth = 1.1 + i.strength * 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.25, r * .7, rand(-.12,.12), 0, Math.PI*2);
  ctx.stroke();

  // Radial splash fingers.
  const fingers = 10 + Math.floor(i.strength * 10);
  for (let k = 0; k < fingers; k++) {
    const a = (Math.PI * 2 * k / fingers) + rand(-.08,.08);
    const len = r * rand(.35, .9);
    ctx.strokeStyle = `rgba(235,248,255,${alpha * rand(.35,.8)})`;
    ctx.lineWidth = rand(.5, 1.7);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r*.25, Math.sin(a) * r*.25);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDrop(d) {
  const alpha = Math.max(0, Math.min(1, d.life / d.maxLife));
  const g = ctx.createRadialGradient(
    d.x - d.r*.35, d.y - d.r*.45, .2,
    d.x, d.y, d.r * 1.4
  );
  g.addColorStop(0, `rgba(255,255,255,${alpha*.72})`);
  g.addColorStop(.18, `rgba(220,244,255,${alpha*.45})`);
  g.addColorStop(.65, `rgba(130,190,215,${alpha*.12})`);
  g.addColorStop(1, `rgba(100,170,205,0)`);

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, d.r, d.r * 1.18, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,255,255,${alpha*.32})`;
  ctx.lineWidth = .7;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, d.r*.82, d.r*.95, 0, 0, Math.PI*2);
  ctx.stroke();
}

function frame(now) {
  const dt = Math.min(.033, (now - lastTime) / 1000);
  lastTime = now;

  ctx.clearRect(0, 0, W, H);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(p.drag, dt * 60);
    p.vy *= Math.pow(p.drag, dt * 60);
    p.vy += p.gravity * dt;
    drawWaterParticle(p);
  }

  for (let i = impacts.length - 1; i >= 0; i--) {
    const p = impacts[i];
    p.age += dt;
    if (p.age > p.life) {
      impacts.splice(i, 1);
      continue;
    }
    drawImpact(p);
  }

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.life -= dt;
    if (d.life <= 0) {
      drops.splice(i, 1);
      continue;
    }
    d.y += d.vy * dt;
    d.x += d.drift * dt;
    drawDrop(d);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
