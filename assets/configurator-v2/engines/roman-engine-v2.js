(function(global){
  "use strict";

  const MATERIALS = {
    ivory: {
      title: "Молочный лён",
      base: "#dcd3c2",
      shadow: "#998e7e",
      highlight: "#f3ede2",
      cord: "#c5beb2",
      darkness: .13
    },
    beige: {
      title: "Тёплый бежевый Dimout",
      base: "#b48f66",
      shadow: "#755a3f",
      highlight: "#dfc4a1",
      cord: "#a79178",
      darkness: .27
    },
    graphite: {
      title: "Графитовый Blackout",
      base: "#4c4d4b",
      shadow: "#262725",
      highlight: "#7f817d",
      cord: "#646661",
      darkness: .44
    }
  };

  const STATES = [0, 25, 50, 75, 100];

  function svgEl(name, attrs) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  }

  function nearestState(value) {
    return STATES.reduce((best, current) =>
      Math.abs(current - value) < Math.abs(best - value) ? current : best
    );
  }

  function init(root, options) {
    const opts = Object.assign({
      geometryUrl: "geometry-v2.json",
      assetBase: "assets",
      initialDevice: "desktop",
      initialMaterial: "ivory",
      initialState: 75
    }, options || {});

    const stage = root.querySelector("[data-roman-stage]");
    const room = root.querySelector("[data-roman-room]");
    const svg = root.querySelector("[data-roman-svg]");
    const darkness = root.querySelector("[data-roman-darkness]");
    const range = root.querySelector("[data-roman-range]");
    const value = root.querySelector("[data-roman-value]");

    let geometry = null;
    let device = opts.initialDevice;
    let material = opts.initialMaterial;
    let stateValue = opts.initialState;

    let foldPattern = null;
    let foldBase = null;
    let foldHighlight = null;
    let foldShadow = null;
    let foldSeam = null;
    let systems = [];

    function createDefs(canvas, scale) {
      const defs = svgEl("defs");

      const shadow = svgEl("filter", {
        id: "romanShadow",
        x: "-20%",
        y: "-20%",
        width: "140%",
        height: "160%"
      });
      shadow.appendChild(svgEl("feDropShadow", {
        dx: "0",
        dy: String(2.8 * scale),
        stdDeviation: String(3 * scale),
        "flood-color": "#211d17",
        "flood-opacity": ".29"
      }));
      defs.appendChild(shadow);

      const headGradient = svgEl("linearGradient", {
        id: "romanHeadGradient",
        x1: "0", y1: "0", x2: "0", y2: "1"
      });
      headGradient.appendChild(svgEl("stop", {
        offset: "0%",
        "stop-color": "#fbfaf7"
      }));
      headGradient.appendChild(svgEl("stop", {
        offset: "52%",
        "stop-color": "#deddd8"
      }));
      headGradient.appendChild(svgEl("stop", {
        offset: "100%",
        "stop-color": "#bbb9b4"
      }));
      defs.appendChild(headGradient);

      const railGradient = svgEl("linearGradient", {
        id: "romanRailGradient",
        x1: "0", y1: "0", x2: "0", y2: "1"
      });
      railGradient.appendChild(svgEl("stop", {
        offset: "0%",
        "stop-color": "#f5f4ef"
      }));
      railGradient.appendChild(svgEl("stop", {
        offset: "100%",
        "stop-color": "#c2c0bb"
      }));
      defs.appendChild(railGradient);

      // One user-space pattern for all sashes. This keeps fold seams aligned.
      const period = device === "desktop" ? 64 : 52;
      foldPattern = svgEl("pattern", {
        id: "romanFoldPattern",
        patternUnits: "userSpaceOnUse",
        x: "0",
        y: "0",
        width: String(canvas.width),
        height: String(period)
      });

      foldBase = svgEl("rect", {
        x: "0",
        y: "0",
        width: String(canvas.width),
        height: String(period),
        fill: MATERIALS.ivory.base
      });

      foldHighlight = svgEl("path", {
        d: `M 0 0 L ${canvas.width} 0 L ${canvas.width} ${period * .46} L 0 ${period * .46} Z`,
        fill: MATERIALS.ivory.highlight,
        "fill-opacity": ".46"
      });

      foldShadow = svgEl("path", {
        d: `M 0 ${period * .46} L ${canvas.width} ${period * .46} L ${canvas.width} ${period} L 0 ${period} Z`,
        fill: MATERIALS.ivory.shadow,
        "fill-opacity": ".34"
      });

      foldSeam = svgEl("line", {
        x1: "0",
        y1: String(period - 1),
        x2: String(canvas.width),
        y2: String(period - 1),
        stroke: MATERIALS.ivory.shadow,
        "stroke-opacity": ".60",
        "stroke-width": String(Math.max(.7, scale))
      });

      foldPattern.append(foldBase, foldHighlight, foldShadow, foldSeam);
      foldPattern._period = period;
      defs.appendChild(foldPattern);

      svg.appendChild(defs);
    }

    function createSystem(key, glass, mount, scale) {
      const [gx1, gy1, gx2, gy2] = glass;
      const [mx1, my1, mx2] = mount;

      const glassW = gx2 - gx1;
      const glassH = gy2 - gy1;
      const mountW = mx2 - mx1;

      const headH = Math.max(18 * scale, Math.min(26 * scale, glassH * .050));
      const inset = Math.max(5 * scale, glassW * .020);
      const railH = Math.max(9 * scale, glassH * .020);
      const stackMax = Math.max(48 * scale, glassH * .12);

      const group = svgEl("g", { "data-sash": key });

      group.appendChild(svgEl("rect", {
        x: mx1,
        y: my1,
        width: mountW,
        height: headH,
        rx: Math.max(6 * scale, headH * .30),
        fill: "url(#romanHeadGradient)",
        stroke: "#aaa9a5",
        "stroke-width": Math.max(.8, scale),
        filter: "url(#romanShadow)"
      }));

      const fabric = svgEl("rect", {
        "data-role": "fabric",
        x: gx1 + inset,
        y: gy1,
        width: glassW - inset * 2,
        height: "0",
        rx: Math.max(2 * scale, 2),
        fill: "url(#romanFoldPattern)",
        filter: "url(#romanShadow)"
      });
      group.appendChild(fabric);

      // Subtle vertical support lines.
      const cords = svgEl("g", {
        "data-role": "cords",
        opacity: ".30"
      });
      [0.33, 0.67].forEach(frac => {
        const x = gx1 + inset + (glassW - inset * 2) * frac;
        cords.appendChild(svgEl("line", {
          x1: x,
          y1: gy1,
          x2: x,
          y2: gy1,
          stroke: MATERIALS.ivory.cord,
          "stroke-width": Math.max(.8, scale)
        }));
      });
      group.appendChild(cords);

      const stack = svgEl("g", {
        "data-role": "stack",
        opacity: "1"
      });
      const stackCount = 6;
      for (let i = 0; i < stackCount; i++) {
        const strip = svgEl("rect", {
          "data-stack-index": String(i),
          x: gx1 + inset,
          y: gy1,
          width: glassW - inset * 2,
          height: Math.max(7 * scale, 7),
          rx: Math.max(3 * scale, 3),
          fill: MATERIALS.ivory.base,
          stroke: MATERIALS.ivory.shadow,
          "stroke-width": Math.max(.45, scale * .45),
          filter: "url(#romanShadow)"
        });
        stack.appendChild(strip);
      }
      group.appendChild(stack);

      const bottomRail = svgEl("rect", {
        "data-role": "bottom-rail",
        x: gx1 + inset,
        y: gy1,
        width: glassW - inset * 2,
        height: railH,
        rx: railH * .34,
        fill: "url(#romanRailGradient)",
        stroke: "#aaa9a4",
        "stroke-width": Math.max(.7, scale * .8),
        filter: "url(#romanShadow)"
      });
      group.appendChild(bottomRail);

      const chainX = mx2 - Math.max(6 * scale, mountW * .028);
      const chainY1 = my1 + headH * .74;
      const chainY2 = Math.min(gy2 - 22 * scale, gy1 + glassH * .68);
      const chain = svgEl("g", { opacity: ".90" });

      chain.appendChild(svgEl("line", {
        x1: chainX,
        y1: chainY1,
        x2: chainX,
        y2: chainY2,
        stroke: "#ddd8cf",
        "stroke-width": Math.max(1, scale)
      }));

      const beadStep = Math.max(5 * scale, 5);
      const beadRadius = Math.max(1.2 * scale, 1.2);
      for (let y = chainY1; y <= chainY2; y += beadStep) {
        chain.appendChild(svgEl("circle", {
          cx: chainX,
          cy: y,
          r: beadRadius,
          fill: "#ece8df",
          stroke: "#aaa69e",
          "stroke-width": Math.max(.4, scale * .4)
        }));
      }
      group.appendChild(chain);

      group._meta = {
        gy1,
        gy2,
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
        const system = createSystem(key, g.glass[key], g.mount[key], scale);
        svg.appendChild(system);
        return system;
      });

      render();
    }

    function render() {
      const pct = nearestState(Number(stateValue));
      const mat = MATERIALS[material];

      foldBase.setAttribute("fill", mat.base);
      foldHighlight.setAttribute("fill", mat.highlight);
      foldShadow.setAttribute("fill", mat.shadow);
      foldSeam.setAttribute("stroke", mat.shadow);

      systems.forEach(group => {
        const meta = group._meta;
        const fabric = group.querySelector('[data-role="fabric"]');
        const cords = group.querySelector('[data-role="cords"]');
        const stack = group.querySelector('[data-role="stack"]');
        const rail = group.querySelector('[data-role="bottom-rail"]');

        const visibleH = meta.glassH * pct / 100;
        const fabricEdge = meta.gy1 + visibleH;
        const stackH = meta.stackMax * (1 - pct / 100);
        const stackCount = stack.querySelectorAll("rect").length;
        const stackStripH = Math.max(7 * meta.scale, stackH / Math.max(1, stackCount - 1) + 3 * meta.scale);

        fabric.setAttribute("height", Math.max(0, visibleH));

        cords.querySelectorAll("line").forEach(line => {
          line.setAttribute("y2", fabricEdge);
          line.setAttribute("stroke", mat.cord);
        });

        stack.setAttribute("opacity", String(Math.max(.12, 1 - pct / 100)));
        stack.querySelectorAll("rect").forEach((rect, index) => {
          const y = pct === 0
            ? meta.gy1 + index * stackStripH * .72
            : Math.max(meta.gy1, fabricEdge - stackH) + index * stackStripH * .72;

          rect.setAttribute("y", y);
          rect.setAttribute("height", stackStripH);
          rect.setAttribute("fill", mat.base);
          rect.setAttribute("stroke", mat.shadow);
        });

        const railY = pct === 0
          ? meta.gy1 + Math.max(meta.railH, stackH * .74)
          : fabricEdge - meta.railH * .16;

        rail.setAttribute("y", railY);
      });

      darkness.style.opacity = String(mat.darkness * pct / 100);
      range.value = String(pct);
      value.textContent = `${pct}%`;

      root.querySelectorAll("[data-roman-material]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.romanMaterial === material));
      });

      root.querySelectorAll("[data-roman-device]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.romanDevice === device));
      });

      root.dispatchEvent(new CustomEvent("velora:roman-change", {
        detail: {
          system: "roman",
          material,
          materialTitle: mat.title,
          state: pct,
          device
        }
      }));
    }

    range.addEventListener("input", () => {
      stateValue = range.value;
      render();
    });

    root.querySelectorAll("[data-roman-material]").forEach(button => {
      button.addEventListener("click", () => {
        material = button.dataset.romanMaterial;
        render();
      });
    });

    root.querySelectorAll("[data-roman-device]").forEach(button => {
      button.addEventListener("click", () => {
        device = button.dataset.romanDevice;
        renderStructure();
      });
    });

    return fetch(opts.geometryUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Geometry load failed: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        geometry = data;
        renderStructure();

        return {
          getValue() {
            return {
              system: "roman",
              material,
              materialTitle: MATERIALS[material].title,
              state: nearestState(Number(stateValue)),
              device
            };
          }
        };
      });
  }

  global.VeloraRomanV2 = { init };
})(window);
