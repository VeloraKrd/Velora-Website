(function(global){
  "use strict";

  const MATERIALS = {
    ivory: {
      title: "Молочный",
      opaque: "#ded4c2",
      sheer: "#f5f0e7",
      opaqueOpacity: .86,
      sheerOpacity: .20,
      darkness: { open: .06, half: .15, closed: .25 }
    },
    beige: {
      title: "Тёплый бежевый",
      opaque: "#b68d61",
      sheer: "#ead9c2",
      opaqueOpacity: .92,
      sheerOpacity: .22,
      darkness: { open: .08, half: .20, closed: .32 }
    },
    graphite: {
      title: "Графитовый",
      opaque: "#535250",
      sheer: "#aaa8a3",
      opaqueOpacity: .97,
      sheerOpacity: .25,
      darkness: { open: .12, half: .28, closed: .43 }
    }
  };

  const MODES = {
    open: { title: "Максимум света", shift: 0 },
    half: { title: "Рассеянный свет", shift: .25 },
    closed: { title: "Минимум света", shift: .5 }
  };

  const STATE_VALUES = [0, 25, 50, 75, 100];

  function svgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs || {}).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function nearestState(value) {
    return STATE_VALUES.reduce((best, item) =>
      Math.abs(item - value) < Math.abs(best - value) ? item : best
    );
  }

  function init(root, options) {
    const opts = Object.assign({
      geometryUrl: "geometry-v2.json",
      assetBase: "assets",
      initialDevice: "desktop",
      initialMaterial: "beige",
      initialMode: "half",
      initialState: 50
    }, options || {});

    const stage = root.querySelector("[data-daynight-stage]");
    const room = root.querySelector("[data-daynight-room]");
    const svg = root.querySelector("[data-daynight-svg]");
    const darkness = root.querySelector("[data-daynight-darkness]");
    const range = root.querySelector("[data-daynight-range]");
    const value = root.querySelector("[data-daynight-value]");

    let geometry = null;
    let device = opts.initialDevice;
    let material = opts.initialMaterial;
    let mode = opts.initialMode;
    let stateValue = opts.initialState;

    let patternFront = null;
    let patternBack = null;
    let frontOpaque = null;
    let frontSheer = null;
    let backOpaque = null;
    let backSheer = null;
    let productGroups = [];

    function createDefs(canvas, scale) {
      const defs = svgEl("defs");

      const shadow = svgEl("filter", {
        id: "dnShadow", x: "-20%", y: "-20%", width: "140%", height: "160%"
      });
      shadow.appendChild(svgEl("feDropShadow", {
        dx: "0", dy: "3", stdDeviation: String(3.2 * scale),
        "flood-color": "#211d17", "flood-opacity": ".30"
      }));
      defs.appendChild(shadow);

      const boxGradient = svgEl("linearGradient", {
        id: "dnBoxGradient", x1: "0", y1: "0", x2: "0", y2: "1"
      });
      boxGradient.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#fbfaf7" }));
      boxGradient.appendChild(svgEl("stop", { offset: "55%", "stop-color": "#e6e5e0" }));
      boxGradient.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#c8c7c2" }));
      defs.appendChild(boxGradient);

      const barGradient = svgEl("linearGradient", {
        id: "dnBarGradient", x1: "0", y1: "0", x2: "0", y2: "1"
      });
      barGradient.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#f6f5f1" }));
      barGradient.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#c5c4bf" }));
      defs.appendChild(barGradient);

      // The pattern is anchored to the global SVG coordinate system.
      // This is the key alignment fix.
      const period = device === "desktop" ? 48 : 40;
      const opaqueH = period * .54;
      const sheerH = period - opaqueH;

      patternFront = svgEl("pattern", {
        id: "dnPatternFront",
        patternUnits: "userSpaceOnUse",
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(period)
      });
      frontOpaque = svgEl("rect", {
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(opaqueH)
      });
      frontSheer = svgEl("rect", {
        x: "0", y: String(opaqueH),
        width: String(canvas.width),
        height: String(sheerH)
      });
      patternFront.append(frontOpaque, frontSheer);
      defs.appendChild(patternFront);

      patternBack = svgEl("pattern", {
        id: "dnPatternBack",
        patternUnits: "userSpaceOnUse",
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(period)
      });
      backOpaque = svgEl("rect", {
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(opaqueH)
      });
      backSheer = svgEl("rect", {
        x: "0", y: String(opaqueH),
        width: String(canvas.width),
        height: String(sheerH)
      });
      patternBack.append(backOpaque, backSheer);
      defs.appendChild(patternBack);

      svg.appendChild(defs);
      return { period };
    }

    function createProduct(key, glass, mount, scale) {
      const [gx1, gy1, gx2, gy2] = glass;
      const [mx1, my1, mx2] = mount;

      const glassW = gx2 - gx1;
      const glassH = gy2 - gy1;
      const mountW = mx2 - mx1;

      const boxH = Math.max(19 * scale, Math.min(29 * scale, glassH * .057));
      const barH = Math.max(8 * scale, glassH * .019);
      const inset = Math.max(3 * scale, glassW * .015);

      const group = svgEl("g", { "data-sash": key });

      group.appendChild(svgEl("rect", {
        x: mx1, y: my1,
        width: mountW, height: boxH,
        rx: Math.max(6 * scale, boxH * .32),
        fill: "url(#dnBoxGradient)",
        stroke: "#b2b1ad",
        "stroke-width": Math.max(1, scale),
        filter: "url(#dnShadow)"
      }));

      group.appendChild(svgEl("line", {
        x1: mx1 + boxH * .40,
        y1: my1 + boxH - 3 * scale,
        x2: mx2 - boxH * .40,
        y2: my1 + boxH - 3 * scale,
        stroke: "#aaa9a5",
        "stroke-width": Math.max(1, scale),
        opacity: ".72"
      }));

      // Rear and front fabric layers share global patterns.
      const rear = svgEl("rect", {
        "data-role": "rear",
        x: gx1 + inset, y: gy1,
        width: glassW - inset * 2,
        height: "0",
        fill: "url(#dnPatternBack)",
        opacity: ".72",
        filter: "url(#dnShadow)"
      });
      const front = svgEl("rect", {
        "data-role": "front",
        x: gx1 + inset, y: gy1,
        width: glassW - inset * 2,
        height: "0",
        fill: "url(#dnPatternFront)",
        opacity: ".92"
      });
      group.append(rear, front);

      const bottomBar = svgEl("rect", {
        "data-role": "bar",
        x: gx1 + inset, y: gy1,
        width: glassW - inset * 2,
        height: barH,
        rx: barH * .35,
        fill: "url(#dnBarGradient)",
        stroke: "#aaa9a4",
        "stroke-width": Math.max(.7, scale * .8)
      });
      group.appendChild(bottomBar);

      const chainX = mx2 - Math.max(5 * scale, mountW * .025);
      const chainY1 = my1 + boxH * .72;
      const chainY2 = Math.min(gy2 - 20 * scale, gy1 + glassH * .68);
      const chain = svgEl("g", { opacity: ".88" });

      chain.appendChild(svgEl("line", {
        x1: chainX, y1: chainY1,
        x2: chainX, y2: chainY2,
        stroke: "#ddd9d0",
        "stroke-width": Math.max(1, scale)
      }));

      const beadStep = Math.max(5 * scale, 5);
      const beadRadius = Math.max(1.2 * scale, 1.2);
      for (let y = chainY1; y <= chainY2; y += beadStep) {
        chain.appendChild(svgEl("circle", {
          cx: chainX, cy: y, r: beadRadius,
          fill: "#ece8df",
          stroke: "#aaa69e",
          "stroke-width": Math.max(.4, scale * .4)
        }));
      }
      group.appendChild(chain);

      group._meta = { gy1, glassH, barH };
      return group;
    }

    function applyMaterialAndMode(period) {
      const mat = MATERIALS[material];
      const shiftPx = period * MODES[mode].shift;

      [
        [frontOpaque, mat.opaque, mat.opaqueOpacity],
        [frontSheer, mat.sheer, mat.sheerOpacity],
        [backOpaque, mat.opaque, mat.opaqueOpacity],
        [backSheer, mat.sheer, mat.sheerOpacity]
      ].forEach(([element, fill, opacity]) => {
        element.setAttribute("fill", fill);
        element.setAttribute("fill-opacity", String(opacity));
      });

      // Both patterns stay globally anchored. Only the rear layer shifts.
      patternFront.setAttribute("patternTransform", "translate(0 0)");
      patternBack.setAttribute("patternTransform", `translate(0 ${shiftPx})`);
    }

    function renderStructure() {
      const g = geometry[device];
      const canvas = g.canvas;
      const scale = device === "desktop" ? 1 : .82;

      stage.dataset.device = device;
      room.src = `${opts.assetBase}/room-${device}.webp`;

      svg.innerHTML = "";
      svg.setAttribute("viewBox", `0 0 ${canvas.width} ${canvas.height}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

      const { period } = createDefs(canvas, scale);

      productGroups = ["left", "center", "right"].map(key => {
        const group = createProduct(key, g.glass[key], g.mount[key], scale);
        svg.appendChild(group);
        return group;
      });

      svg._period = period;
      render();
    }

    function render() {
      const pct = nearestState(Number(stateValue));
      const mat = MATERIALS[material];

      applyMaterialAndMode(svg._period);

      productGroups.forEach(group => {
        const meta = group._meta;
        const height = meta.glassH * pct / 100;

        group.querySelector('[data-role="rear"]').setAttribute("height", height);
        group.querySelector('[data-role="front"]').setAttribute("height", height);
        group.querySelector('[data-role="bar"]').setAttribute(
          "y",
          meta.gy1 + Math.max(0, height - meta.barH * .18)
        );
      });

      darkness.style.opacity = String(mat.darkness[mode] * pct / 100);
      range.value = String(pct);
      value.textContent = `${pct}%`;

      root.querySelectorAll("[data-daynight-material]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.daynightMaterial === material));
      });
      root.querySelectorAll("[data-daynight-mode]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.daynightMode === mode));
      });
      root.querySelectorAll("[data-daynight-device]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.daynightDevice === device));
      });

      root.dispatchEvent(new CustomEvent("velora:daynight-change", {
        detail: {
          system: "daynight",
          material,
          materialTitle: mat.title,
          lightMode: mode,
          lightModeTitle: MODES[mode].title,
          state: pct,
          device
        }
      }));
    }

    range.addEventListener("input", () => {
      stateValue = range.value;
      render();
    });

    root.querySelectorAll("[data-daynight-material]").forEach(button => {
      button.addEventListener("click", () => {
        material = button.dataset.daynightMaterial;
        render();
      });
    });

    root.querySelectorAll("[data-daynight-mode]").forEach(button => {
      button.addEventListener("click", () => {
        mode = button.dataset.daynightMode;
        render();
      });
    });

    root.querySelectorAll("[data-daynight-device]").forEach(button => {
      button.addEventListener("click", () => {
        device = button.dataset.daynightDevice;
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
            const pct = nearestState(Number(stateValue));
            return {
              system: "daynight",
              material,
              materialTitle: MATERIALS[material].title,
              lightMode: mode,
              lightModeTitle: MODES[mode].title,
              state: pct,
              device
            };
          }
        };
      });
  }

  global.VeloraDayNightV2 = { init };
})(window);
