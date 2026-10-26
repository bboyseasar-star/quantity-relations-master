(function () {
  'use strict';

  // MathLive の仮想キーボード（0.101.0 の要素名）のキーを押しても線を書かない
  const PROTECTED_SELECTOR = 'button, math-field, input, textarea, select, a, [role="button"], label, .ML__keyboard, .ML__keyboard *, [class^="MLK__"], [class*=" MLK__"]';
  const state = {
    mounted: false,
    available: false,
    tool: null,
    pointerId: null,
    previous: null,
    hasMarks: false,
    canvas: null,
    context: null,
    controls: null,
    penButton: null,
    eraserButton: null,
    clearButton: null
  };

  function applyDrawingMode() {
    if (!state.context) return;
    state.context.lineCap = 'round';
    state.context.lineJoin = 'round';
    state.context.globalAlpha = 1;
    if (state.tool === 'eraser') {
      state.context.globalCompositeOperation = 'destination-out';
      state.context.lineWidth = 24;
      state.context.fillStyle = '#000';
      state.context.strokeStyle = '#000';
    } else {
      state.context.globalCompositeOperation = 'source-over';
      state.context.lineWidth = 3;
      state.context.fillStyle = '#302875';
      state.context.strokeStyle = '#302875';
    }
  }

  function resizeCanvas() {
    if (!state.canvas || !state.context) return;
    const oldWidth = state.canvas.width;
    const oldHeight = state.canvas.height;
    const snapshot = document.createElement('canvas');
    snapshot.width = oldWidth;
    snapshot.height = oldHeight;
    if (oldWidth && oldHeight) snapshot.getContext('2d').drawImage(state.canvas, 0, 0);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    state.canvas.width = Math.round(cssWidth * dpr);
    state.canvas.height = Math.round(cssHeight * dpr);
    state.canvas.style.width = `${cssWidth}px`;
    state.canvas.style.height = `${cssHeight}px`;
    state.context = state.canvas.getContext('2d', { willReadFrequently: true });
    state.context.setTransform(1, 0, 0, 1, 0, 0);
    state.context.globalCompositeOperation = 'source-over';
    if (oldWidth && oldHeight) {
      state.context.drawImage(snapshot, 0, 0, oldWidth, oldHeight, 0, 0, state.canvas.width, state.canvas.height);
    }
    state.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyDrawingMode();
  }

  function updateControls() {
    if (!state.controls) return;
    state.controls.hidden = !state.available;
    state.canvas.classList.toggle('is-available', state.available);
    state.penButton.classList.toggle('is-active', state.tool === 'pen');
    state.eraserButton.classList.toggle('is-active', state.tool === 'eraser');
    state.penButton.setAttribute('aria-pressed', String(state.tool === 'pen'));
    state.eraserButton.setAttribute('aria-pressed', String(state.tool === 'eraser'));
    state.clearButton.disabled = !state.hasMarks;
    document.documentElement.classList.toggle('handwriting-active', state.available && Boolean(state.tool));
  }

  function selectTool(tool) {
    state.tool = state.tool === tool ? null : tool;
    state.pointerId = null;
    state.previous = null;
    applyDrawingMode();
    updateControls();
  }

  function clearCanvas() {
    if (!state.context || !state.canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    state.context.save();
    state.context.setTransform(1, 0, 0, 1, 0, 0);
    state.context.globalCompositeOperation = 'source-over';
    state.context.clearRect(0, 0, state.canvas.width, state.canvas.height);
    state.context.restore();
    state.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.hasMarks = false;
    state.tool = null;
    state.pointerId = null;
    state.previous = null;
    applyDrawingMode();
    updateControls();
  }

  function isProtected(target) {
    return target instanceof Element && Boolean(target.closest(PROTECTED_SELECTOR));
  }

  function targetAt(event) {
    return document.elementFromPoint(event.clientX, event.clientY) || event.target;
  }

  function point(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function finishStroke(event) {
    if (state.pointerId !== event.pointerId) return;
    state.pointerId = null;
    state.previous = null;
  }

  function beginStroke(event) {
    if (!state.available || !state.tool || state.pointerId !== null || !event.isPrimary || isProtected(targetAt(event))) return;
    state.pointerId = event.pointerId;
    state.previous = point(event);
    applyDrawingMode();
    state.context.beginPath();
    state.context.arc(state.previous.x, state.previous.y, state.tool === 'eraser' ? 12 : 1.5, 0, Math.PI * 2);
    state.context.fill();
    state.hasMarks = true;
    updateControls();
    event.preventDefault();
  }

  function continueStroke(event) {
    if (state.pointerId !== event.pointerId || !state.previous) return;
    if (isProtected(targetAt(event))) {
      finishStroke(event);
      return;
    }
    const next = point(event);
    applyDrawingMode();
    state.context.beginPath();
    state.context.moveTo(state.previous.x, state.previous.y);
    state.context.lineTo(next.x, next.y);
    state.context.stroke();
    state.previous = next;
    event.preventDefault();
  }

  function makeButton(label, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `handwriting-button ${className}`;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function mount() {
    if (state.mounted) return;
    state.canvas = document.createElement('canvas');
    state.canvas.className = 'handwriting-canvas';
    state.canvas.setAttribute('aria-hidden', 'true');

    state.controls = document.createElement('div');
    state.controls.className = 'handwriting-tools';
    state.controls.setAttribute('role', 'group');
    state.controls.setAttribute('aria-label', '手書きメモ');
    state.penButton = makeButton('✏️ ペン', 'pen-button', () => selectTool('pen'));
    state.eraserButton = makeButton('消しゴム', 'eraser-button', () => selectTool('eraser'));
    state.clearButton = makeButton('全消し', 'clear-handwriting', clearCanvas);
    state.penButton.setAttribute('aria-pressed', 'false');
    state.eraserButton.setAttribute('aria-pressed', 'false');
    state.controls.append(state.penButton, state.eraserButton, state.clearButton);
    document.body.append(state.canvas, state.controls);

    state.context = state.canvas.getContext('2d', { willReadFrequently: true });
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('pointerdown', beginStroke, { capture: true, passive: false });
    document.addEventListener('pointermove', continueStroke, { capture: true, passive: false });
    document.addEventListener('pointerup', finishStroke, true);
    document.addEventListener('pointercancel', finishStroke, true);
    resizeCanvas();
    state.mounted = true;
    updateControls();
  }

  function reset(available) {
    if (!state.mounted) mount();
    clearCanvas();
    state.available = Boolean(available);
    updateControls();
  }

  function inkPixels() {
    if (!state.context || !state.canvas) return 0;
    const pixels = state.context.getImageData(0, 0, state.canvas.width, state.canvas.height).data;
    let count = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index]) count += 1;
    return count;
  }

  window.QuantityRelationsHandwriting = { mount, reset, inkPixels };
}());
