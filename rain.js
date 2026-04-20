(() => {
  const W = 240, H = 282;
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  const DPR = window.devicePixelRatio || 1;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(DPR, DPR);
  ctx.imageSmoothingEnabled = false;

  const CHARS =
    'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' +
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&<>?';

  // Each theme: [r,g,b] of the body color
  const THEMES = [
    [0,   255, 65],   // matrix green
    [0,   238, 255],  // cyber cyan
    [255, 42,  42],   // blood red
    [255, 215, 0],    // gold
    [200, 120, 255],  // purple
  ];

  const FS   = 12;
  const COLS = Math.floor(W / FS);   // 20
  const ROWS = Math.floor(H / FS);   // 23

  let themeIdx = 0;
  let speed    = 42;
  const SPEED_MIN  = 16;
  const SPEED_MAX  = 120;
  const SPEED_STEP = 12;

  function rndChar() { return CHARS[Math.random() * CHARS.length | 0]; }

  // Per-cell grid: intensity 0..1 and current character
  const grid = Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => ({ v: 0, ch: rndChar() }))
  );

  // Active streams
  const streams = Array.from({ length: COLS }, (_, c) => ({
    col: c,
    row: -(Math.random() * ROWS | 0),
    len: 10 + (Math.random() * 12 | 0),
    spd: 0.4 + Math.random() * 0.7,
    pos: 0,   // fractional row position
  }));

  const DECAY = 0.82;  // how fast trail fades per frame

  let lastTs = 0;

  function step() {
    // Decay all cells
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++)
        grid[c][r].v *= DECAY;

    // Advance streams and stamp intensity
    streams.forEach(s => {
      s.pos += s.spd;
      const head = s.row + (s.pos | 0);

      for (let i = 0; i <= s.len; i++) {
        const row = head - i;
        if (row < 0 || row >= ROWS) continue;
        const intensity = i === 0 ? 1 : Math.pow(1 - i / s.len, 1.6);
        const cell = grid[s.col][row];
        if (intensity > cell.v) {
          cell.v  = intensity;
          // Randomly mutate char as stream passes
          if (Math.random() < 0.25) cell.ch = rndChar();
        }
      }

      // Reset when stream exits bottom
      if ((head - s.len) >= ROWS) {
        s.row = -2 - (Math.random() * ROWS * 0.6 | 0);
        s.pos = 0;
        s.len = 10 + (Math.random() * 12 | 0);
        s.spd = 0.4 + Math.random() * 0.7;
      }
    });
  }

  function render() {
    const [tr, tg, tb] = THEMES[themeIdx];

    // Clear to pure black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.font      = `bold ${FS}px "Share Tech Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const { v, ch } = grid[c][r];
        if (v < 0.03) continue;

        const x = c * FS;
        const y = r * FS;

        if (v > 0.95) {
          // Head — pure white with strong glow
          ctx.shadowColor = `rgb(${tr},${tg},${tb})`;
          ctx.shadowBlur  = 10;
          ctx.fillStyle   = '#ffffff';
        } else if (v > 0.7) {
          // Near head — bright body color
          ctx.shadowColor = `rgb(${tr},${tg},${tb})`;
          ctx.shadowBlur  = 6;
          const bright = Math.round(100 + v * 155);
          ctx.fillStyle = `rgb(${Math.min(255,tr+bright|0)},${Math.min(255,tg+bright|0)},${Math.min(255,tb+bright|0)})`;
        } else {
          // Tail — scaled body color, no glow
          ctx.shadowBlur = 0;
          const s = v * v;
          ctx.fillStyle = `rgb(${tr*s|0},${tg*s|0},${tb*s|0})`;
        }

        ctx.fillText(ch, x, y);
      }
    }
    ctx.shadowBlur = 0;
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (ts - lastTs < speed) return;
    lastTs = ts;
    step();
    render();
  }

  requestAnimationFrame(loop);

  // --- HUD ---
  const hud  = document.getElementById('hud');
  const dots = THEMES.map((_, i) => document.getElementById('d' + i));
  let hudTimer;

  function showHUD() {
    const [tr, tg, tb] = THEMES[themeIdx];
    dots.forEach((d, i) => {
      if (!d) return;
      const [r, g, b] = THEMES[i];
      d.style.color = `rgb(${r},${g},${b})`;
      d.classList.toggle('active', i === themeIdx);
    });
    hud.classList.add('visible');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => hud.classList.remove('visible'), 2000);
  }

  function cycleTheme()    { themeIdx = (themeIdx + 1) % THEMES.length; showHUD(); }
  function increaseSpeed() { speed = Math.max(SPEED_MIN, speed - SPEED_STEP); }
  function decreaseSpeed() { speed = Math.min(SPEED_MAX, speed + SPEED_STEP); }

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
