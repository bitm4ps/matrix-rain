(() => {
  const W = 240, H = 282;
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  // --- Character set: katakana + latin + digits for authenticity ---
  const CHARS =
    'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' +
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*<>?';

  // --- Themes: [head, body, fade bg alpha] ---
  const THEMES = [
    { name: 'matrix',  head: '#ffffff', body: '#00ff41', bg: 'rgba(0,0,0,0.055)' },
    { name: 'cyber',   head: '#ffffff', body: '#00eeff', bg: 'rgba(0,0,0,0.055)' },
    { name: 'blood',   head: '#ffffff', body: '#ff2a2a', bg: 'rgba(0,0,0,0.055)' },
    { name: 'gold',    head: '#ffffff', body: '#ffd700', bg: 'rgba(0,0,0,0.055)' },
    { name: 'ghost',   head: '#ffffff', body: 'rgba(255,255,255,0.7)', bg: 'rgba(0,0,0,0.04)' },
  ];

  const FONT_SIZE = 10;
  const COLS = Math.floor(W / FONT_SIZE);    // 24 columns
  const ROWS = Math.floor(H / FONT_SIZE);    // 28 rows

  let themeIdx = 0;
  let speed = 40;          // ms per frame (lower = faster)
  const SPEED_MIN = 18;
  const SPEED_MAX = 120;
  const SPEED_STEP = 8;

  // Each column: y position (in rows), length, char mutation timer
  const drops = Array.from({ length: COLS }, () => ({
    y: -Math.floor(Math.random() * ROWS * 1.5),   // stagger start above screen
    len: 8 + Math.floor(Math.random() * 16),       // trail length
    speed: 0.6 + Math.random() * 0.8,              // per-column speed variance
    chars: Array.from({ length: 32 }, () => rndChar()),
    mutateAt: 0,
  }));

  function rndChar() {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  function theme() { return THEMES[themeIdx]; }

  let lastFrame = 0;
  let animId;

  function draw(ts) {
    animId = requestAnimationFrame(draw);
    if (ts - lastFrame < speed) return;
    lastFrame = ts;

    const t = theme();

    // Semi-transparent black overlay — creates the fade trail
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.font = `bold ${FONT_SIZE}px monospace`;
    ctx.textAlign = 'left';

    drops.forEach((col, i) => {
      const x = i * FONT_SIZE;

      // Mutate chars randomly for the shimmer effect
      col.mutateAt++;
      if (col.mutateAt > 2) {
        const slot = Math.floor(Math.random() * col.chars.length);
        col.chars[slot] = rndChar();
        col.mutateAt = 0;
      }

      // Draw visible trail rows
      const headY = Math.floor(col.y);
      for (let r = 0; r < col.len; r++) {
        const ry = headY - r;
        if (ry < 0 || ry >= ROWS) continue;

        const charIdx = r % col.chars.length;
        const ch = col.chars[charIdx];

        if (r === 0) {
          // Head character — bright white
          ctx.fillStyle = t.head;
          ctx.shadowColor = t.head;
          ctx.shadowBlur = 6;
        } else {
          // Body — fade from bright to dim by position in trail
          const fade = 1 - (r / col.len);
          ctx.fillStyle = t.body;
          ctx.globalAlpha = Math.max(0.08, fade * fade);
          ctx.shadowColor = t.body;
          ctx.shadowBlur = r < 3 ? 4 : 0;
        }

        ctx.fillText(ch, x + 1, (ry + 1) * FONT_SIZE);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Advance column
      col.y += col.speed;

      // Reset when fully off screen bottom
      if ((col.y - col.len) * FONT_SIZE > H) {
        col.y = -Math.floor(Math.random() * ROWS * 0.8);
        col.len = 8 + Math.floor(Math.random() * 16);
        col.speed = 0.6 + Math.random() * 0.8;
      }
    });
  }

  animId = requestAnimationFrame(draw);

  // --- HUD (theme dots) ---
  const hud = document.getElementById('hud');
  const dots = Array.from({ length: THEMES.length }, (_, i) => {
    const d = document.getElementById('d' + i);
    return d;
  });
  let hudTimer;

  function showHUD() {
    dots.forEach((d, i) => {
      if (!d) return;
      d.style.color = THEMES[i].body;
      d.classList.toggle('active', i === themeIdx);
    });
    hud.classList.add('visible');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => hud.classList.remove('visible'), 1800);
  }

  function cycleTheme() {
    themeIdx = (themeIdx + 1) % THEMES.length;
    showHUD();
  }

  function increaseSpeed() {
    speed = Math.max(SPEED_MIN, speed - SPEED_STEP);
  }

  function decreaseSpeed() {
    speed = Math.min(SPEED_MAX, speed + SPEED_STEP);
  }

  // --- R1 Hardware ---
  const isR1 = typeof PluginMessageHandler !== 'undefined';

  if (isR1) {
    document.addEventListener('scrollUp',    increaseSpeed);
    document.addEventListener('scrollDown',  decreaseSpeed);
    document.addEventListener('sideClick',   cycleTheme);
  } else {
    // Browser fallback for testing
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp')   increaseSpeed();
      if (e.key === 'ArrowDown') decreaseSpeed();
      if (e.key === ' ')         cycleTheme();
    });
    document.addEventListener('click', cycleTheme);
  }
})();
