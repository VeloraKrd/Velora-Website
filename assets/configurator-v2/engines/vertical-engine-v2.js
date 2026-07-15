(function(global){
  "use strict";

  const MATERIALS = {
    ivory: {
      title: "Молочный текстиль",
      base: "#ded7ca",
      edge: "#aaa294",
      highlight: "#f4efe5",
      chain: "#d3cec4",
      darkness: { open: .07, half: .17, closed: .29 }
    },
    greige: {
      title: "Серо-бежевый",
      base: "#afa596",
      edge: "#756e64",
      highlight: "#d9d0c2",
      chain: "#bbb5ab",
      darkness: { open: .09, half: .22, closed: .35 }
    },
    graphite: {
      title: "Графитовый",
      base: "#4b4c4a",
      edge: "#272827",
      highlight: "#7f817d",
      chain: "#686965",
      darkness: { open: .13, half: .29, closed: .45 }
    }
  };

  const TILTS = {
    open: { title: "Ламели открыты", face: .27 },
    half: { title: "Полуоткрыты", face: .56 },
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
      initialMaterial: "ivory",
      initialTilt: "half",
      initialState: 100
    }, options || {});

    const stage = root.querySelector("[data-vertical-stage]");
    const room = root.querySelector("[data-vertical-room]");
    const svg = root.querySelector("[data-vertical-svg]");
    const darkness = root.querySelector("[data-vertical-darkness]");
    const range = root.querySelector("[data-vertical-range]");
    const value = root.querySelector("[data-vertical-value]");

    let geometry = null;
    let device = opts.initialDevice;
    let material = opts.initialMaterial;
    let tilt = opts.initialTilt;
    let stateValue = opts.initialState;

    let slatPattern = null;
    let slatFace = null;
    let slatHighlight = null;
    let slatEdge = null;
    let slatField = null;
    let carrierGroup = null;
    let bottomChain = null;
    let stackGroup = null;
    let meta = null;

    function createDefs(canvas, scale) {
      const defs = svgEl("defs");

      const shadow = svgEl("filter", {
        id: "verticalShadow",
        x: "-20%", y: "-20%", width: "140%", height: "160%"
      });
      shadow.appendChild(svgEl("feDropShadow", {
        dx: String(2 * scale),
        dy: String(3 * scale),
        stdDeviation: String(2.8 * scale),
        "flood-color": "#211d17",
        "flood-opacity": ".28"
      }));
      defs.appendChild(shadow);

      const trackGradient = svgEl("linearGradient", {
        id: "verticalTrackGradient", x1: "0", y1: "0", x2: "0", y2: "1"
      });
      trackGradient.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#fbfaf7" }));
      trackGradient.appendChild(svgEl("stop", { offset: "52%", "stop-color": "#deddd8" }));
      trackGradient.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#bbb9b4" }));
      defs.appendChild(trackGradient);

      // Global carrier pitch. The pattern never restarts.
      const pitch = device === "desktop" ? 53 : 43;
      slatPattern = svgEl("pattern", {
        id: "verticalSlatPattern",
        patternUnits: "userSpaceOnUse",
        x: "0", y: "0",
        width: String(pitch),
        height: String(canvas.height)
      });

      slatFace = svgEl("rect", {
        x: "0", y: "0",
        width: String(pitch * TILTS.half.face),
        height: String(canvas.height),
        rx: String(Math.max(2 * scale, 2)),
        fill: MATERIALS.ivory.base,
        filter: "url(#verticalShadow)"
      });

      slatHighlight = svgEl("line", {
        x1: String(pitch * .12),
        y1: "0",
        x2: String(pitch * .12),
        y2: String(canvas.height),
        stroke: MATERIALS.ivory.highlight,
        "stroke-opacity": ".58",
        "stroke-width": String(Math.max(.7, scale))
      });

      slatEdge = svgEl("line", {
        x1: String(pitch * TILTS.half.face),
        y1: "0",
        x2: String(pitch * TILTS.half.face),
        y2: String(canvas.height),
        stroke: MATERIALS.ivory.edge,
        "stroke-opacity": ".78",
        "stroke-width": String(Math.max(.7, scale))
      });

      slatPattern.append(slatFace, slatHighlight, slatEdge);
      slatPattern._pitch = pitch;
      defs.appendChild(slatPattern);

      svg.appendChild(defs);
    }

    function buildStructure(g, scale) {
      const [ox1, oy1, ox2, oy2] = g.fullOpening;
      const openingW = ox2 - ox1;
      const openingH = oy2 - oy1;

      const trackY = oy1 - Math.max(17 * scale, openingH * .035);
      const trackH = Math.max(20 * scale, openingH * .045);
      const fieldY1 = trackY + trackH - Math.max(2 * scale, 2);
      const fieldY2 = oy2;
      const fieldH = fieldY2 - fieldY1;

      meta = {
        ox1, ox2, trackY, trackH, fieldY1, fieldY2, fieldH,
        pitch: slatPattern._pitch,
        scale
      };

      const track = svgEl("rect", {
        x: ox1,
        y: trackY,
        width: openingW,
        height: trackH,
        rx: Math.max(6 * scale, trackH * .28),
        fill: "url(#verticalTrackGradient)",
        stroke: "#aaa9a5",
        "stroke-width": Math.max(.8, scale),
        filter: "url(#verticalShadow)"
      });
      svg.appendChild(track);

      slatField = svgEl("rect", {
        "data-role": "slats",
        x: ox1,
        y: fieldY1,
        width: "0",
        height: fieldH,
        fill: "url(#verticalSlatPattern)"
      });
      svg.appendChild(slatField);

      // Track carriers use the same pitch as the slats.
      carrierGroup = svgEl("g", { "data-role": "carriers" });
      for (let x = ox1; x <= ox2; x += meta.pitch) {
        carrierGroup.appendChild(svgEl("rect", {
          x: x + meta.pitch * .10,
          y: trackY + trackH - 2 * scale,
          width: Math.max(4 * scale, meta.pitch * .10),
          height: Math.max(7 * scale, trackH * .28),
          rx: Math.max(1.5 * scale, 1.5),
          fill: "#efeee9",
          stroke: "#aaa9a5",
          "stroke-width": Math.max(.5, scale * .5)
        }));
      }
      svg.appendChild(carrierGroup);

      // Bottom chain, clipped later by width.
      bottomChain = svgEl("g", { "data-role": "bottom-chain" });
      const chainY = fieldY2 - Math.max(9 * scale, 9);
      for (let x = ox1 + meta.pitch * .18; x <= ox2; x += meta.pitch) {
        bottomChain.appendChild(svgEl("circle", {
          cx: x,
          cy: chainY,
          r: Math.max(1.4 * scale, 1.4),
          fill: MATERIALS.ivory.chain,
          stroke: "#aaa69e",
          "stroke-width": Math.max(.35, scale * .35)
        }));
      }
      svg.appendChild(bottomChain);

      // Compact stack at the right when closed to the side.
      stackGroup = svgEl("g", { "data-role": "stack" });
      const stackCount = 10;
      for (let i = 0; i < stackCount; i++) {
        stackGroup.appendChild(svgEl("rect", {
          x: ox2 - (i + 1) * Math.max(4 * scale, 4),
          y: fieldY1,
          width: Math.max(5 * scale, 5),
          height: fieldH,
          rx: Math.max(1.5 * scale, 1.5),
          fill: MATERIALS.ivory.base,
          stroke: MATERIALS.ivory.edge,
          "stroke-width": Math.max(.35, scale * .35)
        }));
      }
      svg.appendChild(stackGroup);

      // Control chain and draw cord on the right.
      const control = svgEl("g", { opacity: ".90" });
      const cordX = ox2 - Math.max(15 * scale, openingW * .018);
      const cordY1 = trackY + trackH * .78;
      const cordY2 = Math.min(fieldY2 - 28 * scale, fieldY1 + fieldH * .68);

      control.appendChild(svgEl("line", {
        x1: cordX, y1: cordY1,
        x2: cordX, y2: cordY2,
        stroke: "#d8d3c9",
        "stroke-width": Math.max(1, scale)
      }));

      const beadStep = Math.max(5 * scale, 5);
      const beadRadius = Math.max(1.2 * scale, 1.2);
      for (let y = cordY1; y <= cordY2; y += beadStep) {
        control.appendChild(svgEl("circle", {
          cx: cordX, cy: y, r: beadRadius,
          fill: "#ece8df",
          stroke: "#aaa69e",
          "stroke-width": Math.max(.4, scale * .4)
        }));
      }
      svg.appendChild(control);
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
      buildStructure(g, scale);
      render();
    }

    function render() {
      const pct = nearestState(Number(stateValue));
      const mat = MATERIALS[material];
      const t = TILTS[tilt];
      const faceW = meta.pitch * t.face;
      const visibleW = (meta.ox2 - meta.ox1) * pct / 100;

      slatFace.setAttribute("width", faceW);
      slatFace.setAttribute("fill", mat.base);
      slatEdge.setAttribute("x1", faceW);
      slatEdge.setAttribute("x2", faceW);
      slatEdge.setAttribute("stroke", mat.edge);
      slatHighlight.setAttribute("stroke", mat.highlight);

      slatField.setAttribute("width", visibleW);

      const visibleEdge = meta.ox1 + visibleW;

      carrierGroup.querySelectorAll("rect").forEach(carrier => {
        const carrierX = Number(carrier.getAttribute("x"));
        carrier.style.display = carrierX <= visibleEdge ? "" : "none";
      });

      bottomChain.querySelectorAll("circle").forEach(bead => {
        const beadX = Number(bead.getAttribute("cx"));
        bead.style.display = beadX <= visibleEdge ? "" : "none";
      });

      stackGroup.setAttribute("opacity", String(1 - pct / 100));
      stackGroup.querySelectorAll("rect").forEach(rect => {
        rect.setAttribute("fill", mat.base);
        rect.setAttribute("stroke", mat.edge);
      });

      bottomChain.querySelectorAll("circle").forEach(circle => {
        circle.setAttribute("fill", mat.chain);
      });

      darkness.style.opacity = String(mat.darkness[tilt] * pct / 100);
      range.value = String(pct);
      value.textContent = `${pct}%`;

      root.querySelectorAll("[data-vertical-material]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.verticalMaterial === material));
      });
      root.querySelectorAll("[data-vertical-tilt]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.verticalTilt === tilt));
      });
      root.querySelectorAll("[data-vertical-device]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.verticalDevice === device));
      });

      root.dispatchEvent(new CustomEvent("velora:vertical-change", {
        detail: {
          system: "vertical",
          material,
          materialTitle: mat.title,
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

    root.querySelectorAll("[data-vertical-material]").forEach(button => {
      button.addEventListener("click", () => {
        material = button.dataset.verticalMaterial;
        render();
      });
    });

    root.querySelectorAll("[data-vertical-tilt]").forEach(button => {
      button.addEventListener("click", () => {
        tilt = button.dataset.verticalTilt;
        render();
      });
    });

    root.querySelectorAll("[data-vertical-device]").forEach(button => {
      button.addEventListener("click", () => {
        device = button.dataset.verticalDevice;
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
              system: "vertical",
              material,
              materialTitle: MATERIALS[material].title,
              tilt,
              tiltTitle: TILTS[tilt].title,
              state: nearestState(Number(stateValue)),
              device
            };
          }
        };
      });
  }

  global.VeloraVerticalV2 = { init };
})(window);
