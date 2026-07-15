(function(global){
  "use strict";

  const COLORS = {
    white: {
      title: "Белый",
      base: "#e9e9e5",
      edge: "#aaa9a5",
      highlight: "#fdfdf9",
      cord: "#cbc9c3",
      darkness: { open: .05, half: .15, closed: .27 }
    },
    silver: {
      title: "Светлое серебро",
      base: "#bfc2c2",
      edge: "#7e8283",
      highlight: "#ecefef",
      cord: "#b9bab8",
      darkness: { open: .07, half: .18, closed: .31 }
    },
    anthracite: {
      title: "Антрацит",
      base: "#484a4a",
      edge: "#272828",
      highlight: "#7b7e7e",
      cord: "#60615f",
      darkness: { open: .11, half: .26, closed: .43 }
    }
  };

  const TILTS = {
    open: { title: "Ламели открыты", face: .34 },
    half: { title: "Полуоткрыты", face: .60 },
    closed: { title: "Ламели закрыты", face: .92 }
  };

  const STATES = [0, 25, 50, 75, 100];

  function svgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs || {}).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function nearestState(value) {
    return STATES.reduce((best, item) =>
      Math.abs(item - value) < Math.abs(best - value) ? item : best
    );
  }

  function init(root, options) {
    const opts = Object.assign({
      geometryUrl: "geometry-v2.json",
      assetBase: "assets",
      initialDevice: "desktop",
      initialColor: "white",
      initialTilt: "half",
      initialState: 75
    }, options || {});

    const stage = root.querySelector("[data-horizontal-stage]");
    const room = root.querySelector("[data-horizontal-room]");
    const svg = root.querySelector("[data-horizontal-svg]");
    const darkness = root.querySelector("[data-horizontal-darkness]");
    const range = root.querySelector("[data-horizontal-range]");
    const value = root.querySelector("[data-horizontal-value]");

    let geometry = null;
    let device = opts.initialDevice;
    let color = opts.initialColor;
    let tilt = opts.initialTilt;
    let stateValue = opts.initialState;

    let pattern = null;
    let patternBand = null;
    let patternShadow = null;
    let headrails = [];
    let slatRects = [];
    let bottomRails = [];
    let stacks = [];

    function createDefs(canvas, scale) {
      const defs = svgEl("defs");

      const shadow = svgEl("filter", {
        id: "horizontalShadow",
        x: "-20%", y: "-20%", width: "140%", height: "160%"
      });
      shadow.appendChild(svgEl("feDropShadow", {
        dx: "0",
        dy: String(2.5 * scale),
        stdDeviation: String(2.6 * scale),
        "flood-color": "#201d19",
        "flood-opacity": ".28"
      }));
      defs.appendChild(shadow);

      const headGradient = svgEl("linearGradient", {
        id: "headGradient", x1: "0", y1: "0", x2: "0", y2: "1"
      });
      headGradient.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#fafaf7" }));
      headGradient.appendChild(svgEl("stop", { offset: "52%", "stop-color": "#d9d9d5" }));
      headGradient.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#b8b8b4" }));
      defs.appendChild(headGradient);

      const railGradient = svgEl("linearGradient", {
        id: "railGradient", x1: "0", y1: "0", x2: "0", y2: "1"
      });
      railGradient.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#f5f5f1" }));
      railGradient.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#bdbdb8" }));
      defs.appendChild(railGradient);

      // One pattern for the entire SVG canvas: all sashes share the same phase.
      const period = device === "desktop" ? 24 : 20;
      pattern = svgEl("pattern", {
        id: "slatPattern",
        patternUnits: "userSpaceOnUse",
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(period)
      });

      patternShadow = svgEl("rect", {
        x: "0",
        y: String(period * .18),
        width: String(canvas.width),
        height: String(period * .46),
        fill: "#1f1d1a",
        "fill-opacity": ".16"
      });

      patternBand = svgEl("rect", {
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(period * TILTS.half.face),
        fill: COLORS.white.base
      });

      const highlight = svgEl("line", {
        x1: "0",
        y1: String(period * .10),
        x2: String(canvas.width),
        y2: String(period * .10),
        stroke: COLORS.white.highlight,
        "stroke-opacity": ".70",
        "stroke-width": String(Math.max(.7, scale))
      });

      const edge = svgEl("line", {
        x1: "0",
        y1: String(period * TILTS.half.face),
        x2: String(canvas.width),
        y2: String(period * TILTS.half.face),
        stroke: COLORS.white.edge,
        "stroke-opacity": ".82",
        "stroke-width": String(Math.max(.7, scale))
      });

      pattern.append(patternShadow, patternBand, highlight, edge);
      pattern._highlight = highlight;
      pattern._edge = edge;
      pattern._period = period;
      defs.appendChild(pattern);

      svg.appendChild(defs);
    }

    function createSystem(key, glass, mount, scale) {
      const [gx1, gy1, gx2, gy2] = glass;
      const [mx1, my1, mx2] = mount;

      const glassW = gx2 - gx1;
      const glassH = gy2 - gy1;
      const mountW = mx2 - mx1;

      const headH = Math.max(17 * scale, Math.min(24 * scale, glassH * .045));
      const inset = Math.max(4 * scale, glassW * .018);
      const railH = Math.max(9 * scale, glassH * .021);
      const ladderW = Math.max(1.1 * scale, 1);

      const group = svgEl("g", { "data-sash": key });

      const head = svgEl("rect", {
        x: mx1,
        y: my1,
        width: mountW,
        height: headH,
        rx: Math.max(5 * scale, headH * .28),
        fill: "url(#headGradient)",
        stroke: "#aaa9a5",
        "stroke-width": Math.max(.8, scale),
        filter: "url(#horizontalShadow)"
      });
      group.appendChild(head);

      const slats = svgEl("rect", {
        "data-role": "slats",
        x: gx1 + inset,
        y: gy1,
        width: glassW - inset * 2,
        height: "0",
        fill: "url(#slatPattern)"
      });
      group.appendChild(slats);

      const ladderPositions = [
        gx1 + inset + (glassW - inset * 2) * .30,
        gx1 + inset + (glassW - inset * 2) * .70
      ];

      const ladders = svgEl("g", { "data-role": "ladders" });
      ladderPositions.forEach(x => {
        ladders.appendChild(svgEl("line", {
          x1: x, y1: gy1,
          x2: x, y2: gy1,
          stroke: COLORS.white.cord,
          "stroke-width": ladderW,
          opacity: ".72"
        }));
      });
      group.appendChild(ladders);

      const bottomRail = svgEl("rect", {
        "data-role": "bottom-rail",
        x: gx1 + inset,
        y: gy1,
        width: glassW - inset * 2,
        height: railH,
        rx: railH * .34,
        fill: "url(#railGradient)",
        stroke: "#aaa9a4",
        "stroke-width": Math.max(.7, scale * .8),
        filter: "url(#horizontalShadow)"
      });
      group.appendChild(bottomRail);

      // Compact stack when raised.
      const stack = svgEl("g", {
        "data-role": "stack",
        opacity: "0"
      });
      const stackCount = 7;
      for (let i = 0; i < stackCount; i++) {
        stack.appendChild(svgEl("rect", {
          x: gx1 + inset,
          y: gy1 + i * 3.2 * scale,
          width: glassW - inset * 2,
          height: Math.max(3 * scale, 3),
          rx: Math.max(1.2 * scale, 1),
          fill: COLORS.white.base,
          stroke: COLORS.white.edge,
          "stroke-width": Math.max(.35, scale * .35)
        }));
      }
      group.appendChild(stack);

      // Pull cord and tilt wand.
      const control = svgEl("g", { opacity: ".88" });
      const cordX = mx2 - Math.max(12 * scale, mountW * .05);
      const cordY2 = Math.min(gy2 - 22 * scale, gy1 + glassH * .68);
      control.appendChild(svgEl("line", {
        x1: cordX, y1: my1 + headH * .72,
        x2: cordX, y2: cordY2,
        stroke: COLORS.white.cord,
        "stroke-width": Math.max(1, scale)
      }));

      const wandX = mx2 - Math.max(30 * scale, mountW * .12);
      const wandY2 = Math.min(gy2 - 55 * scale, gy1 + glassH * .54);
      control.appendChild(svgEl("line", {
        x1: wandX, y1: my1 + headH * .72,
        x2: wandX - 2 * scale, y2: wandY2,
        stroke: COLORS.white.cord,
        "stroke-width": Math.max(1.1, scale)
      }));
      control.appendChild(svgEl("rect", {
        x: wandX - 4 * scale,
        y: wandY2,
        width: 5 * scale,
        height: 22 * scale,
        rx: 2 * scale,
        fill: "#dddcd6",
        stroke: "#aaa9a4",
        "stroke-width": Math.max(.6, scale * .6)
      }));
      group.appendChild(control);

      group._meta = {
        gy1,
        glassH,
        railH,
        ladderPositions
      };

      return group;
    }

    function renderStructure() {
      const g = geometry[device];
      const scale = device === "desktop" ? 1 : .82;

      stage.dataset.device = device;
      room.src = `${opts.assetBase}/room-${device}.webp`;

      svg.innerHTML = "";
      svg.setAttribute("viewBox", `0 0 ${g.canvas.width} ${g.canvas.height}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

      createDefs(g.canvas, scale);

      headrails = ["left", "center", "right"].map(key => {
        const group = createSystem(key, g.glass[key], g.mount[key], scale);
        svg.appendChild(group);
        return group;
      });

      slatRects = headrails.map(group => group.querySelector('[data-role="slats"]'));
      bottomRails = headrails.map(group => group.querySelector('[data-role="bottom-rail"]'));
      stacks = headrails.map(group => group.querySelector('[data-role="stack"]'));

      render();
    }

    function render() {
      const pct = nearestState(Number(stateValue));
      const c = COLORS[color];
      const t = TILTS[tilt];
      const period = pattern._period;
      const faceH = period * t.face;

      patternBand.setAttribute("height", faceH);
      patternBand.setAttribute("fill", c.base);
      pattern._highlight.setAttribute("y1", period * .10);
      pattern._highlight.setAttribute("y2", period * .10);
      pattern._highlight.setAttribute("stroke", c.highlight);
      pattern._edge.setAttribute("y1", faceH);
      pattern._edge.setAttribute("y2", faceH);
      pattern._edge.setAttribute("stroke", c.edge);

      headrails.forEach((group, index) => {
        const meta = group._meta;
        const height = meta.glassH * pct / 100;
        const slats = slatRects[index];
        const rail = bottomRails[index];
        const stack = stacks[index];
        const ladders = group.querySelector('[data-role="ladders"]');

        slats.setAttribute("height", height);
        rail.setAttribute("y", meta.gy1 + Math.max(0, height - meta.railH * .14));

        ladders.querySelectorAll("line").forEach(line => {
          line.setAttribute("y2", meta.gy1 + height);
          line.setAttribute("stroke", c.cord);
        });

        stack.setAttribute("opacity", String(1 - pct / 100));
        stack.querySelectorAll("rect").forEach(rect => {
          rect.setAttribute("fill", c.base);
          rect.setAttribute("stroke", c.edge);
        });

        group.querySelectorAll('[stroke="#cbc9c3"], [stroke="#b9bab8"], [stroke="#60615f"]').forEach(el => {
          el.setAttribute("stroke", c.cord);
        });
      });

      darkness.style.opacity = String(c.darkness[tilt] * pct / 100);
      range.value = String(pct);
      value.textContent = `${pct}%`;

      root.querySelectorAll("[data-horizontal-color]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.horizontalColor === color));
      });
      root.querySelectorAll("[data-horizontal-tilt]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.horizontalTilt === tilt));
      });
      root.querySelectorAll("[data-horizontal-device]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.horizontalDevice === device));
      });

      root.dispatchEvent(new CustomEvent("velora:horizontal-change", {
        detail: {
          system: "horizontal",
          color,
          colorTitle: c.title,
          tilt,
          tiltTitle: t.title,
          state: pct,
          device
        }
      }));
    }

    range.addEventListener("input", () => {
      stateValue = range.value;
      render();
    });

    root.querySelectorAll("[data-horizontal-color]").forEach(button => {
      button.addEventListener("click", () => {
        color = button.dataset.horizontalColor;
        render();
      });
    });

    root.querySelectorAll("[data-horizontal-tilt]").forEach(button => {
      button.addEventListener("click", () => {
        tilt = button.dataset.horizontalTilt;
        render();
      });
    });

    root.querySelectorAll("[data-horizontal-device]").forEach(button => {
      button.addEventListener("click", () => {
        device = button.dataset.horizontalDevice;
        renderStructure();
      });
    });

    return fetch(opts.geometryUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Geometry load failed: ${response.status}`);
        return response.json();
      })
      .then(data => {
        geometry = data;
        renderStructure();

        return {
          getValue() {
            return {
              system: "horizontal",
              color,
              colorTitle: COLORS[color].title,
              tilt,
              tiltTitle: TILTS[tilt].title,
              state: nearestState(Number(stateValue)),
              device
            };
          }
        };
      });
  }

  global.VeloraHorizontalV2 = { init };
})(window);
