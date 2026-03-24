/**
 * renderer.js
 * Infinite canvas with draggable/resizable Claude Code webview cards.
 * Each card embeds a <webview> with an isolated session partition.
 */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────

  const viewport   = document.getElementById('viewport');
  const world      = document.getElementById('canvas-world');
  const emptyState = document.getElementById('empty-state');
  const zoomEl     = document.getElementById('zoom-indicator');
  const btnNew     = document.getElementById('btn-new-claude');
  const btnReset   = document.getElementById('btn-reset-view');

  // Canvas transform
  let panX  = 0;
  let panY  = 0;
  let scale = 1;

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 3.0;

  // Card registry  { id -> { card } }
  const cards  = new Map();
  let nextId   = 1;
  let topZ     = 10;

  // Panning state
  let isPanning    = false;
  let panStartX    = 0;
  let panStartY    = 0;
  let panStartPanX = 0;
  let panStartPanY = 0;

  // Zoom indicator hide timer
  let zoomTimer = null;

  // Claude.ai URL for each webview
  const CLAUDE_URL = 'https://claude.ai/new';

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
    if (cards.size === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }
  }

  function focusCard(card) {
    for (const [, c] of cards) {
      c.card.classList.remove('focused');
    }
    card.classList.add('focused');
    card.style.zIndex = ++topZ;
  }

  // ── Canvas pan ────────────────────────────────────────────────────────────

  viewport.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2) {
      isPanning    = true;
      panStartX    = e.clientX;
      panStartY    = e.clientY;
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

    panX = mouseX - (mouseX - panX) * (newScale / scale);
    panY = mouseY - (mouseY - panY) * (newScale / scale);
    scale = newScale;

    applyTransform();
    showZoom();
  }, { passive: false });

  // ── Reset view ────────────────────────────────────────────────────────────

  btnReset.addEventListener('click', () => {
    panX = 0; panY = 0; scale = 1;
    applyTransform();
    showZoom();
  });

  // ── Spawn Claude Code card ────────────────────────────────────────────────

  btnNew.addEventListener('click', spawnClaudeCard);

  function spawnClaudeCard() {
    const id = nextId++;

    // Stagger new cards so they don't stack perfectly
    const offset = (id - 1) % 6;
    const x = 40 + offset * 40;
    const y = 40 + offset * 40;

    const card = document.createElement('div');
    card.className = 'claude-card';
    card.dataset.id = id;
    card.style.left   = x + 'px';
    card.style.top    = y + 'px';
    card.style.zIndex = ++topZ;

    // Each card gets its own persistent session so sessions don't collide
    const partition = `persist:claude-${id}`;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-traffic-lights">
          <button class="traffic-light tl-close" title="Close"></button>
          <button class="traffic-light tl-min"   title="Minimize (decorative)"></button>
          <button class="traffic-light tl-max"   title="Maximize (decorative)"></button>
        </div>
        <div class="card-title">
          <span class="card-title-icon"></span>Claude Code ${id}
        </div>
        <div class="card-header-right"></div>
      </div>
      <div class="card-body">
        <div class="card-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading Claude…</div>
        </div>
        <webview
          class="claude-webview"
          src="${CLAUDE_URL}"
          partition="${partition}"
          allowpopups
          webpreferences="contextIsolation=yes"
        ></webview>
      </div>
      <div class="card-resize-handle" data-dir="se"></div>
      <div class="card-resize-handle" data-dir="sw"></div>
      <div class="card-resize-handle" data-dir="ne"></div>
      <div class="card-resize-handle" data-dir="nw"></div>
      <div class="card-resize-handle" data-dir="n"></div>
      <div class="card-resize-handle" data-dir="s"></div>
      <div class="card-resize-handle" data-dir="e"></div>
      <div class="card-resize-handle" data-dir="w"></div>
    `;

    world.appendChild(card);

    // Hide loading spinner once webview finishes loading
    const webview = card.querySelector('webview');
    const loading = card.querySelector('.card-loading');

    webview.addEventListener('did-finish-load', () => {
      loading.classList.add('hidden');
    });

    webview.addEventListener('did-fail-load', () => {
      loading.querySelector('.loading-text').textContent = 'Failed to load';
    });

    // Close button
    card.querySelector('.tl-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeCard(id);
    });

    // Focus on click
    card.addEventListener('mousedown', () => focusCard(card));

    // Drag on header
    makeDraggable(card, card.querySelector('.card-header'));

    // Resize on handles
    makeResizable(card);

    cards.set(id, { card });
    focusCard(card);
    updateEmptyState();
  }

  // ── Close card ────────────────────────────────────────────────────────────

  function closeCard(id) {
    const entry = cards.get(id);
    if (!entry) return;
    entry.card.remove();
    cards.delete(id);
    updateEmptyState();
  }

  // ── Draggable cards ───────────────────────────────────────────────────────

  function makeDraggable(card, handle) {
    let dragging = false;
    let startX   = 0;
    let startY   = 0;
    let origLeft = 0;
    let origTop  = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
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

  function makeResizable(card) {
    let resizing  = false;
    let dir       = '';
    let startX    = 0;
    let startY    = 0;
    let origW     = 0;
    let origH     = 0;
    let origLeft  = 0;
    let origTop   = 0;

    card.querySelectorAll('.card-resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        resizing = true;
        dir      = handle.dataset.dir;
        startX   = e.clientX;
        startY   = e.clientY;
        origW    = card.offsetWidth;
        origH    = card.offsetHeight;
        origLeft = parseInt(card.style.left, 10) || 0;
        origTop  = parseInt(card.style.top,  10) || 0;
        e.preventDefault();
        e.stopPropagation();
      });
    });

    window.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;

      let newW    = origW;
      let newH    = origH;
      let newLeft = origLeft;
      let newTop  = origTop;

      if (dir.includes('e')) newW = Math.max(400, origW + dx);
      if (dir.includes('s')) newH = Math.max(300, origH + dy);
      if (dir.includes('w')) {
        newW    = Math.max(400, origW - dx);
        newLeft = origLeft + origW - newW;
      }
      if (dir.includes('n')) {
        newH   = Math.max(300, origH - dy);
        newTop = origTop + origH - newH;
      }

      card.style.width = newW + 'px';
      card.style.left  = newLeft + 'px';
      card.style.top   = newTop  + 'px';

      const body    = card.querySelector('.card-body');
      const headerH = card.querySelector('.card-header').offsetHeight;
      body.style.height = (newH - headerH) + 'px';
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) resizing = false;
    });
  }

  // ── Keyboard shortcut: Ctrl+T → new Claude Code ───────────────────────────

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      spawnClaudeCard();
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  applyTransform();
  updateEmptyState();

})();
