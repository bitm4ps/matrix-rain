(() => {
  const W = 240, H = 282;
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  // Render at full physical pixel density for crisp output
  const DPR = window.devicePixelRatio || 1;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(DPR, DPR);
  ctx.imageSmoothingEnabled = false;

  // Katakana + symbols — authentic matrix charset
  const CHARS =
    'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' +
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&<>?';

  const THEMES = [
    { head: '#ffffff', body: '#00ff41', glow: '#00ff41', bg: 'rgba(0,0,0,0.06)'  },
    { head: '#ffffff', body: '#00eeff', glow: '#00eeff', bg: 'rgba(0,0,0,0.06)'  },
    { head: '#ffffff', body: '#ff2a2a', glow: '#ff2a2a', bg: 'rgba(0,0,0,0.06)'  },
    { head: '#ffffff', body: '#ffd700', glow: '#ffd700', bg: 'rgba(0,0,0,0.06)'  },
    { head: '#ffffff', body: '#cc88ff', glow: '#cc88ff', bg: 'rgba(0,0,0,0.05)'  },
  ];

  const FS   = 11;   // font size px
  const COLS = Math.floor(W / FS);
  const ROWS = Math.floor(H / FS);

  let themeIdx = 0;
  let speed    = 38;
  const SPEED_MIN  = 16;
  const SPEED_MAX  = 110;
  const SPEED_STEP = 10;

  function rndChar() { return CHARS[Math.random() * CHARS.length | 0]; }
  function theme()   { return THEMES[themeIdx]; }

  const drops = Array.from({ length: COLS }, () => ({
    y:     -(Math.random() * ROWS * 2 | 0),
    len:   10 + (Math.random() * 18 | 0),
    spd:   0.55 + Math.random() * 0.9,
    chars: Array.from({ length: 40 }, rndChar),
    tick:  0,
  }));

  // Offscreen buffer — draw rain here, composite to main canvas
  const buf = document.createElement('canvas');
  buf.width  = W * DPR;
  buf.height = H * DPR;
  const bx = buf.getContext('2d');
  bx.scale(DPR, DPR);
  bx.imageSmoothingEnabled = false;
  bx.fillStyle = '#000';
  bx.fillRect(0, 0, W, H);

  let lastTs = 0, animId;

  function draw(ts) {
    animId = requestAnimationFrame(draw);
    if (ts - lastTs < speed) return;
    lastTs = ts;

    const t = theme();

    // Fade trail on buffer
    bx.fillStyle = t.bg;
    bx.fillRect(0, 0, W, H);

    bx.font = `bold ${FS}px "Share Tech Mono", "Courier New", monospace`;
    bx.textAlign = 'left';
    bx.textBaseline = 'top';

    drops.forEach(col => {
      // Mutate chars for shimmer
      if (++col.tick > 1) {
        col.chars[Math.random() * col.chars.length | 0] = rndChar();
        col.tick = 0;
      }

      const headRow = col.y | 0;

      for (let r = 0; r < col.len; r++) {
        const row = headRow - r;
        if (row < 0 || row >= ROWS) continue;

        const ch = col.chars[r % col.chars.length];
        const px = (drops.indexOf(col)) * FS;
        const py = row * FS;
        const fade = 1 - r / col.len;

        bx.save();
        if (r === 0) {
          // Bright white head with sharp glow
          bx.shadowColor = t.glow;
          bx.shadowBlur  = 8 * DPR;
          bx.fillStyle   = t.head;
          bx.globalAlpha = 1;
        } else if (r < 3) {
          // Near-head — hot color, strong glow
          bx.shadowColor = t.glow;
          bx.shadowBlur  = 5 * DPR;
          bx.fillStyle   = t.body;
          bx.globalAlpha = fade * 0.95 + 0.05;
        } else {
          // Tail — dim, no glow
          bx.shadowBlur  = 0;
          bx.fillStyle   = t.body;
          bx.globalAlpha = Math.max(0.04, fade * fade * 0.8);
        }
        bx.fillText(ch, px, py);
        bx.restore();
      }

      col.y += col.spd;
      if ((col.y - col.len) * FS > H) {
        col.y   = -(Math.random() * ROWS * 0.9 | 0);
        col.len = 10 + (Math.random() * 18 | 0);
        col.spd = 0.55 + Math.random() * 0.9;
      }
    });

    // Composite buffer to display canvas
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(buf, 0, 0, W, H);
  }

  animId = requestAnimationFrame(draw);

  // --- HUD dots ---
  const hud  = document.getElementById('hud');
  const dots = THEMES.map((_, i) => document.getElementById('d' + i));
  let hudTimer;

  function showHUD() {
    dots.forEach((d, i) => {
      if (!d) return;
      d.style.color = THEMES[i].body;
      d.classList.toggle('active', i === themeIdx);
    });
    hud.classList.add('visible');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => hud.classList.remove('visible'), 2000);
  }

  function cycleTheme()    { themeIdx = (themeIdx + 1) % THEMES.length; showHUD(); }
  function increaseSpeed() { speed = Math.max(SPEED_MIN, speed - SPEED_STEP); }
  function decreaseSpeed() { speed = Math.min(SPEED_MAX, speed + SPEED_STEP); }

  // R1 hardware events
  if (typeof PluginMessageHandler !== 'undefined') {
    document.addEventListener('scrollUp',   increaseSpeed);
    document.addEventListener('scrollDown', decreaseSpeed);
    document.addEventListener('sideClick',  cycleTheme);
  } else {
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp')   increaseSpeed();
      if (e.key === 'ArrowDown') decreaseSpeed();
      if (e.key === ' ')         cycleTheme();
    });
    document.addEventListener('click', cycleTheme);
  }
})();
