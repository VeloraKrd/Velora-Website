(function(global){
  "use strict";

  const MATERIALS = {
    milk: {
      title: "Молочный светопроницаемый",
      fill: "#e7ddcc",
      opacity: .72,
      darkness: .06
    },
    dimout: {
      title: "Тёплый бежевый Dimout",
      fill: "#b99367",
      opacity: .88,
      darkness: .17
    },
    blackout: {
      title: "Графитовый Blackout",
      fill: "#4c4b49",
      opacity: .98,
      darkness: .35
    }
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

  function createDefs(svg, scale) {
    const defs = svgEl("defs");

    const shadow = svgEl("filter", {
      id: "rollerShadow",
      x: "-20%", y: "-20%", width: "140%", height: "160%"
    });
    shadow.appendChild(svgEl("feDropShadow", {
      dx: "0",
      dy: String(3 * scale),
      stdDeviation: String(3.2 * scale),
      "flood-color": "#211d17",
      "flood-opacity": ".30"
    }));
    defs.appendChild(shadow);

    const tubeGradient = svgEl("linearGradient", {
      id: "tubeGradient", x1: "0", y1: "0", x2: "0", y2: "1"
    });
    tubeGradient.appendChild(svgEl("stop", {
      offset: "0%", "stop-color": "#fcfbf8"
    }));
    tubeGradient.appendChild(svgEl("stop", {
      offset: "52%", "stop-color": "#deddd8"
    }));
    tubeGradient.appendChild(svgEl("stop", {
      offset: "100%", "stop-color": "#bdbcb7"
    }));
    defs.appendChild(tubeGradient);

    const barGradient = svgEl("linearGradient", {
      id: "rollerBarGradient", x1: "0", y1: "0", x2: "0", y2: "1"
    });
    barGradient.appendChild(svgEl("stop", {
      offset: "0%", "stop-color": "#f4f3ef"
    }));
    barGradient.appendChild(svgEl("stop", {
      offset: "100%", "stop-color": "#c5c4bf"
    }));
    defs.appendChild(barGradient);

    svg.appendChild(defs);
  }

  function createRoller(svg, key, glass, mount, scale) {
    const [gx1, gy1, gx2, gy2] = glass;
    const [mx1, my1, mx2] = mount;

    const glassW = gx2 - gx1;
    const glassH = gy2 - gy1;
    const mountW = mx2 - mx1;

    const tubeH = Math.max(17 * scale, Math.min(24 * scale, glassH * .045));
    const tubeInset = Math.max(5 * scale, mountW * .025);
    const fabricInset = Math.max(4 * scale, glassW * .018);
    const barH = Math.max(7 * scale, glassH * .018);
    const bracketW = Math.max(8 * scale, tubeH * .46);

    const group = svgEl("g", { "data-sash": key });

    // Shadow behind the open roller tube.
    group.appendChild(svgEl("rect", {
      x: mx1 + tubeInset,
      y: my1,
      width: mountW - tubeInset * 2,
      height: tubeH,
      rx: tubeH * .48,
      fill: "url(#tubeGradient)",
      stroke: "#aaa9a5",
      "stroke-width": Math.max(.8, scale),
      filter: "url(#rollerShadow)"
    }));

    // Brackets.
    group.appendChild(svgEl("rect", {
      x: mx1,
      y: my1 + tubeH * .12,
      width: bracketW,
      height: tubeH * .76,
      rx: Math.max(2 * scale, bracketW * .28),
      fill: "#efeee9",
      stroke: "#b5b4af",
      "stroke-width": Math.max(.7, scale * .8)
    }));
    group.appendChild(svgEl("rect", {
      x: mx2 - bracketW,
      y: my1 + tubeH * .12,
      width: bracketW,
      height: tubeH * .76,
      rx: Math.max(2 * scale, bracketW * .28),
      fill: "#efeee9",
      stroke: "#b5b4af",
      "stroke-width": Math.max(.7, scale * .8)
    }));

    // Visible fabric roll wrapped around the tube.
    const roll = svgEl("rect", {
      "data-role": "roll",
      x: mx1 + tubeInset + bracketW * .30,
      y: my1 + tubeH * .18,
      width: mountW - tubeInset * 2 - bracketW * .60,
      height: tubeH * .64,
      rx: tubeH * .32,
      fill: MATERIALS.dimout.fill,
      opacity: MATERIALS.dimout.opacity
    });
    group.appendChild(roll);

    // Fabric is aligned to the calibrated glass.
    const fabric = svgEl("rect", {
      "data-role": "fabric",
      x: gx1 + fabricInset,
      y: gy1,
      width: glassW - fabricInset * 2,
      height: "0",
      rx: Math.max(1.5 * scale, 2),
      fill: MATERIALS.dimout.fill,
      opacity: MATERIALS.dimout.opacity,
      filter: "url(#rollerShadow)"
    });
    group.appendChild(fabric);

    const bottomBar = svgEl("rect", {
      "data-role": "bottom-bar",
      x: gx1 + fabricInset,
      y: gy1,
      width: glassW - fabricInset * 2,
      height: barH,
      rx: barH * .35,
      fill: "url(#rollerBarGradient)",
      stroke: "#aaa9a4",
      "stroke-width": Math.max(.7, scale * .8)
    });
    group.appendChild(bottomBar);

    // Chain is attached to the right bracket.
    const chainX = mx2 - bracketW * .58;
    const chainY1 = my1 + tubeH * .72;
    const chainY2 = Math.min(gy2 - 20 * scale, gy1 + glassH * .68);
    const chain = svgEl("g", { opacity: ".90" });

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

    group._meta = {
      gy1,
      glassH,
      barH
    };

    return group;
  }

  function init(root, options) {
    const opts = Object.assign({
      geometryUrl: "geometry-v2.json",
      assetBase: "assets",
      initialDevice: "desktop",
      initialMaterial: "dimout",
      initialState: 50
    }, options || {});

    const stage = root.querySelector("[data-roller-stage]");
    const room = root.querySelector("[data-roller-room]");
    const svg = root.querySelector("[data-roller-svg]");
    const darkness = root.querySelector("[data-roller-darkness]");
    const range = root.querySelector("[data-roller-range]");
    const value = root.querySelector("[data-roller-value]");

    let geometry = null;
    let device = opts.initialDevice;
    let material = opts.initialMaterial;
    let stateValue = opts.initialState;
    let groups = [];

    function renderStructure() {
      const g = geometry[device];
      const scale = device === "desktop" ? 1 : .82;

      stage.dataset.device = device;
      room.src = `${opts.assetBase}/room-${device}.webp`;

      svg.innerHTML = "";
      svg.setAttribute("viewBox", `0 0 ${g.canvas.width} ${g.canvas.height}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      createDefs(svg, scale);

      groups = ["left", "center", "right"].map(key => {
        const group = createRoller(svg, key, g.glass[key], g.mount[key], scale);
        svg.appendChild(group);
        return group;
      });

      render();
    }

    function render() {
      const pct = nearestState(Number(stateValue));
      const mat = MATERIALS[material];

      groups.forEach(group => {
        const meta = group._meta;
        const height = meta.glassH * pct / 100;

        const fabric = group.querySelector('[data-role="fabric"]');
        const roll = group.querySelector('[data-role="roll"]');
        const bar = group.querySelector('[data-role="bottom-bar"]');

        fabric.setAttribute("height", height);
        fabric.setAttribute("fill", mat.fill);
        fabric.setAttribute("opacity", mat.opacity);

        roll.setAttribute("fill", mat.fill);
        roll.setAttribute("opacity", Math.min(1, mat.opacity + .08));

        bar.setAttribute(
          "y",
          meta.gy1 + Math.max(0, height - meta.barH * .18)
        );
      });

      darkness.style.opacity = String(mat.darkness * pct / 100);
      range.value = String(pct);
      value.textContent = `${pct}%`;

      root.querySelectorAll("[data-roller-material]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.rollerMaterial === material));
      });
      root.querySelectorAll("[data-roller-device]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.rollerDevice === device));
      });

      root.dispatchEvent(new CustomEvent("velora:roller-change", {
        detail: {
          system: "roller",
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

    root.querySelectorAll("[data-roller-material]").forEach(button => {
      button.addEventListener("click", () => {
        material = button.dataset.rollerMaterial;
        render();
      });
    });

    root.querySelectorAll("[data-roller-device]").forEach(button => {
      button.addEventListener("click", () => {
        device = button.dataset.rollerDevice;
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
              system: "roller",
              material,
              materialTitle: MATERIALS[material].title,
              state: pct,
              device
            };
          }
        };
      });
  }

  global.VeloraRollerV2 = { init };
})(window);
