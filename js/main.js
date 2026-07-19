(() => {
  const body = document.body;
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const siteNav = document.querySelector("[data-site-nav]");
  const navLinks = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const backToTop = document.querySelector("[data-back-to-top]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  body.classList.add("js-ready");
  let navSyncFrame = null;

  const setActiveNav = (sectionId) => {
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${sectionId}`);
    });
  };

  const syncActiveNav = () => {
    if (!sections.length) return;
    const anchorY = window.scrollY + Math.min(window.innerHeight * 0.34, 260);
    let active = sections[0];

    sections.forEach((section) => {
      const sectionTop = window.scrollY + section.getBoundingClientRect().top;
      if (sectionTop <= anchorY) active = section;
    });

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 6) {
      active = sections[sections.length - 1];
    }

    setActiveNav(active.id);
  };

  const scheduleActiveNav = () => {
    if (navSyncFrame) window.cancelAnimationFrame(navSyncFrame);
    navSyncFrame = window.requestAnimationFrame(() => {
      navSyncFrame = null;
      syncActiveNav();
    });
  };

  const revealTarget = (target) => {
    if (target && target.classList.contains("reveal")) target.classList.add("is-visible");
  };

  const syncHashTarget = () => {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    revealTarget(target);
    if (target && sections.includes(target)) setActiveNav(target.id);
    scheduleActiveNav();
  };

  const closeMenu = () => {
    body.classList.remove("nav-open");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    }
  };

  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = body.classList.toggle("nav-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });

    siteNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      revealTarget(target);
      if (sections.includes(target)) setActiveNav(target.id);
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", link.getAttribute("href"));
      window.setTimeout(scheduleActiveNav, reduceMotion ? 0 : 320);
      window.setTimeout(scheduleActiveNav, reduceMotion ? 0 : 760);
    });
  });

  if (backToTop) {
    const syncBackToTop = () => {
      backToTop.classList.toggle("is-visible", window.scrollY > 520);
    };
    syncBackToTop();
    window.addEventListener("scroll", syncBackToTop, { passive: true });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  if ("IntersectionObserver" in window) {
    document.querySelectorAll(".reveal").forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) {
        element.classList.add("is-visible");
      }
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px -8% 0px" }
    );

    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

    syncHashTarget();
    scheduleActiveNav();
    window.setTimeout(syncHashTarget, 120);
    window.setTimeout(scheduleActiveNav, 900);
    window.addEventListener("scroll", scheduleActiveNav, { passive: true });
    window.addEventListener("resize", scheduleActiveNav, { passive: true });
    window.addEventListener("hashchange", syncHashTarget, { passive: true });
    window.addEventListener("load", syncHashTarget, { passive: true });
    window.addEventListener("pageshow", syncHashTarget, { passive: true });
    window.setTimeout(() => {
      document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
    }, 1800);
  } else {
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
    syncHashTarget();
    scheduleActiveNav();
    window.addEventListener("scroll", scheduleActiveNav, { passive: true });
    window.addEventListener("resize", scheduleActiveNav, { passive: true });
  }

  const initParticleTitle = () => {
    const holder = document.querySelector("[data-particle-title]");
    if (!holder || reduceMotion) return;

    const canvas = holder.querySelector("canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const text = holder.dataset.particleText || "Yujia Zhou";
    const pointer = { active: false, x: 0, y: 0 };
    let width = 0;
    let height = 0;
    let particles = [];
    let frameId = null;
    let resizeTimer = null;

    const rand = (min, max) => Math.random() * (max - min) + min;

    const makeTargets = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return [];

      let fontSize = Math.min(height * 0.8, width * 0.18);
      offCtx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
      let metrics = offCtx.measureText(text);
      const maxTextWidth = width - 8;

      if (metrics.width > maxTextWidth) {
        fontSize *= maxTextWidth / metrics.width;
        offCtx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
        metrics = offCtx.measureText(text);
      }

      const x = 2;
      const y = height * 0.58;
      offCtx.clearRect(0, 0, width, height);
      offCtx.fillStyle = "#111";
      offCtx.textAlign = "left";
      offCtx.textBaseline = "middle";
      offCtx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
      offCtx.fillText(text, x, y);

      const imageData = offCtx.getImageData(0, 0, width, height).data;
      const step = width < 480 ? 3 : 2;
      let targets = [];

      for (let py = 0; py < height; py += step) {
        for (let px = 0; px < width; px += step) {
          const alpha = imageData[(py * width + px) * 4 + 3];
          if (alpha > 80) {
            targets.push({ x: px + rand(-0.55, 0.55), y: py + rand(-0.55, 0.55) });
          }
        }
      }

      const maxParticles = width < 480 ? 1450 : 2600;
      if (targets.length > maxParticles) {
        const stride = Math.ceil(targets.length / maxParticles);
        targets = targets.filter((_, index) => index % stride === 0);
      }

      return targets;
    };

    const rebuild = () => {
      const rect = holder.getBoundingClientRect();
      width = Math.max(260, Math.round(rect.width));
      height = Math.max(72, Math.round(rect.height));

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const previous = particles;
      const targets = makeTargets();

      particles = targets.map((target, index) => {
        const old = previous[index % Math.max(previous.length, 1)];
        return {
          x: old ? old.x : target.x + rand(-80, 80),
          y: old ? old.y : target.y + rand(-46, 46),
          tx: target.x,
          ty: target.y,
          vx: old ? old.vx * 0.35 : 0,
          vy: old ? old.vy * 0.35 : 0,
          r: rand(0.55, 1.18),
          phase: rand(0, Math.PI * 2)
        };
      });

      holder.classList.add("is-ready");
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        const toTargetX = particle.tx - particle.x;
        const toTargetY = particle.ty - particle.y;
        particle.vx += toTargetX * 0.018;
        particle.vy += toTargetY * 0.018;

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          const radius = width < 480 ? 92 : 128;

          if (distance > 0 && distance < radius) {
            const force = (1 - distance / radius) * 1.18;
            particle.vx += (dx / distance) * force + (-dy / distance) * force * 0.08;
            particle.vy += (dy / distance) * force + (dx / distance) * force * 0.08;
          }
        }

        particle.vx *= 0.91;
        particle.vy *= 0.91;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const drift = Math.sin(time * 0.00075 + particle.phase) * 0.18;
        ctx.beginPath();
        ctx.arc(particle.x + drift, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(43, 78, 90, 0.68)";
        ctx.fill();
      });

      frameId = window.requestAnimationFrame(draw);
    };

    holder.addEventListener(
      "pointermove",
      (event) => {
        const rect = holder.getBoundingClientRect();
        pointer.active = true;
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
      },
      { passive: true }
    );

    holder.addEventListener(
      "pointerleave",
      () => {
        pointer.active = false;
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(rebuild, 160);
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      } else if (!document.hidden && !frameId) {
        frameId = window.requestAnimationFrame(draw);
      }
    });

    rebuild();
    frameId = window.requestAnimationFrame(draw);
  };

  const initParticlePet = () => {
    const stage = document.querySelector("[data-particle-pet]");
    if (!stage || reduceMotion) return;

    const canvas = stage.querySelector("canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pointer = { active: false, x: 0, y: 0 };
    let width = 0;
    let height = 0;
    let particles = [];
    let frameId = null;
    let resizeTimer = null;

    const rand = (min, max) => Math.random() * (max - min) + min;

    const roundedRect = (context, x, y, w, h, r) => {
      context.beginPath();
      context.moveTo(x + r, y);
      context.lineTo(x + w - r, y);
      context.quadraticCurveTo(x + w, y, x + w, y + r);
      context.lineTo(x + w, y + h - r);
      context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      context.lineTo(x + r, y + h);
      context.quadraticCurveTo(x, y + h, x, y + h - r);
      context.lineTo(x, y + r);
      context.quadraticCurveTo(x, y, x + r, y);
      context.fill();
    };

    const drawCat = (context, boxWidth, boxHeight) => {
      const scale = Math.min(boxWidth / 220, boxHeight / 158);
      const offsetX = (boxWidth - 220 * scale) / 2;
      const offsetY = (boxHeight - 158 * scale) / 2 + 5 * scale;
      const x = (value) => offsetX + value * scale;
      const y = (value) => offsetY + value * scale;

      context.clearRect(0, 0, boxWidth, boxHeight);
      context.fillStyle = "#111";
      context.strokeStyle = "#111";
      context.lineCap = "round";
      context.lineJoin = "round";

      context.lineWidth = 9 * scale;
      context.beginPath();
      context.moveTo(x(56), y(75));
      context.bezierCurveTo(x(22), y(60), x(29), y(25), x(64), y(36));
      context.bezierCurveTo(x(83), y(43), x(76), y(59), x(58), y(59));
      context.stroke();

      context.beginPath();
      context.ellipse(x(95), y(82), 58 * scale, 25 * scale, -0.04, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.ellipse(x(61), y(87), 24 * scale, 20 * scale, -0.12, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.ellipse(x(129), y(76), 22 * scale, 18 * scale, 0.02, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.ellipse(x(150), y(67), 27 * scale, 24 * scale, 0.08, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.moveTo(x(130), y(51));
      context.lineTo(x(137), y(26));
      context.lineTo(x(150), y(52));
      context.closePath();
      context.fill();

      context.beginPath();
      context.moveTo(x(150), y(51));
      context.lineTo(x(166), y(29));
      context.lineTo(x(171), y(56));
      context.closePath();
      context.fill();

      [
        { x: 66, y: 99, h: 21 },
        { x: 91, y: 100, h: 19 },
        { x: 119, y: 99, h: 20 },
        { x: 142, y: 97, h: 22 }
      ].forEach((leg) => {
        roundedRect(context, x(leg.x), y(leg.y), 13 * scale, leg.h * scale, 6 * scale);
        context.beginPath();
        context.ellipse(x(leg.x + 8), y(leg.y + leg.h), 10 * scale, 4.6 * scale, 0, 0, Math.PI * 2);
        context.fill();
      });

      context.beginPath();
      context.ellipse(x(158), y(63), 3.2 * scale, 3.2 * scale, 0, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.ellipse(x(169), y(70), 2.5 * scale, 1.8 * scale, 0.15, 0, Math.PI * 2);
      context.fill();

      context.lineWidth = 2.1 * scale;
      [[62, 60], [70, 70], [78, 80]].forEach(([endY, controlY]) => {
        context.beginPath();
        context.moveTo(x(166), y(70));
        context.quadraticCurveTo(x(181), y(controlY), x(193), y(endY));
        context.stroke();
      });
    };

    const makeTargets = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return [];

      drawCat(offCtx, width, height);
      const imageData = offCtx.getImageData(0, 0, width, height).data;
      const step = width < 190 ? 3 : 2;
      let targets = [];

      const scale = Math.min(width / 220, height / 158);
      const offsetX = (width - 220 * scale) / 2;
      const offsetY = (height - 158 * scale) / 2 + 5 * scale;
      const sx = (value) => offsetX + value * scale;
      const sy = (value) => offsetY + value * scale;
      const outlineColor = "rgba(68, 103, 116, 0.58)";
      const softOutlineColor = "rgba(128, 158, 160, 0.46)";
      const warmAccentColor = "rgba(204, 159, 155, 0.5)";
      const addPoint = (x, y, zone, color, size = rand(0.58, 1.08)) => {
        targets.push({
          x: x + rand(-0.72, 0.72),
          y: y + rand(-0.72, 0.72),
          zone,
          color,
          size,
          feature: true
        });
      };
      const addEllipse = (cx, cy, rx, ry, rotation, count, zone, color) => {
        for (let i = 0; i < count; i += 1) {
          const angle = (i / count) * Math.PI * 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const rotatedX = cos * rx * Math.cos(rotation) - sin * ry * Math.sin(rotation);
          const rotatedY = cos * rx * Math.sin(rotation) + sin * ry * Math.cos(rotation);
          addPoint(sx(cx) + rotatedX * scale, sy(cy) + rotatedY * scale, zone, color, rand(0.62, 1.16));
        }
      };
      const cubicPoint = (a, b, c, d, t) => {
        const mt = 1 - t;
        return mt ** 3 * a + 3 * mt ** 2 * t * b + 3 * mt * t ** 2 * c + t ** 3 * d;
      };
      const addCurve = (x1, y1, x2, y2, x3, y3, x4, y4, count, zone, color) => {
        for (let i = 0; i < count; i += 1) {
          const t = i / Math.max(count - 1, 1);
          addPoint(
            sx(cubicPoint(x1, x2, x3, x4, t)),
            sy(cubicPoint(y1, y2, y3, y4, t)),
            zone,
            color,
            rand(0.66, 1.2)
          );
        }
      };
      const addLine = (x1, y1, x2, y2, count, zone, color) => {
        for (let i = 0; i < count; i += 1) {
          const t = i / Math.max(count - 1, 1);
          addPoint(sx(x1 + (x2 - x1) * t), sy(y1 + (y2 - y1) * t), zone, color, rand(0.6, 1.1));
        }
      };
      const addTriangle = (points, count, zone, color) => {
        points.forEach((point, index) => {
          const next = points[(index + 1) % points.length];
          addLine(point[0], point[1], next[0], next[1], count, zone, color);
        });
      };

      for (let py = 0; py < height; py += step) {
        for (let px = 0; px < width; px += step) {
          const alpha = imageData[(py * width + px) * 4 + 3];
          if (alpha > 70) {
            const modelX = (px - offsetX) / scale;
            const modelY = (py - offsetY) / scale;
            const isEye = Math.hypot(modelX - 158, modelY - 63) < 5.2;
            const isNose = Math.hypot(modelX - 169, modelY - 70) < 5.6;
            const isEar = modelY < 57 && modelX > 126;
            const isPaw = modelY > 106;
            const zone =
              modelX < 57
                ? "tail"
                : isPaw && modelX > 112
                  ? "frontLeg"
                  : isPaw
                    ? "backLeg"
                    : modelX > 126
                      ? isEar
                        ? "ear"
                        : "head"
                      : "body";
            let color = "rgba(226, 238, 237, 0.74)";
            if (Math.random() > 0.66) color = "rgba(246, 250, 248, 0.84)";
            if (Math.random() > 0.87) color = "rgba(90, 121, 132, 0.44)";
            if (zone === "tail" && Math.random() > 0.72) color = "rgba(214, 230, 228, 0.72)";
            if (isEar && Math.random() > 0.78) color = warmAccentColor;
            if (isEye) color = "rgba(39, 72, 84, 0.78)";
            if (isNose) color = "rgba(188, 130, 128, 0.58)";
            targets.push({
              x: px + rand(-0.45, 0.45),
              y: py + rand(-0.45, 0.45),
              zone,
              color
            });
          }
        }
      }

      addCurve(56, 75, 22, 60, 29, 25, 64, 36, 82, "tail", outlineColor);
      addCurve(64, 36, 83, 43, 76, 59, 58, 59, 50, "tail", softOutlineColor);
      addEllipse(95, 82, 59, 26, -0.04, 190, "body", softOutlineColor);
      addEllipse(61, 87, 24, 20, -0.12, 76, "body", "rgba(154, 176, 170, 0.36)");
      addEllipse(150, 67, 28, 25, 0.08, 116, "head", outlineColor);
      addTriangle([[130, 51], [137, 26], [150, 52]], 24, "ear", softOutlineColor);
      addTriangle([[150, 51], [166, 29], [171, 56]], 24, "ear", softOutlineColor);
      addLine(139, 34, 146, 50, 20, "ear", warmAccentColor);
      addLine(160, 37, 166, 54, 20, "ear", warmAccentColor);
      [
        { x: 66, y: 99, h: 21, zone: "backLeg" },
        { x: 91, y: 100, h: 19, zone: "backLeg" },
        { x: 119, y: 99, h: 20, zone: "frontLeg" },
        { x: 142, y: 97, h: 22, zone: "frontLeg" }
      ].forEach((leg) => {
        addLine(leg.x, leg.y + 3, leg.x, leg.y + leg.h, 24, leg.zone, softOutlineColor);
        addLine(leg.x + 13, leg.y + 3, leg.x + 13, leg.y + leg.h, 24, leg.zone, softOutlineColor);
        addEllipse(leg.x + 8, leg.y + leg.h, 10, 4.6, 0, 32, leg.zone, softOutlineColor);
      });
      [[62, 60], [70, 70], [78, 80]].forEach(([endY, controlY]) => {
        addCurve(166, 70, 181, controlY, 186, endY, 193, endY, 24, "head", "rgba(70, 104, 116, 0.48)");
      });
      for (let i = 0; i < 30; i += 1) {
        addPoint(sx(158), sy(63), "head", "rgba(39, 72, 84, 0.8)", rand(0.72, 1.2));
      }
      for (let i = 0; i < 24; i += 1) {
        addPoint(sx(169), sy(70), "head", warmAccentColor, rand(0.58, 0.96));
      }

      const maxParticles = width < 190 ? 1380 : 2260;
      if (targets.length > maxParticles) {
        const stride = Math.ceil(targets.length / maxParticles);
        targets = targets.filter((target, index) => target.feature || index % stride === 0);
      }

      return targets;
    };

    const rebuild = () => {
      const rect = stage.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      if (width < 80 || height < 80) return;

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const previous = particles;
      const targets = makeTargets();
      particles = targets.map((target, index) => {
        const old = previous[index % Math.max(previous.length, 1)];
        return {
          x: old ? old.x : target.x + rand(-36, 36),
          y: old ? old.y : target.y + rand(-28, 28),
          tx: target.x,
          ty: target.y,
          vx: old ? old.vx * 0.35 : 0,
          vy: old ? old.vy * 0.35 : 0,
          r: target.size || rand(0.52, 1.08),
          phase: rand(0, Math.PI * 2),
          swing: rand(1.2, 3.4),
          zone: target.zone,
          color: target.color
        };
      });
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, width, height);
      const crawl = time * 0.003;
      const drift = Math.sin(time * 0.00042) * 4.6;
      const breath = Math.sin(time * 0.00145) * 1.45;

      particles.forEach((particle) => {
        let tx = particle.tx + drift * 0.42;
        let ty = particle.ty + breath;

        if (particle.zone === "frontLeg" || particle.zone === "backLeg") {
          const phaseOffset = particle.zone === "frontLeg" ? 0 : Math.PI;
          const step = Math.sin(crawl + phaseOffset + particle.phase * 0.12);
          const lift = Math.max(0, Math.cos(crawl + phaseOffset + particle.phase * 0.12));
          tx += step * particle.swing * 1.55 + drift * 0.16;
          ty += lift * 2.2 + Math.abs(step) * 0.52;
        } else if (particle.zone === "tail") {
          tx += Math.sin(time * 0.00175 + particle.phase * 0.38 + particle.ty * 0.025) * 3.4 + drift * 0.18;
          ty += Math.cos(time * 0.00155 + particle.phase * 0.34) * 2.15;
        } else if (particle.zone === "ear") {
          tx += Math.sin(time * 0.00115 + particle.phase * 0.25) * 1.2;
          ty += Math.sin(time * 0.0016 + particle.phase * 0.22) * 1.35;
        } else if (particle.zone === "head") {
          tx += Math.sin(time * 0.00105 + particle.phase * 0.18) * 1.05;
          ty += Math.sin(time * 0.00135 + particle.phase * 0.2) * 1.25;
        } else {
          tx += Math.sin(time * 0.00105 + particle.tx * 0.035 + particle.phase * 0.18) * 1.05;
          ty += Math.sin(time * 0.0013 + particle.tx * 0.025) * 0.72;
        }

        particle.vx += (tx - particle.x) * 0.021;
        particle.vy += (ty - particle.y) * 0.021;

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          const radius = width < 190 ? 66 : 78;

          if (distance > 0 && distance < radius) {
            const force = (1 - distance / radius) * 1.38;
            particle.vx += (dx / distance) * force + (-dy / distance) * force * 0.12;
            particle.vy += (dy / distance) * force + (dx / distance) * force * 0.12;
          }
        }

        particle.vx *= 0.895;
        particle.vy *= 0.895;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const shimmer = Math.sin(time * 0.001 + particle.phase) * 0.12;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r + shimmer * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
      });

      frameId = window.requestAnimationFrame(draw);
    };

    stage.addEventListener(
      "pointermove",
      (event) => {
        const rect = stage.getBoundingClientRect();
        pointer.active = true;
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
      },
      { passive: true }
    );

    stage.addEventListener(
      "pointerleave",
      () => {
        pointer.active = false;
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(rebuild, 160);
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      } else if (!document.hidden && !frameId) {
        frameId = window.requestAnimationFrame(draw);
      }
    });

    rebuild();
    frameId = window.requestAnimationFrame(draw);
  };

  const initHamsterPet = () => {
    const pet = document.querySelector("[data-hamster-pet]");
    if (!pet) return;

    const card = pet.closest("[data-identity-paper]");
    if (!card) return;

    const targetDot = card.querySelector("[data-pet-target]");
    const state = {
      pos: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      following: false,
      facing: 1,
      obstacles: [],
      bounds: null,
      lockedUntil: 0,
      arrivedCooldownUntil: 0,
      homeTimer: null,
      frameId: null,
      resizeTimer: null
    };

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const intersects = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

    const currentConfig = () => {
      const { width, height } = card.getBoundingClientRect();
      return {
        edgeMargin: width < 620 ? 10 : 14,
        avoidPaddingX: width < 620 ? 5 : 6,
        avoidPaddingY: width < 620 ? 7 : 9,
        petHitInsetX: width < 620 ? 12 : 18,
        petHitInsetY: width < 620 ? 7 : 10,
        senseRadius: Math.hypot(width, height) + 80,
        arriveRadius: width < 620 ? 15 : 18,
        followDistance: width < 620 ? 22 : 28,
        speed: width < 620 ? 0.085 : 0.075,
        homeSpeed: 0.045
      };
    };

    const refreshGeometry = () => {
      const config = currentConfig();
      const cardRect = card.getBoundingClientRect();
      const petWidth = pet.offsetWidth || 94;
      const petHeight = pet.offsetHeight || 88;

      state.bounds = {
        left: config.edgeMargin,
        top: config.edgeMargin,
        right: Math.max(config.edgeMargin, cardRect.width - petWidth - config.edgeMargin),
        bottom: Math.max(config.edgeMargin, cardRect.height - petHeight - config.edgeMargin)
      };

      const obstacleElements = Array.from(card.querySelectorAll("[data-pet-avoid]")).flatMap((element) => {
        if (element.classList.contains("identity-keywords")) {
          return Array.from(element.querySelectorAll("span"));
        }

        if (element.classList.contains("identity-head")) {
          return Array.from(element.children).filter((child) => child.getBoundingClientRect().width > 0);
        }

        if (element.classList.contains("particle-title")) {
          return [{ element, tightenParticleTitle: true }];
        }

        return [element];
      });

      state.obstacles = obstacleElements.map((item) => {
        const element = item.element || item;
        const rect = element.getBoundingClientRect();
        let right = rect.right - cardRect.left + config.avoidPaddingX;

        if (item.tightenParticleTitle) {
          const text = element.dataset.particleText || element.textContent || "";
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          const height = Math.max(72, Math.round(rect.height));
          const width = Math.max(260, Math.round(rect.width));
          let textWidth = Math.min(width, rect.width);

          if (context) {
            let fontSize = Math.min(height * 0.8, width * 0.18);
            context.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
            let metrics = context.measureText(text);
            const maxTextWidth = width - 8;

            if (metrics.width > maxTextWidth) {
              fontSize *= maxTextWidth / metrics.width;
              context.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
              metrics = context.measureText(text);
            }

            textWidth = metrics.width + 12;
          }

          right = Math.min(right, rect.left - cardRect.left + textWidth + config.avoidPaddingX);
        }

        return {
          left: rect.left - cardRect.left - config.avoidPaddingX,
          top: rect.top - cardRect.top - config.avoidPaddingY,
          right,
          bottom: rect.bottom - cardRect.top + config.avoidPaddingY
        };
      });
    };

    const petRectAt = (x, y) => {
      const config = currentConfig();
      return {
        left: x + config.petHitInsetX,
        top: y + config.petHitInsetY,
        right: x + (pet.offsetWidth || 94) - config.petHitInsetX,
        bottom: y + (pet.offsetHeight || 88) - config.petHitInsetY
      };
    };

    const isSafe = (x, y) => {
      const bounds = state.bounds;
      if (!bounds) return false;
      if (x < bounds.left || y < bounds.top || x > bounds.right || y > bounds.bottom) return false;
      const rect = petRectAt(x, y);
      return state.obstacles.every((obstacle) => !intersects(rect, obstacle));
    };

    const clampToBounds = (x, y) => {
      const bounds = state.bounds;
      return {
        x: clamp(x, bounds.left, bounds.right),
        y: clamp(y, bounds.top, bounds.bottom)
      };
    };

    const findNearestSafePosition = (x, y) => {
      const desired = clampToBounds(x, y);
      if (isSafe(desired.x, desired.y)) return desired;

      const maxRadius = Math.max(card.offsetWidth, card.offsetHeight);
      for (let radius = 8; radius <= maxRadius; radius += 8) {
        for (let angle = 0; angle < 360; angle += 10) {
          const radians = (angle * Math.PI) / 180;
          const candidate = clampToBounds(
            desired.x + Math.cos(radians) * radius,
            desired.y + Math.sin(radians) * radius
          );
          if (isSafe(candidate.x, candidate.y)) return candidate;
        }
      }

      return clampToBounds(card.offsetWidth - (pet.offsetWidth || 94) - 20, 18);
    };

    const getHomePosition = () => {
      refreshGeometry();
      const width = card.getBoundingClientRect().width;
      return findNearestSafePosition(
        card.offsetWidth - (pet.offsetWidth || 94) - (width < 620 ? 14 : 24),
        width < 620 ? 26 : 22
      );
    };

    const getPetCenter = () => ({
      x: state.pos.x + (pet.offsetWidth || 94) / 2,
      y: state.pos.y + (pet.offsetHeight || 88) / 2
    });

    const mouseToCardPoint = (event) => {
      const cardRect = card.getBoundingClientRect();
      return {
        x: event.clientX - cardRect.left,
        y: event.clientY - cardRect.top
      };
    };

    const setPetState = (nextState, duration = 0) => {
      pet.dataset.state = nextState;

      if (duration > 0) {
        state.lockedUntil = performance.now() + duration;
        window.setTimeout(() => {
          if (performance.now() >= state.lockedUntil) updatePassiveState();
        }, duration);
      }
    };

    const updatePassiveState = () => {
      if (performance.now() < state.lockedUntil) return;
      const distToTarget = distance(state.pos, state.target);
      pet.dataset.state = state.following && distToTarget > 4 ? "follow" : "idle";
    };

    const setTargetDot = (point, visible) => {
      if (!targetDot) return;
      targetDot.style.left = `${point.x}px`;
      targetDot.style.top = `${point.y}px`;
      targetDot.classList.toggle("is-visible", visible);
    };

    const setTargetFromMouse = (point) => {
      if (reduceMotion) return;

      refreshGeometry();
      const config = currentConfig();
      const center = getPetCenter();
      const distanceFromPet = Math.hypot(point.x - center.x, point.y - center.y);

      if (distanceFromPet > config.senseRadius) {
        state.following = false;
        setTargetDot(point, false);
        updatePassiveState();
        return;
      }

      state.following = true;
      setTargetDot(point, true);

      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      const wantedX = point.x - (pet.offsetWidth || 94) / 2 - Math.cos(angle) * config.followDistance;
      const wantedY = point.y - (pet.offsetHeight || 88) / 2 - Math.sin(angle) * config.followDistance;

      state.target = findNearestSafePosition(wantedX, wantedY);
      updatePassiveState();
    };

    const triggerInteract = () => {
      setPetState("interact", 700);
    };

    const isPointNearPet = (event, padding = 12) => {
      const rect = pet.getBoundingClientRect();
      return (
        event.clientX >= rect.left - padding &&
        event.clientX <= rect.right + padding &&
        event.clientY >= rect.top - padding &&
        event.clientY <= rect.bottom + padding
      );
    };

    const triggerArrive = () => {
      const now = performance.now();
      if (now < state.arrivedCooldownUntil || now < state.lockedUntil) return;
      state.arrivedCooldownUntil = now + 1500;
      setPetState("arrive", 840);
    };

    const safeNextStep = () => {
      const config = currentConfig();
      const dx = state.target.x - state.pos.x;
      const dy = state.target.y - state.pos.y;
      const dist = Math.hypot(dx, dy);
      const activeSpeed = state.following ? config.speed : config.homeSpeed;
      const nextX = state.pos.x + dx * activeSpeed;
      const nextY = state.pos.y + dy * activeSpeed;

      if (isSafe(nextX, nextY)) return { x: nextX, y: nextY, dist };

      const step = Math.min(12, Math.max(4, dist * 0.1));
      let best = null;
      let bestScore = Infinity;

      for (let angle = 0; angle < 360; angle += 12) {
        const radians = (angle * Math.PI) / 180;
        const candidate = clampToBounds(
          state.pos.x + Math.cos(radians) * step,
          state.pos.y + Math.sin(radians) * step
        );
        if (!isSafe(candidate.x, candidate.y)) continue;

        const score = Math.hypot(state.target.x - candidate.x, state.target.y - candidate.y);
        if (score < bestScore) {
          bestScore = score;
          best = candidate;
        }
      }

      return best ? { x: best.x, y: best.y, dist } : { x: state.pos.x, y: state.pos.y, dist: 0 };
    };

    const render = () => {
      const dx = state.target.x - state.pos.x;
      if (Math.abs(dx) > 0.25) state.facing = dx >= 0 ? 1 : -1;
      pet.style.transform = `translate3d(${state.pos.x.toFixed(2)}px, ${state.pos.y.toFixed(2)}px, 0) scaleX(${state.facing})`;
    };

    const loop = () => {
      const next = safeNextStep();
      state.pos.x = next.x;
      state.pos.y = next.y;

      if (state.following && next.dist < currentConfig().arriveRadius) {
        triggerArrive();
      }

      if (performance.now() >= state.lockedUntil) {
        pet.dataset.state = next.dist > 4 && state.following ? "follow" : "idle";
      }

      render();
      state.frameId = window.requestAnimationFrame(loop);
    };

    const returnHome = () => {
      state.following = false;
      if (targetDot) targetDot.classList.remove("is-visible");
      state.target = getHomePosition();
      updatePassiveState();
    };

    const init = () => {
      const home = getHomePosition();
      state.pos = { ...home };
      state.target = { ...home };
      render();
      pet.classList.add("is-ready");

      if (!reduceMotion) {
        state.frameId = window.requestAnimationFrame(loop);
      }
    };

    card.addEventListener(
      "pointermove",
      (event) => {
        setTargetFromMouse(mouseToCardPoint(event));
      },
      { passive: true }
    );

    card.addEventListener(
      "pointerenter",
      (event) => {
        window.clearTimeout(state.homeTimer);
        setTargetFromMouse(mouseToCardPoint(event));
      },
      { passive: true }
    );

    card.addEventListener(
      "pointerleave",
      () => {
        window.clearTimeout(state.homeTimer);
        state.homeTimer = window.setTimeout(returnHome, 260);
      },
      { passive: true }
    );

    card.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-hamster-pet]")) return;
      if (!isPointNearPet(event)) return;
      event.preventDefault();
      triggerInteract();
    });

    pet.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      triggerInteract();
    });

    pet.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      triggerInteract();
    });

    pet.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        triggerInteract();
      }
    });

    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(state.resizeTimer);
        state.resizeTimer = window.setTimeout(() => {
          const home = getHomePosition();
          state.pos = { ...home };
          state.target = { ...home };
          render();
        }, 160);
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (reduceMotion) return;
      if (document.hidden && state.frameId) {
        window.cancelAnimationFrame(state.frameId);
        state.frameId = null;
      } else if (!document.hidden && !state.frameId) {
        state.frameId = window.requestAnimationFrame(loop);
      }
    });

    init();
  };

  const initLiquidMicroInteractions = () => {
    if (reduceMotion) return;

    const items = document.querySelectorAll(".identity-keywords span, .metric-card");
    if (!items.length) return;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    items.forEach((element) => {
      const isMetric = element.classList.contains("metric-card");
      const state = {
        x: 50,
        y: 50,
        opacity: 0,
        shiftX: 0,
        shiftY: 0,
        scale: 1,
        numberScale: 1,
        border: 0
      };
      const target = { ...state };
      let frameId = null;

      const write = () => {
        element.style.setProperty("--fluid-x", `${state.x.toFixed(1)}%`);
        element.style.setProperty("--fluid-y", `${state.y.toFixed(1)}%`);
        element.style.setProperty("--fluid-opacity", state.opacity.toFixed(3));
        element.style.setProperty("--fluid-shift-x", `${state.shiftX.toFixed(2)}px`);
        element.style.setProperty("--fluid-shift-y", `${state.shiftY.toFixed(2)}px`);
        element.style.setProperty("--fluid-scale", state.scale.toFixed(4));
        element.style.setProperty("--number-scale", state.numberScale.toFixed(4));
        element.style.setProperty("--fluid-border", state.border.toFixed(3));
      };

      const animate = () => {
        let moving = false;
        Object.keys(state).forEach((key) => {
          state[key] += (target[key] - state[key]) * 0.18;
          moving = moving || Math.abs(target[key] - state[key]) > 0.002;
        });
        write();

        if (moving || element.classList.contains("is-fluid-active")) {
          frameId = window.requestAnimationFrame(animate);
        } else {
          frameId = null;
        }
      };

      const ensureAnimation = () => {
        if (!frameId) frameId = window.requestAnimationFrame(animate);
      };

      const update = (event) => {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const nx = clamp(x / Math.max(rect.width, 1), 0, 1);
        const ny = clamp(y / Math.max(rect.height, 1), 0, 1);
        const centerX = nx - 0.5;
        const centerY = ny - 0.5;
        const pull = isMetric ? 4.6 : 2.4;

        target.x = nx * 100;
        target.y = ny * 100;
        target.opacity = isMetric ? 0.44 : 0.36;
        target.shiftX = centerX * pull;
        target.shiftY = centerY * pull * 0.72;
        target.scale = isMetric ? 1.012 : 1.018;
        target.numberScale = isMetric ? 1.032 : 1;
        target.border = isMetric ? 1 : 0.8;
        element.classList.add("is-fluid-active");
        ensureAnimation();
      };

      const clear = () => {
        target.opacity = 0;
        target.shiftX = 0;
        target.shiftY = 0;
        target.scale = 1;
        target.numberScale = 1;
        target.border = 0;
        element.classList.remove("is-fluid-active");
        ensureAnimation();
      };

      element.addEventListener("pointermove", update, { passive: true });
      element.addEventListener("pointerleave", clear, { passive: true });
      element.addEventListener("blur", clear, { passive: true });
      write();
    });
  };

  const initResearchVisual = () => {
    const visual = document.querySelector("[data-research-visual]");
    if (!visual || reduceMotion) return;

    const layer = visual.querySelector("[data-research-layer]");
    const nodes = Array.from(visual.querySelectorAll(".research-node"));
    const state = {
      x: 50,
      y: 50,
      glow: 0,
      shiftX: 0,
      shiftY: 0,
      imgX: 0,
      imgY: 0,
      scale: 1
    };
    const target = { ...state };
    let frameId = null;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const write = () => {
      visual.style.setProperty("--visual-x", `${state.x.toFixed(1)}%`);
      visual.style.setProperty("--visual-y", `${state.y.toFixed(1)}%`);
      visual.style.setProperty("--visual-glow", state.glow.toFixed(3));
      visual.style.setProperty("--visual-shift-x", `${state.shiftX.toFixed(2)}px`);
      visual.style.setProperty("--visual-shift-y", `${state.shiftY.toFixed(2)}px`);
      visual.style.setProperty("--visual-img-x", `${state.imgX.toFixed(2)}px`);
      visual.style.setProperty("--visual-img-y", `${state.imgY.toFixed(2)}px`);
      visual.style.setProperty("--visual-scale", state.scale.toFixed(4));
    };

    const animate = () => {
      let moving = false;

      Object.keys(state).forEach((key) => {
        state[key] += (target[key] - state[key]) * 0.14;
        moving = moving || Math.abs(target[key] - state[key]) > 0.003;
      });

      write();

      if (moving || visual.classList.contains("is-visual-active")) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        frameId = null;
      }
    };

    const ensureAnimation = () => {
      if (!frameId) frameId = window.requestAnimationFrame(animate);
    };

    const activateNearestNode = (event) => {
      const activeRadius = 96;
      let nearest = null;
      let nearestDistance = Infinity;

      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(event.clientX - cx, event.clientY - cy);

        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearest = node;
        }
      });

      nodes.forEach((node) => {
        node.classList.toggle("is-node-active", node === nearest && nearestDistance < activeRadius);
      });
    };

    const update = (event) => {
      const rect = visual.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nx = clamp(x / Math.max(rect.width, 1), 0, 1);
      const ny = clamp(y / Math.max(rect.height, 1), 0, 1);
      const centerX = nx - 0.5;
      const centerY = ny - 0.5;

      target.x = nx * 100;
      target.y = ny * 100;
      target.glow = 1;
      target.shiftX = centerX * 3.4;
      target.shiftY = centerY * 2.2;
      target.imgX = centerX * -7.5;
      target.imgY = centerY * -4.8;
      target.scale = 1.006;

      visual.classList.add("is-visual-active");
      if (layer) layer.classList.add("is-visual-layer-active");
      activateNearestNode(event);
      ensureAnimation();
    };

    const clear = () => {
      target.glow = 0;
      target.shiftX = 0;
      target.shiftY = 0;
      target.imgX = 0;
      target.imgY = 0;
      target.scale = 1;
      visual.classList.remove("is-visual-active");
      if (layer) layer.classList.remove("is-visual-layer-active");
      nodes.forEach((node) => node.classList.remove("is-node-active"));
      ensureAnimation();
    };

    visual.addEventListener("pointermove", update, { passive: true });
    visual.addEventListener("pointerleave", clear, { passive: true });
    visual.addEventListener("focus", () => {
      target.x = 58;
      target.y = 48;
      target.glow = 0.74;
      target.scale = 1.004;
      visual.classList.add("is-visual-active");
      ensureAnimation();
    });
    visual.addEventListener("blur", clear);
    write();
  };


  initParticleTitle();
  initHamsterPet();
  initLiquidMicroInteractions();
  initResearchVisual();
})();
