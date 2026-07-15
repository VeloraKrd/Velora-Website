(function(global){
  "use strict";

  const WOODS = {
    oak: {
      title: "Светлый дуб",
      base: "#b58250",
      dark: "#68462c",
      light: "#dfb67d",
      grain: "#5d3923",
      tape: "#7a5a40",
      cord: "#8b6e50",
      darkness: { open: .08, half: .20, closed: .34 }
    },
    walnut: {
      title: "Орех",
      base: "#754c31",
      dark: "#3e271b",
      light: "#ad7a50",
      grain: "#2f1c14",
      tape: "#4d3829",
      cord: "#5e4431",
      darkness: { open: .10, half: .25, closed: .40 }
    },
    wenge: {
      title: "Тёмный венге",
      base: "#3c2f28",
      dark: "#1c1714",
      light: "#6a5548",
      grain: "#16110f",
      tape: "#2c2521",
      cord: "#3d332d",
      darkness: { open: .13, half: .30, closed: .47 }
    }
  };

  const TILTS = {
    open: { title: "Ламели открыты", face: .32 },
    half: { title: "Полуоткрыты", face: .60 },
    closed: { title: "Ламели закрыты", face: .93 }
  };

  const STATES = [0, 25, 50, 75, 100];

  function svgEl(name, attrs) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs || {}).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
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
      initialWood: "oak",
      initialTilt: "half",
      initialState: 75
    }, options || {});

    const stage = root.querySelector("[data-wood-stage]");
    const room = root.querySelector("[data-wood-room]");
    const svg = root.querySelector("[data-wood-svg]");
    const darkness = root.querySelector("[data-wood-darkness]");
    const range = root.querySelector("[data-wood-range]");
    const value = root.querySelector("[data-wood-value]");

    let geometry = null;
    let device = opts.initialDevice;
    let wood = opts.initialWood;
    let tilt = opts.initialTilt;
    let stateValue = opts.initialState;

    let slatPattern = null;
    let slatBase = null;
    let slatLight = null;
    let slatDark = null;
    let slatEdge = null;
    let grainPaths = [];
    let systems = [];

    function createDefs(canvas, scale) {
      const defs = svgEl("defs");

      const shadow = svgEl("filter", {
        id: "woodShadow",
        x: "-20%", y: "-20%", width: "140%", height: "160%"
      });
      shadow.appendChild(svgEl("feDropShadow", {
        dx: "0",
        dy: String(2.8 * scale),
        stdDeviation: String(2.8 * scale),
        "flood-color": "#201b17",
        "flood-opacity": ".31"
      }));
      defs.appendChild(shadow);

      const headGradient = svgEl("linearGradient", {
        id: "woodHeadGradient",
        x1: "0", y1: "0", x2: "0", y2: "1"
      });
      headGradient.appendChild(svgEl("stop", {
        offset: "0%", "stop-color": WOODS.oak.light
      }));
      headGradient.appendChild(svgEl("stop", {
        offset: "54%", "stop-color": WOODS.oak.base
      }));
      headGradient.appendChild(svgEl("stop", {
        offset: "100%", "stop-color": WOODS.oak.dark
      }));
      defs.appendChild(headGradient);

      const railGradient = svgEl("linearGradient", {
        id: "woodRailGradient",
        x1: "0", y1: "0", x2: "0", y2: "1"
      });
      railGradient.appendChild(svgEl("stop", {
        offset: "0%", "stop-color": WOODS.oak.light
      }));
      railGradient.appendChild(svgEl("stop", {
        offset: "100%", "stop-color": WOODS.oak.dark
      }));
      defs.appendChild(railGradient);

      const period = device === "desktop" ? 34 : 28;
      slatPattern = svgEl("pattern", {
        id: "woodSlatPattern",
        patternUnits: "userSpaceOnUse",
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(period)
      });

      slatBase = svgEl("rect", {
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(period * TILTS.half.face),
        fill: WOODS.oak.base
      });

      slatLight = svgEl("rect", {
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(period * .20),
        fill: WOODS.oak.light,
        "fill-opacity": ".42"
      });

      slatDark = svgEl("rect", {
        x: "0",
        y: String(period * .34),
        width: String(canvas.width),
        height: String(period * .28),
        fill: WOODS.oak.dark,
        "fill-opacity": ".25"
      });

      slatEdge = svgEl("line", {
        x1: "0",
        y1: String(period * TILTS.half.face),
        x2: String(canvas.width),
        y2: String(period * TILTS.half.face),
        stroke: WOODS.oak.dark,
        "stroke-opacity": ".82",
        "stroke-width": String(Math.max(.8, scale))
      });

      slatPattern.append(slatBase, slatLight, slatDark);

      grainPaths = [];
      const grainYs = [4, 9, 15, 21, 26];
      grainYs.forEach((y, index) => {
        const amplitude = 1.2 + index * .22;
        const d = [
          `M 0 ${y}`,
          `C ${canvas.width * .18} ${y - amplitude}`,
          `${canvas.width * .31} ${y + amplitude}`,
          `${canvas.width * .48} ${y}`,
          `S ${canvas.width * .79} ${y - amplitude}`,
          `${canvas.width} ${y}`
        ].join(" ");
        const path = svgEl("path", {
          d,
          fill: "none",
          stroke: WOODS.oak.grain,
          "stroke-opacity": String(.16 + index * .025),
          "stroke-width": String(Math.max(.45, scale * .48))
        });
        slatPattern.appendChild(path);
        grainPaths.push(path);
      });

      slatPattern.appendChild(slatEdge);
      slatPattern._period = period;
      slatPattern._headGradient = headGradient;
      slatPattern._railGradient = railGradient;
      defs.appendChild(slatPattern);

      svg.appendChild(defs);
    }

    function createSystem(key, glass, mount, scale) {
      const [gx1, gy1, gx2, gy2] = glass;
      const [mx1, my1, mx2] = mount;

      const glassW = gx2 - gx1;
      const glassH = gy2 - gy1;
      const mountW = mx2 - mx1;

      const headH = Math.max(19 * scale, Math.min(27 * scale, glassH * .052));
      const inset = Math.max(5 * scale, glassW * .020);
      const railH = Math.max(12 * scale, glassH * .025);
      const stackMax = Math.max(50 * scale, glassH * .12);
      const tapeW = Math.max(10 * scale, glassW * .055);

      const group = svgEl("g", { "data-sash": key });

      const head = svgEl("rect", {
        x: mx1,
        y: my1,
        width: mountW,
        height: headH,
        rx: Math.max(6 * scale, headH * .28),
        fill: "url(#woodHeadGradient)",
        stroke: WOODS.oak.dark,
        "stroke-width": Math.max(.8, scale),
        filter: "url(#woodShadow)"
      });
      group.appendChild(head);

      const slats = svgEl("rect", {
        "data-role": "slats",
        x: gx1 + inset,
        y: gy1,
        width: glassW - inset * 2,
        height: "0",
        fill: "url(#woodSlatPattern)",
        filter: "url(#woodShadow)"
      });
      group.appendChild(slats);

      const tapes = svgEl("g", { "data-role": "tapes" });
      [0.30, 0.70].forEach(frac => {
        const x = gx1 + inset + (glassW - inset * 2) * frac - tapeW / 2;
        tapes.appendChild(svgEl("rect", {
          x,
          y: gy1,
          width: tapeW,
          height: "0",
          rx: Math.max(2 * scale, 2),
          fill: WOODS.oak.tape,
          "fill-opacity": ".88"
        }));
      });
      group.appendChild(tapes);

      const stack = svgEl("g", {
        "data-role": "stack",
        opacity: "1"
      });
      const stackCount = 8;
      for (let i = 0; i < stackCount; i++) {
        stack.appendChild(svgEl("rect", {
          x: gx1 + inset,
          y: gy1,
          width: glassW - inset * 2,
          height: Math.max(5 * scale, 5),
          rx: Math.max(2 * scale, 2),
          fill: WOODS.oak.base,
          stroke: WOODS.oak.dark,
          "stroke-width": Math.max(.45, scale * .45),
          filter: "url(#woodShadow)"
        }));
      }
      group.appendChild(stack);

      const bottomRail = svgEl("rect", {
        "data-role": "bottom-rail",
        x: gx1 + inset,
        y: gy1,
        width: glassW - inset * 2,
        height: railH,
        rx: railH * .34,
        fill: "url(#woodRailGradient)",
        stroke: WOODS.oak.dark,
        "stroke-width": Math.max(.7, scale * .8),
        filter: "url(#woodShadow)"
      });
      group.appendChild(bottomRail);

      const control = svgEl("g", { opacity: ".90" });
      const cordX = mx2 - Math.max(13 * scale, mountW * .052);
      const cordY2 = Math.min(gy2 - 22 * scale, gy1 + glassH * .68);
      control.appendChild(svgEl("line", {
        x1: cordX,
        y1: my1 + headH * .74,
        x2: cordX,
        y2: cordY2,
        stroke: WOODS.oak.cord,
        "stroke-width": Math.max(1, scale)
      }));

      const wandX = mx2 - Math.max(32 * scale, mountW * .13);
      const wandY2 = Math.min(gy2 - 58 * scale, gy1 + glassH * .54);
      control.appendChild(svgEl("line", {
        x1: wandX,
        y1: my1 + headH * .74,
        x2: wandX - 2 * scale,
        y2: wandY2,
        stroke: WOODS.oak.cord,
        "stroke-width": Math.max(1.1, scale)
      }));
      control.appendChild(svgEl("rect", {
        x: wandX - 4 * scale,
        y: wandY2,
        width: 5 * scale,
        height: 24 * scale,
        rx: 2 * scale,
        fill: WOODS.oak.base,
        stroke: WOODS.oak.dark,
        "stroke-width": Math.max(.6, scale * .6)
      }));
      group.appendChild(control);

      group._meta = {
        gy1,
        glassH,
        railH,
        stackMax,
        scale
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

      systems = ["left", "center", "right"].map(key => {
        const group = createSystem(key, g.glass[key], g.mount[key], scale);
        svg.appendChild(group);
        return group;
      });

      render();
    }

    function render() {
      const pct = nearestState(Number(stateValue));
      const current = WOODS[wood];
      const currentTilt = TILTS[tilt];
      const period = slatPattern._period;
      const faceH = period * currentTilt.face;

      slatBase.setAttribute("height", faceH);
      slatBase.setAttribute("fill", current.base);
      slatLight.setAttribute("fill", current.light);
      slatDark.setAttribute("fill", current.dark);
      slatEdge.setAttribute("y1", faceH);
      slatEdge.setAttribute("y2", faceH);
      slatEdge.setAttribute("stroke", current.dark);
      grainPaths.forEach(path => path.setAttribute("stroke", current.grain));

      const headStops = slatPattern._headGradient.querySelectorAll("stop");
      headStops[0].setAttribute("stop-color", current.light);
      headStops[1].setAttribute("stop-color", current.base);
      headStops[2].setAttribute("stop-color", current.dark);

      const railStops = slatPattern._railGradient.querySelectorAll("stop");
      railStops[0].setAttribute("stop-color", current.light);
      railStops[1].setAttribute("stop-color", current.dark);

      systems.forEach(group => {
        const meta = group._meta;
        const visibleH = meta.glassH * pct / 100;
        const slats = group.querySelector('[data-role="slats"]');
        const tapes = group.querySelector('[data-role="tapes"]');
        const stack = group.querySelector('[data-role="stack"]');
        const rail = group.querySelector('[data-role="bottom-rail"]');

        slats.setAttribute("height", visibleH);

        tapes.querySelectorAll("rect").forEach(tape => {
          tape.setAttribute("height", visibleH);
          tape.setAttribute("fill", current.tape);
        });

        const stackH = meta.stackMax * (1 - pct / 100);
        const strips = stack.querySelectorAll("rect");
        const stripH = Math.max(5 * meta.scale, stackH / Math.max(1, strips.length - 1) + 2.5 * meta.scale);

        stack.setAttribute("opacity", String(Math.max(.10, 1 - pct / 100)));
        strips.forEach((rect, index) => {
          rect.setAttribute("y", meta.gy1 + index * stripH * .68);
          rect.setAttribute("height", stripH);
          rect.setAttribute("fill", current.base);
          rect.setAttribute("stroke", current.dark);
        });

        rail.setAttribute(
          "y",
          meta.gy1 + Math.max(0, visibleH - meta.railH * .14)
        );
        rail.setAttribute("stroke", current.dark);

        group.querySelectorAll("line").forEach(line => {
          const stroke = line.getAttribute("stroke");
          if (stroke && stroke !== "url(#woodSlatPattern)") {
            line.setAttribute("stroke", current.cord);
          }
        });
        group.querySelectorAll('rect[height]').forEach(rect => {
          if (rect.getAttribute("width") && Number(rect.getAttribute("width")) < 10 * meta.scale) {
            rect.setAttribute("fill", current.base);
            rect.setAttribute("stroke", current.dark);
          }
        });
      });

      darkness.style.opacity = String(current.darkness[tilt] * pct / 100);
      range.value = String(pct);
      value.textContent = `${pct}%`;

      root.querySelectorAll("[data-wood-tone]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.woodTone === wood));
      });
      root.querySelectorAll("[data-wood-tilt]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.woodTilt === tilt));
      });
      root.querySelectorAll("[data-wood-device]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.woodDevice === device));
      });

      root.dispatchEvent(new CustomEvent("velora:wood-change", {
        detail: {
          system: "wood",
          wood,
          woodTitle: current.title,
          tilt,
          tiltTitle: currentTilt.title,
          state: pct,
          device
        }
      }));
    }

    range.addEventListener("input", () => {
      stateValue = range.value;
      render();
    });

    root.querySelectorAll("[data-wood-tone]").forEach(button => {
      button.addEventListener("click", () => {
        wood = button.dataset.woodTone;
        render();
      });
    });

    root.querySelectorAll("[data-wood-tilt]").forEach(button => {
      button.addEventListener("click", () => {
        tilt = button.dataset.woodTilt;
        render();
      });
    });

    root.querySelectorAll("[data-wood-device]").forEach(button => {
      button.addEventListener("click", () => {
        device = button.dataset.woodDevice;
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
              system: "wood",
              wood,
              woodTitle: WOODS[wood].title,
              tilt,
              tiltTitle: TILTS[tilt].title,
              state: nearestState(Number(stateValue)),
              device
            };
          }
        };
      });
  }

  global.VeloraWoodV2 = { init };
})(window);
