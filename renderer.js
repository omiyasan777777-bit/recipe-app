/**
 * renderer.js
 * Handles the infinite canvas, terminal card spawning, drag/resize,
 * and xterm.js terminal instances backed by node-pty via IPC.
 */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────

  const viewport    = document.getElementById('viewport');
  const world       = document.getElementById('canvas-world');
  const emptyState  = document.getElementById('empty-state');
  const zoomEl      = document.getElementById('zoom-indicator');
  const btnNew      = document.getElementById('btn-new-terminal');
  const btnReset    = document.getElementById('btn-reset-view');

  // Canvas transform
  let panX  = 0;
  let panY  = 0;
  let scale = 1;

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 3.0;

  // Terminal card registry  { id -> { card, term, fitAddon, cleanupData, cleanupExit } }
  const terminals = new Map();
  let   nextId    = 1;
  let   topZ      = 10;   // z-index counter

  // Panning state
  let isPanning     = false;
  let panStartX     = 0;
  let panStartY     = 0;
  let panStartPanX  = 0;
  let panStartPanY  = 0;

  // Zoom indicator hide timer
  let zoomTimer = null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function applyTransform() {
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  function showZoom() {
    zoomEl.textContent = Math.round(scale * 100) + '%';
    zoomEl.classList.add('visible');
    clearTimeout(zoomTimer);
    zoomTimer = setTimeout(() => zoomEl.classList.remove('visible'), 1200);
  }

  function updateEmptyState() {
    if (terminals.size === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }
  }

  function focusCard(card) {
    // Remove focused class from all cards
    for (const [, t] of terminals) {
      t.card.classList.remove('focused');
    }
    card.classList.add('focused');
    card.style.zIndex = ++topZ;
  }

  // ── Canvas pan ────────────────────────────────────────────────────────────

  viewport.addEventListener('mousedown', (e) => {
    // Middle button (1) or right button (2) → start pan
    if (e.button === 1 || e.button === 2) {
      isPanning   = true;
      panStartX   = e.clientX;
      panStartY   = e.clientY;
      panStartPanX = panX;
      panStartPanY = panY;
      viewport.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = panStartPanX + (e.clientX - panStartX);
    panY = panStartPanY + (e.clientY - panStartY);
    applyTransform();
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 1 || e.button === 2) {
      isPanning = false;
      viewport.style.cursor = 'default';
    }
  });

  // Suppress context menu on right-click (we use it for panning)
  viewport.addEventListener('contextmenu', (e) => e.preventDefault());

  // ── Canvas zoom ───────────────────────────────────────────────────────────

  viewport.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();

    const rect   = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newScale   = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * zoomFactor));

    // Zoom towards mouse cursor
    panX = mouseX - (mouseX - panX) * (newScale / scale);
    panY = mouseY - (mouseY - panY) * (newScale / scale);
    scale = newScale;

    applyTransform();
    showZoom();

    // Refit all terminals after zoom settles
    clearTimeout(viewport._fitTimer);
    viewport._fitTimer = setTimeout(() => {
      for (const [, t] of terminals) {
        try { t.fitAddon.fit(); } catch (_) {}
      }
    }, 150);
  }, { passive: false });

  // ── Reset view ────────────────────────────────────────────────────────────

  btnReset.addEventListener('click', () => {
    panX = 0; panY = 0; scale = 1;
    applyTransform();
    showZoom();
  });

  // ── Spawn terminal ────────────────────────────────────────────────────────

  btnNew.addEventListener('click', spawnTerminal);

  function spawnTerminal() {
    const id = nextId++;

    // Offset each new card so they don't stack perfectly
    const offset = (id - 1) % 6;
    const x = 40 + offset * 30;
    const y = 40 + offset * 30;

    // Build the card DOM
    const card = document.createElement('div');
    card.className = 'terminal-card';
    card.dataset.id = id;
    card.style.left   = x + 'px';
    card.style.top    = y + 'px';
    card.style.zIndex = ++topZ;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-traffic-lights">
          <button class="traffic-light tl-close" title="Close"></button>
          <button class="traffic-light tl-min"   title="Minimize (decorative)"></button>
          <button class="traffic-light tl-max"   title="Maximize (decorative)"></button>
        </div>
        <div class="card-title">
          <span class="card-title-icon">&#x276F;_</span> Terminal ${id}
        </div>
        <div class="card-header-right"></div>
      </div>
      <div class="card-body">
        <div class="xterm-container"></div>
      </div>
      <div class="card-resize-handle"></div>
    `;

    world.appendChild(card);

    // Wire up close button
    card.querySelector('.tl-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTerminal(id);
    });

    // Focus on click
    card.addEventListener('mousedown', () => focusCard(card));

    // Set up drag on header
    makeDraggable(card, card.querySelector('.card-header'));

    // Set up resize on handle
    makeResizable(card, card.querySelector('.card-resize-handle'));

    // Create xterm.js instance
    const term = new Terminal({
      theme: {
        background:   '#0d1117',
        foreground:   '#c9d1d9',
        cursor:       '#58a6ff',
        cursorAccent: '#0d1117',
        black:        '#484f58',
        red:          '#f85149',
        green:        '#3fb950',
        yellow:       '#d29922',
        blue:         '#388bfd',
        magenta:      '#bc8cff',
        cyan:         '#39c5cf',
        white:        '#b1bac4',
        brightBlack:  '#6e7681',
        brightRed:    '#ff7b72',
        brightGreen:  '#56d364',
        brightYellow: '#e3b341',
        brightBlue:   '#58a6ff',
        brightMagenta:'#d2a8ff',
        brightCyan:   '#39c5cf',
        brightWhite:  '#f0f6fc'
      },
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);

    const container = card.querySelector('.xterm-container');
    term.open(container);

    // Small delay so layout settles before fit
    setTimeout(() => {
      fitAddon.fit();
    }, 50);

    // Forward keystrokes to pty
    term.onData((data) => {
      window.electronAPI.ptyWrite(id, data);
    });

    // Register IPC listeners
    const cleanupData = window.electronAPI.onPtyData(({ id: tid, data }) => {
      if (tid === id) term.write(data);
    });

    const cleanupExit = window.electronAPI.onPtyExit(({ id: tid }) => {
      if (tid === id) {
        term.writeln('\r\n\x1b[2m[process exited]\x1b[0m');
      }
    });

    // Store entry
    terminals.set(id, { card, term, fitAddon, cleanupData, cleanupExit });

    // Focus
    focusCard(card);
    updateEmptyState();

    // Launch the pty
    const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
    window.electronAPI.ptyCreate({ id, cols: dims.cols, rows: dims.rows })
      .then((res) => {
        if (!res.success) {
          term.writeln(`\x1b[31mFailed to start shell: ${res.error}\x1b[0m`);
        }
      });
  }

  // ── Close terminal ────────────────────────────────────────────────────────

  function closeTerminal(id) {
    const entry = terminals.get(id);
    if (!entry) return;

    // Kill pty
    window.electronAPI.ptyKill(id);

    // Clean up IPC listeners
    if (entry.cleanupData) entry.cleanupData();
    if (entry.cleanupExit) entry.cleanupExit();

    // Dispose xterm
    try { entry.term.dispose(); } catch (_) {}

    // Remove DOM
    entry.card.remove();
    terminals.delete(id);
    updateEmptyState();
  }

  // ── Draggable cards ───────────────────────────────────────────────────────

  function makeDraggable(card, handle) {
    let dragging  = false;
    let startX    = 0;
    let startY    = 0;
    let origLeft  = 0;
    let origTop   = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;   // left button only
      dragging = true;
      startX   = e.clientX;
      startY   = e.clientY;
      origLeft = parseInt(card.style.left, 10) || 0;
      origTop  = parseInt(card.style.top,  10) || 0;
      focusCard(card);
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      // Mouse delta in screen space → convert to world space
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      card.style.left = (origLeft + dx) + 'px';
      card.style.top  = (origTop  + dy) + 'px';
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) dragging = false;
    });
  }

  // ── Resizable cards ───────────────────────────────────────────────────────

  function makeResizable(card, handle) {
    let resizing   = false;
    let startX     = 0;
    let startY     = 0;
    let origW      = 0;
    let origH      = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      resizing = true;
      startX   = e.clientX;
      startY   = e.clientY;
      origW    = card.offsetWidth;
      origH    = card.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      const newW = Math.max(360, origW + dx);
      const newH = Math.max(200, origH + dy);
      card.style.width = newW + 'px';

      // The card-body has an explicit height we need to adjust
      const body = card.querySelector('.card-body');
      const headerH = card.querySelector('.card-header').offsetHeight;
      body.style.height = (newH - headerH) + 'px';
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && resizing) {
        resizing = false;
        // Refit terminal after resize
        const entry = terminals.get(parseInt(card.dataset.id, 10));
        if (entry) {
          setTimeout(() => {
            try {
              entry.fitAddon.fit();
              const dims = entry.fitAddon.proposeDimensions();
              if (dims) {
                window.electronAPI.ptyResize(parseInt(card.dataset.id, 10), dims.cols, dims.rows);
              }
            } catch (_) {}
          }, 50);
        }
      }
    });
  }

  // ── Keyboard shortcut: Ctrl+T → new terminal ─────────────────────────────

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      spawnTerminal();
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  applyTransform();
  updateEmptyState();

})();
