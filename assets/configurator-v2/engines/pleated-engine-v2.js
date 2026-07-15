(function(global){
  "use strict";

  const MATERIALS = {
    ivory: {
      title: "Молочный",
      base: "#ddd5c6",
      dark: "#a59b8d",
      light: "#f4efe5",
      cord: "#c7c1b6",
      darkness: .12
    },
    beige: {
      title: "Бежевый Dimout",
      base: "#b49168",
      dark: "#765c42",
      light: "#dec5a5",
      cord: "#a9957c",
      darkness: .25
    },
    graphite: {
      title: "Графитовый Blackout",
      base: "#4c4d4b",
      dark: "#262725",
      light: "#7e817c",
      cord: "#666863",
      darkness: .43
    }
  };

  const DIRECTIONS = {
    "bottom-up": "Снизу вверх",
    "top-down": "Сверху вниз",
    center: "Двустороннее"
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
      initialDirection: "bottom-up",
      initialState: 75
    }, options || {});

    const stage = root.querySelector("[data-pleated-stage]");
    const room = root.querySelector("[data-pleated-room]");
    const svg = root.querySelector("[data-pleated-svg]");
    const darkness = root.querySelector("[data-pleated-darkness]");
    const range = root.querySelector("[data-pleated-range]");
    const value = root.querySelector("[data-pleated-value]");

    let geometry = null;
    let device = opts.initialDevice;
    let material = opts.initialMaterial;
    let direction = opts.initialDirection;
    let stateValue = opts.initialState;

    let pattern = null;
    let foldLight = null;
    let foldDark = null;
    let systems = [];

    function createDefs(canvas, scale) {
      const defs = svgEl("defs");

      const shadow = svgEl("filter", {
        id: "pleatedShadow",
        x: "-20%", y: "-20%", width: "140%", height: "160%"
      });
      shadow.appendChild(svgEl("feDropShadow", {
        dx: "0",
        dy: String(2.4 * scale),
        stdDeviation: String(2.5 * scale),
        "flood-color": "#211d17",
        "flood-opacity": ".26"
      }));
      defs.appendChild(shadow);

      const profileGradient = svgEl("linearGradient", {
        id: "pleatedProfileGradient", x1: "0", y1: "0", x2: "0", y2: "1"
      });
      profileGradient.appendChild(svgEl("stop", {
        offset: "0%", "stop-color": "#faf9f5"
      }));
      profileGradient.appendChild(svgEl("stop", {
        offset: "52%", "stop-color": "#deddd8"
      }));
      profileGradient.appendChild(svgEl("stop", {
        offset: "100%", "stop-color": "#bcbab5"
      }));
      defs.appendChild(profileGradient);

      const period = device === "desktop" ? 18 : 15;
      pattern = svgEl("pattern", {
        id: "pleatPattern",
        patternUnits: "userSpaceOnUse",
        x: "0", y: "0",
        width: String(canvas.width),
        height: String(period)
      });

      foldLight = svgEl("path", {
        d: `M 0 0 L ${canvas.width} 0 L ${canvas.width} ${period/2} L 0 ${period/2} Z`,
        fill: MATERIALS.ivory.light,
        "fill-opacity": ".80"
      });

      foldDark = svgEl("path", {
        d: `M 0 ${period/2} L ${canvas.width} ${period/2} L ${canvas.width} ${period} L 0 ${period} Z`,
        fill: MATERIALS.ivory.dark,
        "fill-opacity": ".72"
      });

      const crease = svgEl("line", {
        x1: "0", y1: String(period/2),
        x2: String(canvas.width), y2: String(period/2),
        stroke: MATERIALS.ivory.dark,
        "stroke-opacity": ".45",
        "stroke-width": String(Math.max(.55, scale * .65))
      });

      pattern.append(foldLight, foldDark, crease);
      pattern._period = period;
      pattern._crease = crease;
      defs.appendChild(pattern);

      svg.appendChild(defs);
    }

    function createSystem(key, glass, mount, scale) {
      const [gx1, gy1, gx2, gy2] = glass;
      const [mx1, my1, mx2] = mount;

      const glassW = gx2 - gx1;
      const glassH = gy2 - gy1;
      const inset = Math.max(4 * scale, glassW * .018);
      const profileH = Math.max(10 * scale, glassH * .022);

      const group = svgEl("g", { "data-sash": key });

      // Tension cords always follow the calibrated glass.
      const cordGroup = svgEl("g", { "data-role": "cords", opacity: ".72" });
      [0.27, 0.73].forEach(frac => {
        const x = gx1 + inset + (glassW - inset * 2) * frac;
        cordGroup.appendChild(svgEl("line", {
          x1: x, y1: gy1,
          x2: x, y2: gy2,
          stroke: MATERIALS.ivory.cord,
          "stroke-width": Math.max(.9, scale),
          "stroke-dasharray": `${Math.max(4*scale,4)} ${Math.max(3*scale,3)}`
        }));
      });
      group.appendChild(cordGroup);

      const fabric = svgEl("rect", {
        "data-role": "fabric",
        x: gx1 + inset,
        y: gy2,
        width: glassW - inset * 2,
        height: "0",
        fill: "url(#pleatPattern)",
        filter: "url(#pleatedShadow)"
      });
      group.appendChild(fabric);

      const topProfile = svgEl("rect", {
        "data-role": "top-profile",
        x: gx1 + inset,
        y: gy2 - profileH,
        width: glassW - inset * 2,
        height: profileH,
        rx: profileH * .30,
        fill: "url(#pleatedProfileGradient)",
        stroke: "#aaa9a4",
        "stroke-width": Math.max(.7, scale * .8),
        filter: "url(#pleatedShadow)"
      });
      group.appendChild(topProfile);

      const bottomProfile = svgEl("rect", {
        "data-role": "bottom-profile",
        x: gx1 + inset,
        y: gy2 - profileH,
        width: glassW - inset * 2,
        height: profileH,
        rx: profileH * .30,
        fill: "url(#pleatedProfileGradient)",
        stroke: "#aaa9a4",
        "stroke-width": Math.max(.7, scale * .8),
        filter: "url(#pleatedShadow)"
      });
      group.appendChild(bottomProfile);

      group._meta = {
        gy1, gy2, glassH, profileH
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
      const mat = MATERIALS[material];

      foldLight.setAttribute("fill", mat.light);
      foldDark.setAttribute("fill", mat.dark);
      pattern._crease.setAttribute("stroke", mat.dark);

      systems.forEach(group => {
        const meta = group._meta;
        const fabric = group.querySelector('[data-role="fabric"]');
        const top = group.querySelector('[data-role="top-profile"]');
        const bottom = group.querySelector('[data-role="bottom-profile"]');
        const cords = group.querySelector('[data-role="cords"]');

        const visibleH = meta.glassH * pct / 100;
        let bandTop;
        let bandBottom;

        if (direction === "bottom-up") {
          bandBottom = meta.gy2;
          bandTop = meta.gy2 - visibleH;
        } else if (direction === "top-down") {
          bandTop = meta.gy1;
          bandBottom = meta.gy1 + visibleH;
        } else {
          const centerY = (meta.gy1 + meta.gy2) / 2;
          bandTop = centerY - visibleH / 2;
          bandBottom = centerY + visibleH / 2;
        }

        fabric.setAttribute("y", bandTop);
        fabric.setAttribute("height", Math.max(0, bandBottom - bandTop));

        top.setAttribute("y", bandTop - meta.profileH * .10);
        bottom.setAttribute("y", bandBottom - meta.profileH * .90);

        cords.querySelectorAll("line").forEach(line => {
          line.setAttribute("stroke", mat.cord);
        });
      });

      darkness.style.opacity = String(mat.darkness * pct / 100);
      range.value = String(pct);
      value.textContent = `${pct}%`;

      root.querySelectorAll("[data-pleated-material]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.pleatedMaterial === material));
      });
      root.querySelectorAll("[data-pleated-direction]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.pleatedDirection === direction));
      });
      root.querySelectorAll("[data-pleated-device]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.pleatedDevice === device));
      });

      root.dispatchEvent(new CustomEvent("velora:pleated-change", {
        detail: {
          system: "pleated",
          material,
          materialTitle: mat.title,
          direction,
          directionTitle: DIRECTIONS[direction],
          state: pct,
          device
        }
      }));
    }

    range.addEventListener("input", () => {
      stateValue = range.value;
      render();
    });

    root.querySelectorAll("[data-pleated-material]").forEach(button => {
      button.addEventListener("click", () => {
        material = button.dataset.pleatedMaterial;
        render();
      });
    });

    root.querySelectorAll("[data-pleated-direction]").forEach(button => {
      button.addEventListener("click", () => {
        direction = button.dataset.pleatedDirection;
        render();
      });
    });

    root.querySelectorAll("[data-pleated-device]").forEach(button => {
      button.addEventListener("click", () => {
        device = button.dataset.pleatedDevice;
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
              system: "pleated",
              material,
              materialTitle: MATERIALS[material].title,
              direction,
              directionTitle: DIRECTIONS[direction],
              state: nearestState(Number(stateValue)),
              device
            };
          }
        };
      });
  }

  global.VeloraPleatedV2 = { init };
})(window);
