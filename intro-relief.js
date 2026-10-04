/* A small, self-contained 3D relief. No external assets or rendering library. */
const canvas = document.querySelector('#intro-relief-canvas');
const context = canvas?.getContext('2d');

if (context) {
  const scene = canvas.parentElement;
  const control = document.querySelector('#intro-motion');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const LAYERS = 28;
  const POINTS = 80;
  const BUILD_TIME = 9500;
  const elevation = 0.64;
  const sinElevation = Math.sin(elevation);
  const cosElevation = Math.cos(elevation);
  let width = 0;
  let height = 0;
  let elapsed = 0;
  let paused = false;
  let frame = 0;
  let lastFrame = 0;

  // Horizontal contours form a tapered ribbon with a gently curved footprint.
  function ring(level) {
    const ratio = level / LAYERS;
    const length = 5.1 - ratio * 0.65;
    const breadth = 1.0 - ratio * 0.34;
    return Array.from({ length: POINTS }, (_, i) => {
      const angle = i * Math.PI * 2 / POINTS;
      const x = Math.sign(Math.cos(angle)) * Math.abs(Math.cos(angle)) ** 0.62 * length;
      const y = Math.sign(Math.sin(angle)) * Math.abs(Math.sin(angle)) ** 0.74 * breadth
        + 0.44 * Math.sin(x * 0.65);
      return { x, y, z: level * 0.037 };
    });
  }

  const contours = Array.from({ length: LAYERS + 1 }, (_, level) => ring(level));
  const faces = [];
  for (let layer = 1; layer <= LAYERS; layer++) {
    for (let i = 0; i < POINTS; i++) {
      const next = (i + 1) % POINTS;
      const points = [contours[layer - 1][i], contours[layer - 1][next], contours[layer][next], contours[layer][i]];
      const a = points[0];
      const u = { x: points[1].x - a.x, y: points[1].y - a.y, z: points[1].z - a.z };
      const v = { x: points[3].x - a.x, y: points[3].y - a.y, z: points[3].z - a.z };
      const normal = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
      const size = Math.hypot(normal.x, normal.y, normal.z);
      faces.push({ layer, points, normal: { x: normal.x / size, y: normal.y / size, z: normal.z / size } });
    }
  }

  function draw(time) {
    if (!width || !height) return;
    const amount = reducedMotion.matches ? LAYERS : Math.min(LAYERS, time / BUILD_TIME * LAYERS);
    const complete = Math.floor(amount);
    const progress = amount - complete;
    const yaw = reducedMotion.matches ? -0.12 : -0.12 + Math.sin(time / 11000) * 0.12;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const scale = Math.min(width / 12.3, height / 3.65);
    const originX = width * 0.49;
    const originY = height * 0.64;
    const project = point => {
      const x = point.x * cosYaw - point.y * sinYaw;
      const y = point.x * sinYaw + point.y * cosYaw;
      return { x: originX + x * scale, y: originY + (y * sinElevation - point.z * cosElevation) * scale, depth: y * cosElevation + point.z * sinElevation };
    };
    const trace = points => {
      context.beginPath();
      points.forEach((point, i) => i ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    };

    context.clearRect(0, 0, width, height);
    // Soft contact shadow anchors the relief without a visible ground plane.
    context.save();
    context.translate(originX, originY + scale * 0.28);
    context.scale(scale * 5.25, scale * 0.84);
    const shadow = context.createRadialGradient(0, 0, 0.2, 0, 0, 1);
    shadow.addColorStop(0, 'rgba(72,42,23,0.16)');
    shadow.addColorStop(1, 'rgba(72,42,23,0)');
    context.fillStyle = shadow;
    context.fillRect(-1, -1, 2, 2);
    context.restore();

    // The first contour is visible immediately; each following layer grows above it.
    trace(contours[0].map(project));
    context.closePath();
    context.strokeStyle = 'rgba(255,91,45,0.34)';
    context.lineWidth = 1;
    context.stroke();

    const surfaces = [];
    for (const face of faces) {
      if (face.layer > complete) break;
      const normalX = face.normal.x * cosYaw - face.normal.y * sinYaw;
      const normalY = face.normal.x * sinYaw + face.normal.y * cosYaw;
      if (normalY * cosElevation + face.normal.z * sinElevation <= 0) continue;
      const points = face.points.map(project);
      const light = Math.max(0, Math.min(1, -normalX * 0.32 + normalY * 0.2 + face.normal.z * 0.78));
      surfaces.push({ points, depth: points.reduce((sum, p) => sum + p.depth, 0) / points.length, color: `rgb(${Math.round(211 + light * 44)},${Math.round(62 + light * 61)},${Math.round(24 + light * 30)})`, seam: true });
    }

    if (complete > 0) {
      const top = contours[complete];
      const center = { x: 0, y: 0, z: complete * 0.037 };
      for (let i = 0; i < POINTS; i++) {
        const points = [center, top[i], top[(i + 1) % POINTS]].map(project);
        surfaces.push({ points, depth: points.reduce((sum, p) => sum + p.depth, 0) / points.length, color: '#ff743c', seam: false });
      }
    }

    surfaces.sort((a, b) => a.depth - b.depth);
    for (const surface of surfaces) {
      trace(surface.points);
      context.closePath();
      context.fillStyle = surface.color;
      context.fill();
      // Matching strokes prevent tiny antialiasing gaps between adjacent faces.
      context.strokeStyle = surface.color;
      context.lineWidth = 0.5;
      context.stroke();
      if (surface.seam) {
        trace(surface.points.slice(2));
        context.strokeStyle = 'rgba(119,42,15,0.32)';
        context.lineWidth = 0.65;
        context.stroke();
      }
    }

    // A fine, bright line shows the current layer being laid down.
    if (complete < LAYERS && progress > 0) {
      const next = contours[complete + 1].map(project);
      const count = progress * POINTS;
      const end = Math.floor(count);
      const partial = next.slice(0, end + 1);
      const a = next[end % POINTS];
      const b = next[(end + 1) % POINTS];
      partial.push({ x: a.x + (b.x - a.x) * (count - end), y: a.y + (b.y - a.y) * (count - end) });
      trace(partial);
      context.strokeStyle = '#ff5b2d';
      context.lineWidth = 1.7;
      context.lineCap = 'round';
      context.stroke();
    }

    scene.classList.add('is-ready');
  }

  function active() {
    return document.body.classList.contains('intro-active') && !document.hidden;
  }

  function tick(now) {
    frame = 0;
    if (!active() || paused || reducedMotion.matches) return;
    if (!lastFrame) lastFrame = now;
    const delta = now - lastFrame;
    if (delta >= 1000 / 30) {
      elapsed += Math.min(delta, 80);
      lastFrame = now;
      draw(elapsed);
    }
    frame = requestAnimationFrame(tick);
  }

  function synchronize() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    control.hidden = reducedMotion.matches;
    if (!active()) return;
    const bounds = scene.getBoundingClientRect();
    if (bounds.width && bounds.height) {
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    draw(elapsed);
    if (!paused && !reducedMotion.matches) frame = requestAnimationFrame(tick);
  }

  control.addEventListener('click', () => {
    paused = !paused;
    control.classList.toggle('is-paused', paused);
    const label = paused ? 'Reprendre l’animation' : 'Mettre l’animation en pause';
    control.setAttribute('aria-label', label);
    control.title = label;
    synchronize();
  });
  new ResizeObserver(synchronize).observe(scene);
  new MutationObserver(synchronize).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', synchronize);
  reducedMotion.addEventListener('change', synchronize);
  synchronize();
}
