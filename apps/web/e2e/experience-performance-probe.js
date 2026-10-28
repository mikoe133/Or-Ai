// Test-only CDP init script. Never imported by the application or production build.
(() => {
  const selector = '.garden-canvas, .atlas-stage canvas';
  const contexts = new WeakMap(), objects = new WeakMap(), records = [], frames = [], pending = new Set();
  let draws = 0, nextContext = 0;
  const readiness = { rendererReadyMs: null, resourcesReadyMs: null, firstPaintOpportunityMs: null };
  const nativeRAF = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => {
    let id = nativeRAF(time => {
      pending.delete(id);
      const before = draws, started = performance.now();
      try { callback(time); } finally {
        if (draws > before) frames.push({ time, callbackMs: performance.now() - started, draws: draws - before });
      }
    });
    pending.add(id); return id;
  };
  window.cancelAnimationFrame = id => { pending.delete(id); nativeCancel(id); };
  const nativeContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...args) {
    if (window.__oraiNoWebGL && this.matches(selector) && /^webgl/.test(args[0])) return null;
    const value = nativeContext.apply(this, args);
    if (value && /^webgl/.test(args[0]) && this.matches(selector) && !contexts.has(value)) {
      const record = { id: ++nextContext, createdAt: performance.now(), lost: false, draws: 0, live: {}, created: {}, deleted: {} };
      contexts.set(value, record); records.push(record);
      this.addEventListener('webglcontextlost', () => {
        record.lost = true; record.lostAt = performance.now(); record.liveAtContextLoss = { ...record.live };
        for (const key of Object.keys(record.live)) record.live[key] = 0;
      }, { once: true });
    }
    return value;
  };
  for (const name of ['Buffer', 'Texture', 'Program', 'Shader', 'Framebuffer', 'Renderbuffer', 'VertexArray', 'Query', 'Sampler', 'TransformFeedback']) {
    const create = WebGL2RenderingContext.prototype['create' + name], remove = WebGL2RenderingContext.prototype['delete' + name];
    if (!create || !remove) continue;
    WebGL2RenderingContext.prototype['create' + name] = function (...args) {
      const object = create.apply(this, args), record = contexts.get(this);
      if (record && object) { objects.set(object, { record, name, deleted: false });
        record.live[name] = (record.live[name] || 0) + 1; record.created[name] = (record.created[name] || 0) + 1; }
      return object;
    };
    WebGL2RenderingContext.prototype['delete' + name] = function (object) {
      const tracked = object && objects.get(object);
      if (tracked && !tracked.deleted) { tracked.deleted = true; tracked.record.live[name]--;
        tracked.record.deleted[name] = (tracked.record.deleted[name] || 0) + 1; }
      return remove.call(this, object);
    };
  }
  for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
    const original = WebGL2RenderingContext.prototype[name];
    WebGL2RenderingContext.prototype[name] = function (...args) {
      const record = contexts.get(this); if (record) { record.draws++; draws++; }
      return original.apply(this, args);
    };
  }
  let paintPending = false;
  const checkReady = () => {
    const root = document.querySelector('[data-graphics-state="ready"]');
    if (!root || !records.some(record => record.draws > 0 && !record.lost)) return;
    if (readiness.rendererReadyMs === null) readiness.rendererReadyMs = performance.now();
    const images = [...root.querySelectorAll('.garden-reference, .atlas-reference')];
    const required = window.__oraiExpectedImages || 0;
    if (images.length < required || images.some(image => !image.complete || image.naturalWidth < 1)) return;
    if (readiness.resourcesReadyMs === null) readiness.resourcesReadyMs = performance.now();
    if (paintPending) return; paintPending = true;
    nativeRAF(() => { readiness.firstPaintOpportunityMs = performance.now(); observer.disconnect(); document.removeEventListener('load', checkReady, true); });
  };
  const observer = new MutationObserver(checkReady);
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-graphics-state', 'src'] });
  document.addEventListener('load', checkReady, true);
  window.__oraiPerformance = {
    snapshot() { return JSON.parse(JSON.stringify({ readiness, frames, contexts: records, draws,
      pendingRAF: pending.size, visibility: document.visibilityState, now: performance.now(),
      navigation: performance.getEntriesByType('navigation').map(entry => entry.toJSON()),
      resources: performance.getEntriesByType('resource').filter(entry => entry.name.startsWith(location.origin)).map(entry => ({
        name: entry.name.replace(location.origin, ''), duration: entry.duration, transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize })),
    })); },
    resetFrames() { frames.length = 0; },
  };
})();
