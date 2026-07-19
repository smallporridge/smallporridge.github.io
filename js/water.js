(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (reduceMotion || !finePointer) return;

  const MAX_IMPULSES = 12;
  const vertexShaderSource = `#version 300 es
    precision highp float;
    layout(location = 0) in vec2 a_position;
    out vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const simulationShaderSource = `#version 300 es
    precision highp float;
    precision highp sampler2D;
    in vec2 v_uv;
    out vec4 fragColor;
    uniform sampler2D u_state;
    uniform vec2 u_texel;
    uniform float u_aspect;
    uniform float u_step;
    uniform float u_time;
    uniform int u_impulseCount;
    uniform vec4 u_impulses[12];

    float mirrorCoord(float value) {
      if (value < 0.0) return -value;
      if (value > 1.0) return 2.0 - value;
      return value;
    }

    float sampleHeight(vec2 uv) {
      return texture(u_state, vec2(mirrorCoord(uv.x), mirrorCoord(uv.y))).r;
    }

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 state = texture(u_state, v_uv).rg;
      float height = state.r;
      float velocity = state.g;
      float leftH = sampleHeight(v_uv - vec2(u_texel.x, 0.0));
      float rightH = sampleHeight(v_uv + vec2(u_texel.x, 0.0));
      float downH = sampleHeight(v_uv - vec2(0.0, u_texel.y));
      float upH = sampleHeight(v_uv + vec2(0.0, u_texel.y));
      float average = 0.25 * (leftH + rightH + downH + upH);

      velocity += (average - height) * 0.565 * u_step;
      velocity *= pow(0.9917, u_step);
      height += velocity * u_step;
      height = mix(height, average, 0.0048 * u_step);
      height *= pow(0.9996, u_step);

      float drift =
        sin(v_uv.x * 13.2 + v_uv.y * 8.1 + u_time * 0.23) +
        0.55 * sin(v_uv.x * -21.7 + v_uv.y * 15.4 - u_time * 0.17) +
        0.18 * (hash21(floor(v_uv * 29.0) + floor(u_time * 0.15)) - 0.5);
      velocity += drift * 0.0000012 * u_step;

      for (int i = 0; i < 12; i++) {
        if (i >= u_impulseCount) break;
        vec4 impulse = u_impulses[i];
        vec2 delta = v_uv - impulse.xy;
        delta.x *= u_aspect;
        float angle = atan(delta.y, delta.x);
        float irregularity = 1.0
          + 0.052 * sin(angle * 7.0 + u_time * 0.91 + float(i) * 1.7)
          + 0.027 * sin(angle * 11.0 - u_time * 0.47);
        float q = length(delta) * irregularity / max(impulse.z, 0.0001);
        velocity += exp(-q * q * 3.15) * impulse.w;
      }

      float edge = min(min(v_uv.x, 1.0 - v_uv.x), min(v_uv.y, 1.0 - v_uv.y));
      velocity *= mix(0.982, 1.0, smoothstep(0.0, 0.045, edge));
      fragColor = vec4(height, velocity, 0.0, 1.0);
    }
  `;

  const renderShaderSource = `#version 300 es
    precision highp float;
    precision highp sampler2D;
    in vec2 v_uv;
    out vec4 fragColor;
    uniform sampler2D u_state;
    uniform vec2 u_texel;
    uniform vec2 u_pointer;
    uniform vec3 u_tint;
    uniform float u_opacity;
    uniform float u_aspect;

    float sampleHeight(vec2 uv) {
      return texture(u_state, clamp(uv, 0.0, 1.0)).r;
    }

    void main() {
      float centerH = sampleHeight(v_uv);
      float leftH = sampleHeight(v_uv - vec2(u_texel.x, 0.0));
      float rightH = sampleHeight(v_uv + vec2(u_texel.x, 0.0));
      float downH = sampleHeight(v_uv - vec2(0.0, u_texel.y));
      float upH = sampleHeight(v_uv + vec2(0.0, u_texel.y));
      vec2 slope = vec2(rightH - leftH, upH - downH) * 17.0;
      float curvature = leftH + rightH + downH + upH - 4.0 * centerH;
      vec3 normal = normalize(vec3(-slope.x, -slope.y, 1.0));
      vec2 pointerLight = (u_pointer - 0.5) * vec2(0.42 * u_aspect, 0.34);
      vec3 lightDirection = normalize(vec3(0.20 + pointerLight.x, -0.30 + pointerLight.y, 0.92));
      float lighting = 0.5 + 0.5 * dot(normal, lightDirection);
      float ridge = abs(curvature) * 210.0 + length(slope) * 12.0 + abs(centerH) * 2.0;
      float waveAlpha = smoothstep(0.008, 0.27, ridge);
      vec3 halfDirection = normalize(lightDirection + vec3(0.0, 0.0, 1.0));
      float specular = pow(max(dot(normal, halfDirection), 0.0), 92.0);
      float crest = smoothstep(0.0, 0.012, curvature) * smoothstep(0.015, 0.20, ridge);
      float trough = smoothstep(0.0, 0.012, -curvature) * smoothstep(0.015, 0.20, ridge);
      vec3 shadowColor = u_tint * vec3(0.46, 0.62, 0.70);
      vec3 highlightColor = mix(u_tint, vec3(0.91, 0.96, 0.95), 0.72);
      vec3 color = mix(shadowColor, highlightColor, clamp(lighting + crest * 0.28, 0.0, 1.0));
      color = mix(color, u_tint * 0.72, trough * 0.38);
      color += vec3(0.94, 0.97, 0.96) * specular * 0.32;
      float alpha = waveAlpha * u_opacity * (0.62 + lighting * 0.38);
      alpha += specular * u_opacity * 0.22;
      float edge = min(min(v_uv.x, 1.0 - v_uv.x), min(v_uv.y, 1.0 - v_uv.y));
      alpha *= smoothstep(0.0, 0.018, edge);
      fragColor = vec4(color, clamp(alpha, 0.0, u_opacity));
    }
  `;

  class WaterSurface {
    constructor(target, options) {
      this.target = target;
      this.options = options;
      this.host = options.host || target;
      this.canvas = document.createElement("canvas");
      this.canvas.className = "water-surface-canvas";
      this.canvas.setAttribute("aria-hidden", "true");
      this.host.appendChild(this.canvas);
      this.gl = this.canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        desynchronized: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance"
      });
      if (!this.gl || !this.gl.getExtension("EXT_color_buffer_float")) {
        throw new Error("WebGL2 water surface unavailable");
      }

      this.queue = [];
      this.impulseData = new Float32Array(MAX_IMPULSES * 4);
      this.textures = [];
      this.framebuffers = [];
      this.readIndex = 0;
      this.lastFrame = performance.now();
      this.startTime = this.lastFrame;
      this.activeUntil = 0;
      this.cleared = true;
      this.pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
      this.suspended = false;
      this.buildResources();
      this.resize();
      this.clearOutput();
      this.canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        this.suspended = true;
      });
    }

    compileShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || "Shader compilation failed";
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }

    createProgram(fragmentSource) {
      const gl = this.gl;
      const vertex = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
      const fragment = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
      const program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(program) || "Program link failed";
        gl.deleteProgram(program);
        throw new Error(message);
      }
      return program;
    }

    uniforms(program, names) {
      const result = {};
      names.forEach((name) => {
        result[name] = this.gl.getUniformLocation(program, name);
      });
      return result;
    }

    buildResources() {
      const gl = this.gl;
      this.simulationProgram = this.createProgram(simulationShaderSource);
      this.renderProgram = this.createProgram(renderShaderSource);
      this.simUniforms = this.uniforms(this.simulationProgram, [
        "u_state", "u_texel", "u_aspect", "u_step", "u_time",
        "u_impulseCount", "u_impulses[0]"
      ]);
      this.renderUniforms = this.uniforms(this.renderProgram, [
        "u_state", "u_texel", "u_pointer", "u_tint", "u_opacity", "u_aspect"
      ]);
      this.vertexArray = gl.createVertexArray();
      this.vertexBuffer = gl.createBuffer();
      gl.bindVertexArray(this.vertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
    }

    createStateTargets() {
      const gl = this.gl;
      this.framebuffers.forEach((framebuffer) => gl.deleteFramebuffer(framebuffer));
      this.textures.forEach((texture) => gl.deleteTexture(texture));
      this.framebuffers = [];
      this.textures = [];
      const filter = gl.getExtension("OES_texture_float_linear") ? gl.LINEAR : gl.NEAREST;
      for (let index = 0; index < 2; index += 1) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, this.simWidth, this.simHeight, 0, gl.RGBA, gl.HALF_FLOAT, null);
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
          throw new Error("Incomplete water simulation framebuffer");
        }
        gl.viewport(0, 0, this.simWidth, this.simHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.textures.push(texture);
        this.framebuffers.push(framebuffer);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.readIndex = 0;
      this.queue = [];
    }

    resize() {
      const rect = this.target.getBoundingClientRect();
      const cssWidth = Math.max(1, rect.width);
      const cssHeight = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      const renderScale = Math.min(1, Math.sqrt(720000 / (cssWidth * cssHeight * dpr * dpr)));
      const renderWidth = Math.max(2, Math.round(cssWidth * dpr * renderScale));
      const renderHeight = Math.max(2, Math.round(cssHeight * dpr * renderScale));
      const simScale = Math.min(0.48, Math.sqrt(90000 / (cssWidth * cssHeight)));
      const simWidth = Math.max(96, Math.round(cssWidth * simScale));
      const simHeight = Math.max(64, Math.round(cssHeight * simScale));
      const changed = simWidth !== this.simWidth || simHeight !== this.simHeight;
      this.cssWidth = cssWidth;
      this.cssHeight = cssHeight;
      this.aspect = cssWidth / cssHeight;
      this.simWidth = simWidth;
      this.simHeight = simHeight;
      if (this.canvas.width !== renderWidth || this.canvas.height !== renderHeight) {
        this.canvas.width = renderWidth;
        this.canvas.height = renderHeight;
      }
      if (changed || this.textures.length !== 2) this.createStateTargets();
      this.clearOutput();
    }

    disturb(x, y, radius, strength) {
      if (!Number.isFinite(x + y + radius + strength)) return;
      this.queue.push({
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
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

    drainImpulses() {
      const amount = Math.min(this.queue.length, MAX_IMPULSES);
      this.impulseData.fill(0);
      for (let index = 0; index < amount; index += 1) {
        const impulse = this.queue.shift();
        const offset = index * 4;
        this.impulseData[offset] = impulse.x;
        this.impulseData[offset + 1] = impulse.y;
        this.impulseData[offset + 2] = impulse.radius;
        this.impulseData[offset + 3] = impulse.strength;
      }
      return amount;
    }

    runSimulation(step, elapsed, includeImpulses) {
      const gl = this.gl;
      const targetIndex = 1 - this.readIndex;
      const count = includeImpulses ? this.drainImpulses() : 0;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[targetIndex]);
      gl.viewport(0, 0, this.simWidth, this.simHeight);
      gl.useProgram(this.simulationProgram);
      gl.bindVertexArray(this.vertexArray);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[this.readIndex]);
      gl.uniform1i(this.simUniforms.u_state, 0);
      gl.uniform2f(this.simUniforms.u_texel, 1 / this.simWidth, 1 / this.simHeight);
      gl.uniform1f(this.simUniforms.u_aspect, this.aspect);
      gl.uniform1f(this.simUniforms.u_step, step);
      gl.uniform1f(this.simUniforms.u_time, elapsed);
      gl.uniform1i(this.simUniforms.u_impulseCount, count);
      gl.uniform4fv(this.simUniforms["u_impulses[0]"], this.impulseData);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.readIndex = targetIndex;
    }

    render() {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.renderProgram);
      gl.bindVertexArray(this.vertexArray);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[this.readIndex]);
      gl.uniform1i(this.renderUniforms.u_state, 0);
      gl.uniform2f(this.renderUniforms.u_texel, 1 / this.simWidth, 1 / this.simHeight);
      gl.uniform2f(this.renderUniforms.u_pointer, this.pointer.x, this.pointer.y);
      gl.uniform3fv(this.renderUniforms.u_tint, this.options.tint);
      gl.uniform1f(this.renderUniforms.u_opacity, this.options.opacity);
      gl.uniform1f(this.renderUniforms.u_aspect, this.aspect);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    clearOutput() {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.cleared = true;
    }

    frame(now) {
      if (this.suspended || document.hidden) return false;
      if (now > this.activeUntil && !this.queue.length) {
        if (!this.cleared) this.clearOutput();
        return false;
      }
      const elapsedSeconds = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      const elapsed = (now - this.startTime) / 1000;
      const smoothing = 1 - Math.pow(0.001, elapsedSeconds);
      this.pointer.x += (this.pointer.tx - this.pointer.x) * smoothing;
      this.pointer.y += (this.pointer.ty - this.pointer.y) * smoothing;
      const substeps = Math.min(3, Math.max(1, Math.ceil(elapsedSeconds / (1 / 60))));
      const normalizedStep = Math.min(1.2, elapsedSeconds * 60 / substeps);
      for (let index = 0; index < substeps; index += 1) {
        this.runSimulation(normalizedStep, elapsed, index === 0);
      }
      this.render();
      return true;
    }
  }

  const definitions = [
    {
      target: document.querySelector("[data-identity-paper]"),
      opacity: 0.34,
      tint: new Float32Array([0.34, 0.52, 0.60])
    },
    {
      target: document.querySelector("[data-research-visual]"),
      host: document.querySelector("[data-research-layer]"),
      opacity: 0.30,
      tint: new Float32Array([0.38, 0.58, 0.62])
    },
    {
      target: document.querySelector(".publication.highlight"),
      opacity: 0.24,
      tint: new Float32Array([0.38, 0.55, 0.49])
    }
  ].filter((definition) => definition.target);

  const surfaces = [];
  definitions.forEach((definition) => {
    try {
      surfaces.push(new WaterSurface(definition.target, definition));
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
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1))),
      y: Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / Math.max(rect.height, 1))),
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
      if (hoverPoint) {
        addWake(surface, hoverPoint, point, Math.max(1, now - hoverPoint.lastAt), pressed ? 0.92 : 0.36);
      }
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
    resizeTimer = window.setTimeout(() => {
      surfaces.forEach((surface) => surface.resize());
    }, 140);
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
