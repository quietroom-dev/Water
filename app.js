const app =
  document.getElementById("app");

const canvas =
  document.getElementById("waterCanvas");

const ctx =
  canvas.getContext("2d", {
    alpha: true
  });

const background =
  document.getElementById("background");

const backgroundInput =
  document.getElementById(
    "backgroundInput"
  );

const resetButton =
  document.getElementById(
    "resetButton"
  );

const waterAmount =
  document.getElementById(
    "waterAmount"
  );

const waterValue =
  document.getElementById(
    "waterValue"
  );


/* =====================================
   基本状態
===================================== */

let width = 0;
let height = 0;

let pixelRatio = 1;

let lastTime =
  performance.now();


/* =====================================
   背景画像のバッファ
===================================== */

let backgroundCanvas = null;
let backgroundContext = null;

let backgroundURL = null;


/* =====================================
   エフェクト配列
===================================== */

let waterParticles = [];

let impacts = [];

let droplets = [];


/* =====================================
   リサイズ
===================================== */

function resizeCanvas() {

  const rect =
    app.getBoundingClientRect();

  width = rect.width;
  height = rect.height;

  pixelRatio =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  canvas.width =
    width * pixelRatio;

  canvas.height =
    height * pixelRatio;

  canvas.style.width =
    width + "px";

  canvas.style.height =
    height + "px";

  ctx.setTransform(
    pixelRatio,
    0,
    0,
    pixelRatio,
    0,
    0
  );

  createBackgroundBuffer();
}

window.addEventListener(
  "resize",
  resizeCanvas
);


/* =====================================
   背景をCanvasにコピー
===================================== */

function createBackgroundBuffer() {

  if (
    !background.complete ||
    !background.naturalWidth
  ) {
    return;
  }

  backgroundCanvas =
    document.createElement(
      "canvas"
    );

  backgroundCanvas.width =
    Math.floor(width);

  backgroundCanvas.height =
    Math.floor(height);

  backgroundContext =
    backgroundCanvas.getContext(
      "2d",
      {
        willReadFrequently: true
      }
    );

  const scale =
    Math.max(
      width / background.naturalWidth,
      height / background.naturalHeight
    );

  const drawWidth =
    background.naturalWidth * scale;

  const drawHeight =
    background.naturalHeight * scale;

  backgroundContext.drawImage(
    background,

    (width - drawWidth) / 2,
    (height - drawHeight) / 2,

    drawWidth,
    drawHeight
  );
}

background.addEventListener(
  "load",
  createBackgroundBuffer
);


/* =====================================
   初期化
===================================== */

resizeCanvas();


/* =====================================
   水量
===================================== */

waterValue.textContent =
  waterAmount.value + "%";

waterAmount.addEventListener(
  "input",
  () => {

    waterValue.textContent =
      waterAmount.value + "%";

  }
);


/* =====================================
   背景変更
===================================== */

backgroundInput.addEventListener(
  "change",
  event => {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (backgroundURL) {

      URL.revokeObjectURL(
        backgroundURL
      );
    }

    backgroundURL =
      URL.createObjectURL(file);

    background.src =
      backgroundURL;
  }
);


/* =====================================
   リセット
===================================== */

resetButton.addEventListener(
  "click",
  () => {

    waterParticles = [];
    impacts = [];
    droplets = [];

    ctx.clearRect(
      0,
      0,
      width,
      height
    );
  }
);


/* =====================================
   タップ
===================================== */

app.addEventListener(
  "pointerdown",
  event => {

    if (
      event.target.closest(
        ".top-ui"
      ) ||
      event.target.closest(
        ".control-panel"
      )
    ) {
      return;
    }

    const rect =
      app.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const y =
      event.clientY - rect.top;

    shootWater(
      x,
      y,
      Number(waterAmount.value)
    );
  }
);


/* =====================================
   乱数
===================================== */

function random(min, max) {

  return (
    min +
    Math.random() *
    (max - min)
  );
}


/* =====================================
   正規分布
===================================== */

function gaussian() {

  let u = 0;
  let v = 0;

  while (!u) {
    u = Math.random();
  }

  while (!v) {
    v = Math.random();
  }

  return Math.sqrt(
    -2 * Math.log(u)
  ) *
    Math.cos(
      Math.PI * 2 * v
    );
}


/* =====================================
   水を飛ばす
===================================== */

function shootWater(
  targetX,
  targetY,
  amount
) {

  /*
    水を出す位置。

    写真の中央奥から
    水が飛んでくる。
  */

  const sourceX =
    width * 0.50;

  const sourceY =
    height * 0.38;


  const dx =
    targetX - sourceX;

  const dy =
    targetY - sourceY;

  const distance =
    Math.hypot(dx, dy) || 1;


  const nx =
    dx / distance;

  const ny =
    dy / distance;


  /*
    水流に対して垂直な方向
  */

  const perpendicularX =
    -ny;

  const perpendicularY =
    nx;


  /*
    水量によって
    水流の太さを変える
  */

  const streamWidth =
    5 + amount * 0.11;


  const particleCount =
    Math.floor(
      45 + amount * 0.8
    );


  /* -----------------------------
     メインの水流
  ----------------------------- */

  for (
    let i = 0;
    i < particleCount;
    i++
  ) {

    const progress =
      Math.random() * 0.94;


    const side =
      gaussian() *
      streamWidth *
      (
        0.10 +
        progress * 1.55
      );


    const speed =
      610 +
      amount * 3.2 +
      random(-80, 80);


    waterParticles.push({

      x:
        sourceX +
        dx * progress +
        perpendicularX * side,

      y:
        sourceY +
        dy * progress +
        perpendicularY * side,

      vx:
        nx * speed +
        perpendicularX *
        random(-28,28),

      vy:
        ny * speed +
        perpendicularY *
        random(-28,28),

      radius:
        random(1.7,4.6) *
        (
          0.72 +
          amount / 125
        ),

      life:
        random(.28,.58),

      maxLife:
        .62,

      angle:
        Math.atan2(
          ny,
          nx
        ),

      drag:
        .965
    });
  }


  /* -----------------------------
     水が画面に衝突
  ----------------------------- */

  impacts.push({

    x: targetX,

    y: targetY,

    age: 0,

    life: 1.0,

    maxRadius:
      24 +
      amount * .72,

    strength:
      amount / 100
  });


  /* -----------------------------
     画面表面の水滴
  ----------------------------- */

  const dropletCount =
    Math.floor(
      4 +
      amount * .14
    );


  for (
    let i = 0;
    i < dropletCount;
    i++
  ) {

    droplets.push({

      x:
        targetX +
        random(-20,20) *
        (
          .5 +
          amount / 100
        ),

      y:
        targetY +
        random(-16,16) *
        (
          .5 +
          amount / 100
        ),

      radius:
        random(3.5,10) *
        (
          .68 +
          amount / 150
        ),

      velocityX:
        random(-1.5,1.5),

      velocityY:
        random(2,10),

      life:
        random(1.5,3.8),

      maxLife:
        3.8
    });
  }
}


/* =====================================
   水流を描画
===================================== */

function drawWaterParticle(
  particle
) {

  const alpha =
    Math.max(
      0,
      particle.life /
      particle.maxLife
    );


  ctx.save();

  ctx.translate(
    particle.x,
    particle.y
  );

  ctx.rotate(
    particle.angle
  );


  const gradient =
    ctx.createLinearGradient(
      -particle.radius * 4,
      0,
      particle.radius * 5,
      0
    );


  gradient.addColorStop(
    0,
    `rgba(
      255,
      255,
      255,
      ${alpha * .08}
    )`
  );


  gradient.addColorStop(
    .25,
    `rgba(
      220,
      245,
      255,
      ${alpha * .35}
    )`
  );


  gradient.addColorStop(
    .52,
    `rgba(
      255,
      255,
      255,
      ${alpha * .88}
    )`
  );


  gradient.addColorStop(
    1,
    "rgba(150,210,235,0)"
  );


  ctx.fillStyle =
    gradient;


  ctx.beginPath();

  ctx.ellipse(
    0,
    0,

    particle.radius * 4.5,
    particle.radius,

    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();
}


/* =====================================
   衝突
===================================== */

function drawImpact(
  impact
) {

  const progress =
    impact.age /
    impact.life;


  const radius =
    3 +
    (
      impact.maxRadius - 3
    ) *
    Math.min(
      1,
      progress
    );


  const alpha =
    (
      1 - progress
    ) *
    impact.strength;


  /*
    水膜
  */

  const gradient =
    ctx.createRadialGradient(
      impact.x,
      impact.y,
      0,

      impact.x,
      impact.y,
      radius * 1.3
    );


  gradient.addColorStop(
    0,
    `rgba(
      220,
      246,
      255,
      ${.16 * alpha}
    )`
  );


  gradient.addColorStop(
    .5,
    `rgba(
      200,
      232,
      245,
      ${.06 * alpha}
    )`
  );


  gradient.addColorStop(
    1,
    "rgba(150,210,235,0)"
  );


  ctx.fillStyle =
    gradient;


  ctx.beginPath();

  ctx.arc(
    impact.x,
    impact.y,
    radius * 1.3,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /*
    放射状の飛沫
  */

  ctx.save();

  ctx.translate(
    impact.x,
    impact.y
  );


  const rayCount =
    14 +
    Math.floor(
      impact.strength * 10
    );


  for (
    let i = 0;
    i < rayCount;
    i++
  ) {

    const angle =
      i *
      Math.PI *
      2 /
      rayCount;


    const length =
      radius *
      random(.35,.95);


    ctx.strokeStyle =
      `rgba(
        245,
        253,
        255,
        ${.22 * alpha}
      )`;


    ctx.lineWidth =
      random(.45,1.35);


    ctx.beginPath();

    ctx.moveTo(
      Math.cos(angle) *
      radius *
      .08,

      Math.sin(angle) *
      radius *
      .08
    );


    ctx.lineTo(
      Math.cos(angle) *
      length,

      Math.sin(angle) *
      length
    );

    ctx.stroke();
  }


  ctx.restore();
}


/* =====================================
   ★ 水滴の屈折
===================================== */

function drawDroplet(
  drop
) {

  if (
    !backgroundCanvas ||
    !backgroundContext
  ) {
    return;
  }


  const fade =
    Math.min(
      1,
      drop.life / .45
    );


  const radius =
    drop.radius;


  const size =
    Math.ceil(
      radius * 2.7
    );


  const startX =
    Math.max(
      0,
      Math.floor(
        drop.x - size
      )
    );


  const startY =
    Math.max(
      0,
      Math.floor(
        drop.y - size
      )
    );


  const endX =
    Math.min(
      width,
      Math.ceil(
        drop.x + size
      )
    );


  const endY =
    Math.min(
      height,
      Math.ceil(
        drop.y + size
      )
    );


  const localWidth =
    endX - startX;

  const localHeight =
    endY - startY;


  if (
    localWidth < 1 ||
    localHeight < 1
  ) {
    return;
  }


  /*
    元の背景を取得
  */

  const source =
    backgroundContext.getImageData(
      startX,
      startY,
      localWidth,
      localHeight
    );


  const output =
    ctx.createImageData(
      localWidth,
      localHeight
    );


  const centerX =
    drop.x - startX;

  const centerY =
    drop.y - startY;


  /*
    水滴内部の画像を
    レンズのように歪ませる
  */

  for (
    let y = 0;
    y < localHeight;
    y++
  ) {

    for (
      let x = 0;
      x < localWidth;
      x++
    ) {

      const dx =
        x - centerX;

      const dy =
        y - centerY;


      const distance =
        Math.hypot(
          dx,
          dy
        );


      const normalized =
        distance /
        radius;


      /*
        水滴の外
      */

      if (
        normalized > 1.18
      ) {
        continue;
      }


      /*
        球状レンズの変形量
      */

      const edge =
        Math.min(
          1,
          normalized
        );


      const lens =
        (
          1 -
          edge * edge
        ) *
        radius *
        .34;


      /*
        背景を中心方向へ
        少し引き込む。

        これが
        「水滴越しに景色が歪む」
        部分。
      */

      const sampleX =
        drop.x +
        dx *
        (
          1 -
          .38 *
          (1-edge)
        ) -
        dx *
        lens /
        Math.max(radius,1) *
        .16;


      const sampleY =
        drop.y +
        dy *
        (
          1 -
          .38 *
          (1-edge)
        ) -
        dy *
        lens /
        Math.max(radius,1) *
        .16;


      const imageX =
        Math.max(
          0,
          Math.min(
            backgroundCanvas.width - 1,
            Math.floor(sampleX)
          )
        );


      const imageY =
        Math.max(
          0,
          Math.min(
            backgroundCanvas.height - 1,
            Math.floor(sampleY)
          )
        );


      const sourceIndex =
        (
          imageY *
          backgroundCanvas.width +
          imageX
        ) * 4;


      const outputIndex =
        (
          y *
          localWidth +
          x
        ) * 4;


      /*
        水滴の中心ほど
        少し濃くする
      */

      const opacity =
        Math.max(
          0,

          (
            normalized < .92
              ? .27
              : .10
          )

          *

          fade

          *

          (
            1 -
            Math.max(
              0,
              normalized - .82
            ) / .36
          )
        );


      output.data[
        outputIndex
      ] =
        Math.min(
          255,
          source.data[
            sourceIndex
          ] + 8
        );


      output.data[
        outputIndex + 1
      ] =
        Math.min(
          255,
          source.data[
            sourceIndex + 1
          ] + 12
        );


      output.data[
        outputIndex + 2
      ] =
        Math.min(
          255,
          source.data[
            sourceIndex + 2
          ] + 16
        );


      output.data[
        outputIndex + 3
      ] =
        Math.floor(
          opacity * 255
        );
    }
  }


  /*
    屈折した背景を描画
  */

  ctx.putImageData(
    output,
    startX,
    startY
  );


  /*
    水滴の光
  */

  const highlight =
    ctx.createRadialGradient(

      drop.x -
        radius * .34,

      drop.y -
        radius * .42,

      .1,

      drop.x,
      drop.y,

      radius * 1.1
    );


  highlight.addColorStop(
    0,
    `rgba(
      255,
      255,
      255,
      ${.72 * fade}
    )`
  );


  highlight.addColorStop(
    .09,
    `rgba(
      255,
      255,
      255,
      ${.24 * fade}
    )`
  );


  highlight.addColorStop(
    .34,
    "rgba(255,255,255,0)"
  );


  highlight.addColorStop(
    .82,
    `rgba(
      255,
      255,
      255,
      ${.08 * fade}
    )`
  );


  highlight.addColorStop(
    1,
    "rgba(120,200,225,0)"
  );


  ctx.fillStyle =
    highlight;


  ctx.beginPath();

  ctx.ellipse(
    drop.x,
    drop.y,

    radius,
    radius * 1.13,

    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /*
    水滴の薄い輪郭
  */

  ctx.strokeStyle =
    `rgba(
      255,
      255,
      255,
      ${.28 * fade}
    )`;

  ctx.lineWidth =
    .7;


  ctx.beginPath();

  ctx.ellipse(
    drop.x,
    drop.y,

    radius * .86,
    radius,

    0,
    0,
    Math.PI * 2
  );

  ctx.stroke();
}


/* =====================================
   アニメーション
===================================== */

function animate(
  currentTime
) {

  const delta =
    Math.min(
      .033,
      (
        currentTime -
        lastTime
      ) / 1000
    );


  lastTime =
    currentTime;


  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  /* -----------------------------
     水流
  ----------------------------- */

  for (
    let i =
      waterParticles.length - 1;

    i >= 0;

    i--
  ) {

    const particle =
      waterParticles[i];


    particle.life -=
      delta;


    if (
      particle.life <= 0
    ) {

      waterParticles.splice(
        i,
        1
      );

      continue;
    }


    particle.x +=
      particle.vx *
      delta;

    particle.y +=
      particle.vy *
      delta;


    particle.vx *=
      Math.pow(
        particle.drag,
        delta * 60
      );


    particle.vy *=
      Math.pow(
        particle.drag,
        delta * 60
      );


    drawWaterParticle(
      particle
    );
  }


  /* -----------------------------
     衝突
  ----------------------------- */

  for (
    let i =
      impacts.length - 1;

    i >= 0;

    i--
  ) {

    const impact =
      impacts[i];


    impact.age +=
      delta;


    if (
      impact.age >
      impact.life
    ) {

      impacts.splice(
        i,
        1
      );

      continue;
    }


    drawImpact(
      impact
    );
  }


  /* -----------------------------
     水滴
  ----------------------------- */

  for (
    let i =
      droplets.length - 1;

    i >= 0;

    i--
  ) {

    const drop =
      droplets[i];


    drop.life -=
      delta;


    if (
      drop.life <= 0
    ) {

      droplets.splice(
        i,
        1
      );

      continue;
    }


    /*
      重力で少し下へ
    */

    drop.x +=
      drop.velocityX *
      delta;

    drop.y +=
      drop.velocityY *
      delta;


    drawDroplet(
      drop
    );
  }


  requestAnimationFrame(
    animate
  );
}


requestAnimationFrame(
  animate
);
