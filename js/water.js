(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (reduceMotion || !finePointer) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class HeightFieldSurface {
    constructor(target, options) {
      this.target = target;
      this.options = options;
      this.host = options.host || target;
      this.canvas = document.createElement("canvas");
      this.canvas.className = "water-surface-canvas";
      this.canvas.setAttribute("aria-hidden", "true");
      this.host.appendChild(this.canvas);
      this.context = this.canvas.getContext("2d", { alpha: true, desynchronized: false });
      if (!this.context) throw new Error("Canvas water surface unavailable");

      this.queue = [];
      this.pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
      this.lastFrame = performance.now();
      this.lastRenderedFrame = 0;
      this.startTime = this.lastFrame;
      this.activeUntil = 0;
      this.cleared = true;
      this.resize();
    }

    resize() {
      const rect = this.target.getBoundingClientRect();
      this.cssWidth = Math.max(1, rect.width);
      this.cssHeight = Math.max(1, rect.height);
      this.aspect = this.cssWidth / this.cssHeight;
      this.width = clamp(Math.round(this.cssWidth / 5), 120, 180);
      this.height = clamp(Math.round(this.width / this.aspect), 56, 120);
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      const length = this.width * this.height;
      this.heights = new Float32Array(length);
      this.velocities = new Float32Array(length);
      this.nextHeights = new Float32Array(length);
      this.nextVelocities = new Float32Array(length);
      this.image = this.context.createImageData(this.width, this.height);
      this.queue = [];
      this.clearOutput();
    }

    disturb(x, y, radius, strength) {
      if (!Number.isFinite(x + y + radius + strength)) return;
      this.queue.push({
        x: clamp(x, 0, 1),
        y: clamp(y, 0, 1),
        radius: Math.max(0.003, radius),
        strength
      });
      if (this.queue.length > 120) this.queue.splice(0, this.queue.length - 120);
      const now = performance.now();
      this.activeUntil = now + 5200;
      this.lastFrame = now;
      this.cleared = false;
    }

    setPointer(x, y) {
      this.pointer.tx = x;
      this.pointer.ty = y;
    }

    applyImpulses(elapsed) {
      const amount = Math.min(this.queue.length, 12);
      for (let impulseIndex = 0; impulseIndex < amount; impulseIndex += 1) {
        const impulse = this.queue.shift();
        const centerX = impulse.x * (this.width - 1);
        const centerY = (1 - impulse.y) * (this.height - 1);
        const radiusX = Math.max(3, impulse.radius * this.width / this.aspect * 2.1);
        const radiusY = Math.max(3, impulse.radius * this.height * 2.1);
        const minX = Math.max(0, Math.floor(centerX - radiusX));
        const maxX = Math.min(this.width - 1, Math.ceil(centerX + radiusX));
        const minY = Math.max(0, Math.floor(centerY - radiusY));
        const maxY = Math.min(this.height - 1, Math.ceil(centerY + radiusY));

        for (let y = minY; y <= maxY; y += 1) {
          const normalizedY = 1 - y / Math.max(this.height - 1, 1);
          for (let x = minX; x <= maxX; x += 1) {
            const normalizedX = x / Math.max(this.width - 1, 1);
            const dx = (normalizedX - impulse.x) * this.aspect;
            const dy = normalizedY - impulse.y;
            const angle = Math.atan2(dy, dx);
            const irregularity = 1
              + 0.052 * Math.sin(angle * 7 + elapsed * 0.91 + impulseIndex * 1.7)
              + 0.027 * Math.sin(angle * 11 - elapsed * 0.47);
            const q = Math.hypot(dx, dy) * irregularity / impulse.radius;
            if (q > 1.8) continue;
            this.velocities[y * this.width + x] += Math.exp(-q * q * 3.15) * impulse.strength;
          }
        }
      }
    }

    simulate(step, elapsed, includeImpulses) {
      if (includeImpulses) this.applyImpulses(elapsed);
      const width = this.width;
      const height = this.height;
      const sourceH = this.heights;
      const sourceV = this.velocities;
      const targetH = this.nextHeights;
      const targetV = this.nextVelocities;

      for (let y = 0; y < height; y += 1) {
        const upY = y === 0 ? 1 : y - 1;
        const downY = y === height - 1 ? height - 2 : y + 1;
        for (let x = 0; x < width; x += 1) {
          const leftX = x === 0 ? 1 : x - 1;
          const rightX = x === width - 1 ? width - 2 : x + 1;
          const index = y * width + x;
          const average = 0.25 * (
            sourceH[y * width + leftX]
            + sourceH[y * width + rightX]
            + sourceH[upY * width + x]
            + sourceH[downY * width + x]
          );
          let velocity = sourceV[index] + (average - sourceH[index]) * 0.565 * step;
          velocity *= Math.pow(0.9917, step);
          let level = sourceH[index] + velocity * step;
          level += (average - level) * 0.0048 * step;
          level *= Math.pow(0.9996, step);

          const edge = Math.min(x, width - 1 - x, y, height - 1 - y);
          if (edge < 7) velocity *= 0.982 + 0.018 * (edge / 7);
          targetV[index] = velocity;
          targetH[index] = level;
        }
      }

      this.heights = targetH;
      this.velocities = targetV;
      this.nextHeights = sourceH;
      this.nextVelocities = sourceV;
    }

    render() {
      const width = this.width;
      const height = this.height;
      const heights = this.heights;
      const pixels = this.image.data;
      const tint = this.options.tint;
      const pointerLightX = (this.pointer.x - 0.5) * 0.42 * this.aspect;
      const pointerLightY = (this.pointer.y - 0.5) * 0.34;
      let lightX = 0.20 + pointerLightX;
      let lightY = -0.30 + pointerLightY;
      let lightZ = 0.92;
      const lightLength = Math.hypot(lightX, lightY, lightZ);
      lightX /= lightLength;
      lightY /= lightLength;
      lightZ /= lightLength;

      for (let y = 0; y < height; y += 1) {
        const upY = Math.max(0, y - 1);
        const downY = Math.min(height - 1, y + 1);
        for (let x = 0; x < width; x += 1) {
          const leftX = Math.max(0, x - 1);
          const rightX = Math.min(width - 1, x + 1);
          const index = y * width + x;
          const center = heights[index];
          const left = heights[y * width + leftX];
          const right = heights[y * width + rightX];
          const up = heights[upY * width + x];
          const down = heights[downY * width + x];
          const slopeX = (right - left) * 17;
          const slopeY = (up - down) * 17;
          const curvature = left + right + up + down - 4 * center;
          let normalX = -slopeX;
          let normalY = -slopeY;
          let normalZ = 1;
          const normalLength = Math.hypot(normalX, normalY, normalZ);
          normalX /= normalLength;
          normalY /= normalLength;
          normalZ /= normalLength;
          const lighting = 0.5 + 0.5 * Math.max(-1, Math.min(1,
            normalX * lightX + normalY * lightY + normalZ * lightZ
          ));
          const ridge = Math.abs(curvature) * 210 + Math.hypot(slopeX, slopeY) * 12 + Math.abs(center) * 2;
          const wave = clamp((ridge - 0.008) / 0.262, 0, 1);
          const easedWave = wave * wave * (3 - 2 * wave);
          const crest = curvature > 0 ? clamp(curvature / 0.012, 0, 1) : 0;
          const trough = curvature < 0 ? clamp(-curvature / 0.012, 0, 1) : 0;
          const colorMix = clamp(lighting + crest * 0.28, 0, 1);
          const shadow = [tint[0] * 0.46, tint[1] * 0.62, tint[2] * 0.70];
          const highlight = [
            tint[0] * 0.28 + 0.91 * 0.72,
            tint[1] * 0.28 + 0.96 * 0.72,
            tint[2] * 0.28 + 0.95 * 0.72
          ];
          let red = shadow[0] + (highlight[0] - shadow[0]) * colorMix;
          let green = shadow[1] + (highlight[1] - shadow[1]) * colorMix;
          let blue = shadow[2] + (highlight[2] - shadow[2]) * colorMix;
          red += (tint[0] * 0.72 - red) * trough * 0.38;
          green += (tint[1] * 0.72 - green) * trough * 0.38;
          blue += (tint[2] * 0.72 - blue) * trough * 0.38;
          const edge = Math.min(x, width - 1 - x, y, height - 1 - y);
          const edgeFade = clamp(edge / 4, 0, 1);
          const alpha = easedWave * this.options.opacity * (0.62 + lighting * 0.38) * edgeFade;
          const pixel = index * 4;
          pixels[pixel] = Math.round(clamp(red, 0, 1) * 255);
          pixels[pixel + 1] = Math.round(clamp(green, 0, 1) * 255);
          pixels[pixel + 2] = Math.round(clamp(blue, 0, 1) * 255);
          pixels[pixel + 3] = Math.round(clamp(alpha, 0, this.options.opacity) * 255);
        }
      }
      this.context.putImageData(this.image, 0, 0);
    }

    clearOutput() {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.cleared = true;
    }

    frame(now) {
      if (document.hidden) return false;
      if (now > this.activeUntil && !this.queue.length) {
        if (!this.cleared) this.clearOutput();
        return false;
      }
      if (now - this.lastRenderedFrame < 22) return true;
      this.lastRenderedFrame = now;
      const elapsedSeconds = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      const elapsed = (now - this.startTime) / 1000;
      const smoothing = 1 - Math.pow(0.001, elapsedSeconds);
      this.pointer.x += (this.pointer.tx - this.pointer.x) * smoothing;
      this.pointer.y += (this.pointer.ty - this.pointer.y) * smoothing;
      const substeps = Math.min(3, Math.max(1, Math.ceil(elapsedSeconds / (1 / 60))));
      const step = Math.min(1.2, elapsedSeconds * 60 / substeps);
      for (let index = 0; index < substeps; index += 1) {
        this.simulate(step, elapsed, index === 0);
      }
      this.render();
      return true;
    }
  }

  const definitions = [
    { target: document.querySelector("[data-identity-paper]"), opacity: 0.34, tint: [0.34, 0.52, 0.60] },
    {
      target: document.querySelector("[data-research-visual]"),
      host: document.querySelector("[data-research-layer]"),
      opacity: 0.30,
      tint: [0.38, 0.58, 0.62]
    },
    { target: document.querySelector(".publication.highlight"), opacity: 0.24, tint: [0.38, 0.55, 0.49] }
  ].filter((definition) => definition.target);

  const surfaces = [];
  definitions.forEach((definition) => {
    try {
      surfaces.push(new HeightFieldSurface(definition.target, definition));
    } catch (_) {
      const canvas = definition.host?.querySelector(".water-surface-canvas")
        || definition.target.querySelector(".water-surface-canvas");
      if (canvas) canvas.remove();
    }
  });
  if (!surfaces.length) return;

  let frameId = null;
  let resizeTimer = null;
  const animate = (now) => {
    frameId = null;
    let active = false;
    surfaces.forEach((surface) => {
      active = surface.frame(now) || active;
    });
    if (active) frameId = window.requestAnimationFrame(animate);
  };
  const ensureAnimation = () => {
    if (!frameId && !document.hidden) frameId = window.requestAnimationFrame(animate);
  };

  const pointFromEvent = (surface, event) => {
    const rect = surface.target.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1),
      y: clamp(1 - (event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1),
      px: event.clientX - rect.left,
      py: event.clientY - rect.top
    };
  };

  const addWake = (surface, previous, current, dtMs, strengthScale) => {
    const dx = current.px - previous.px;
    const dy = current.py - previous.py;
    const distance = Math.hypot(dx, dy);
    if (distance < 1.2) return;
    const speed = Math.min(1, distance / Math.max(8, dtMs) / 1.35);
    const samples = Math.min(7, Math.max(1, Math.ceil(distance / 12)));
    const directionX = dx / distance;
    const directionY = -dy / distance;
    for (let index = 1; index <= samples; index += 1) {
      const amount = index / samples;
      const x = previous.x + (current.x - previous.x) * amount;
      const y = previous.y + (current.y - previous.y) * amount;
      const radius = 0.008 + speed * 0.011;
      const strength = -(0.0019 + speed * 0.0074) * strengthScale;
      surface.disturb(x, y, radius, strength);
      if (speed > 0.34) {
        const trail = Math.min(0.018, distance / Math.max(surface.cssWidth, surface.cssHeight) * 0.52);
        surface.disturb(x - directionX * trail, y - directionY * trail, radius * 1.18, -strength * 0.32);
      }
    }
  };

  surfaces.forEach((surface) => {
    let hoverPoint = null;
    let pressed = false;
    surface.target.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      hoverPoint = { ...pointFromEvent(surface, event), lastAt: performance.now() };
    }, { passive: true });
    surface.target.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      if (event.target.closest("[data-particle-title], [data-hamster-pet]")) {
        hoverPoint = null;
        return;
      }
      const point = pointFromEvent(surface, event);
      const now = performance.now();
      surface.setPointer(point.x, point.y);
      if (hoverPoint) addWake(surface, hoverPoint, point, Math.max(1, now - hoverPoint.lastAt), pressed ? 0.92 : 0.36);
      hoverPoint = { ...point, lastAt: now };
      ensureAnimation();
    }, { passive: true });
    surface.target.addEventListener("pointerleave", () => {
      hoverPoint = null;
      pressed = false;
    }, { passive: true });
    surface.target.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      const point = pointFromEvent(surface, event);
      pressed = true;
      surface.setPointer(point.x, point.y);
      surface.disturb(point.x, point.y, 0.018, -0.018);
      ensureAnimation();
    }, { passive: true });
    surface.target.addEventListener("pointerup", (event) => {
      if (!pressed || event.pointerType === "touch") return;
      pressed = false;
      const point = pointFromEvent(surface, event);
      surface.disturb(point.x, point.y, 0.026, -0.024);
      ensureAnimation();
    }, { passive: true });
  });

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => surfaces.forEach((surface) => surface.resize()), 140);
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    } else if (!document.hidden) {
      const now = performance.now();
      surfaces.forEach((surface) => {
        surface.lastFrame = now;
      });
      if (surfaces.some((surface) => now < surface.activeUntil)) ensureAnimation();
    }
  });
})();
