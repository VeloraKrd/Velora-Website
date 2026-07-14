(function (global) {
  "use strict";

  const STATES = [0, 25, 50, 75, 100];
  const CODES = ["000", "025", "050", "075", "100"];

  const SYSTEMS = {
    roller: {
      title: "Рулонные",
      thumb: "roller.webp",
      materialLabel: "Материал ткани",
      materials: {
        milk: "Светопроницаемый молочный",
        dimout: "Бежевый Dimout",
        blackout: "Графитовый Blackout"
      },
      defaultMaterial: "dimout",
      stateLabel: "Степень закрытия",
      defaultState: 2,
      render(ctx) {
        const b = ctx.systemBase;
        const code = ctx.code;
        ctx.set("lighting", `${b}/${ctx.device}/${ctx.material}/lighting-${code}.webp`);
        ctx.set("primary", `${b}/${ctx.device}/${ctx.material}/roller-layer-${code}.webp`);
      }
    },

    cassette: {
      title: "Кассетные",
      thumb: "cassette.webp",
      materialLabel: "Материал ткани",
      materials: {
        milk: "Светопроницаемый молочный",
        dimout: "Бежевый Dimout",
        blackout: "Графитовый Blackout"
      },
      defaultMaterial: "dimout",
      stateLabel: "Степень закрытия",
      defaultState: 2,
      render(ctx) {
        const b = ctx.systemBase;
        const code = ctx.code;
        ctx.set("lighting", `${b}/${ctx.device}/${ctx.material}/lighting-${code}.webp`);
        ctx.set("primary", `${b}/${ctx.device}/${ctx.material}/cassette-layer-${code}.webp`);
      }
    },

    daynight: {
      title: "День-Ночь",
      thumb: "daynight.webp",
      materialLabel: "Цвет ткани",
      materials: {
        ivory: "Молочный",
        beige: "Тёплый бежевый",
        graphite: "Графитовый"
      },
      defaultMaterial: "beige",
      secondaryLabel: "Совпадение полос",
      secondary: {
        open: "Максимум света",
        half: "Рассеянный свет",
        closed: "Минимум света"
      },
      defaultSecondary: "half",
      stateLabel: "Степень закрытия",
      defaultState: 2,
      geometry: {
        desktop: { height: 992, start: 153, end: 635 },
        mobile: { height: 1402, start: 315, end: 785 }
      },
      render(ctx) {
        const b = ctx.systemBase;
        const g = this.geometry[ctx.device];
        const cutoff = g.start + (g.end - g.start) * ctx.pct / 100;
        ctx.set("lighting", `${b}/${ctx.device}/${ctx.material}/${ctx.secondary}/lighting.webp`, ctx.pct / 100);
        ctx.set("primary", `${b}/${ctx.device}/${ctx.material}/${ctx.secondary}/fabric.webp`, 1,
          `inset(0 0 ${100 - cutoff / g.height * 100}% 0)`);
        ctx.set("hardware", `${b}/${ctx.device}/hardware.webp`);
        ctx.set("state", `${b}/${ctx.device}/rail-${ctx.code}.webp`);
      }
    },

    horizontal: {
      title: "Горизонтальные",
      thumb: "horizontal.webp",
      materialLabel: "Цвет ламелей",
      materials: {
        white: "Белый",
        silver: "Светлое серебро",
        anthracite: "Антрацит"
      },
      defaultMaterial: "white",
      secondaryLabel: "Поворот ламелей",
      secondary: {
        open: "Открыты",
        half: "Полуоткрыты",
        closed: "Закрыты"
      },
      defaultSecondary: "half",
      stateLabel: "Степень опускания",
      defaultState: 3,
      geometry: {
        desktop: { height: 992, start: 151, end: 640, rail: 13 },
        mobile: { height: 1402, start: 315, end: 785, rail: 11 }
      },
      render(ctx) {
        const b = ctx.systemBase;
        const g = this.geometry[ctx.device];
        const cutoff = g.start + (g.end - g.start - g.rail) * ctx.pct / 100;
        ctx.set("lighting", `${b}/${ctx.device}/${ctx.material}/${ctx.secondary}/lighting.webp`, ctx.pct / 100);
        ctx.set("primary", `${b}/${ctx.device}/${ctx.material}/${ctx.secondary}/slats.webp`, 1,
          `inset(0 0 ${100 - cutoff / g.height * 100}% 0)`);
        ctx.set("hardware", `${b}/${ctx.device}/${ctx.material}/hardware.webp`);
        ctx.set("state", `${b}/${ctx.device}/${ctx.material}/state-${ctx.code}.webp`);
      }
    },

    vertical: {
      title: "Вертикальные",
      thumb: "vertical.webp",
      materialLabel: "Материал и цвет",
      materials: {
        ivory: "Молочный текстиль",
        greige: "Серо-бежевый",
        graphite: "Графитовый"
      },
      defaultMaterial: "ivory",
      secondaryLabel: "Поворот ламелей",
      secondary: {
        open: "Открыты",
        half: "Полуоткрыты",
        closed: "Закрыты"
      },
      defaultSecondary: "half",
      stateLabel: "Степень раздвижения",
      defaultState: 4,
      geometry: {
        desktop: { width: 1586, start: 344, end: 1212 },
        mobile: { width: 1122, start: 226, end: 895 }
      },
      render(ctx) {
        const b = ctx.systemBase;
        const g = this.geometry[ctx.device];
        const visibleEnd = g.start + (g.end - g.start) * ctx.pct / 100;
        ctx.set("lighting", `${b}/${ctx.device}/${ctx.material}/${ctx.secondary}/lighting.webp`, ctx.pct / 100);
        ctx.set("primary", `${b}/${ctx.device}/${ctx.material}/${ctx.secondary}/lamellas.webp`, 1,
          `inset(0 ${100 - visibleEnd / g.width * 100}% 0 0)`);
        ctx.set("hardware", `${b}/${ctx.device}/track.webp`);
        ctx.set("state", `${b}/${ctx.device}/${ctx.material}/state-${ctx.code}.webp`);
      }
    },

    pleated: {
      title: "Плиссе",
      thumb: "pleated.webp",
      materialLabel: "Материал ткани",
      materials: {
        ivory: "Молочный",
        beige: "Бежевый Dimout",
        graphite: "Графитовый Blackout"
      },
      defaultMaterial: "ivory",
      secondaryLabel: "Направление движения",
      secondary: {
        "bottom-up": "Снизу вверх",
        "top-down": "Сверху вниз",
        center: "Двустороннее"
      },
      defaultSecondary: "bottom-up",
      stateLabel: "Степень закрытия",
      defaultState: 3,
      geometry: {
        desktop: { height: 992, y1: 145, y2: 644, profile: 12 },
        mobile: { height: 1402, y1: 307, y2: 789, profile: 10 }
      },
      band(g, direction, pct) {
        const full = g.y2 - g.y1 - g.profile;
        if (direction === "bottom-up") {
          return [g.y1, g.y1 + full * pct / 100 + g.profile];
        }
        if (direction === "top-down") {
          return [g.y2 - g.profile - full * pct / 100, g.y2];
        }
        const band = full * pct / 100;
        const center = (g.y1 + g.y2) / 2;
        return [center - band / 2, center + band / 2];
      },
      render(ctx) {
        const b = ctx.systemBase;
        const g = this.geometry[ctx.device];
        const band = this.band(g, ctx.secondary, ctx.pct);
        const top = band[0] / g.height * 100;
        const bottom = 100 - band[1] / g.height * 100;
        ctx.set("lighting", `${b}/${ctx.device}/${ctx.material}/lighting.webp`, ctx.pct / 100);
        ctx.set("primary", `${b}/${ctx.device}/${ctx.material}/fabric.webp`, 1,
          `inset(${top}% 0 ${bottom}% 0)`);
        ctx.set("hardware", `${b}/${ctx.device}/hardware.webp`);
        ctx.set("state", `${b}/${ctx.device}/profiles/${ctx.secondary}/profiles-${ctx.code}.webp`);
      }
    },

    roman: {
      title: "Римские",
      thumb: "roman.webp",
      materialLabel: "Ткань",
      materials: {
        ivory: "Молочный лён",
        beige: "Бежевый Dimout",
        graphite: "Графитовый Blackout"
      },
      defaultMaterial: "ivory",
      stateLabel: "Степень опускания",
      defaultState: 3,
      render(ctx) {
        const b = ctx.systemBase;
        ctx.set("lighting", `${b}/${ctx.device}/${ctx.material}/lighting.webp`, ctx.pct / 100);
        ctx.set("primary", `${b}/${ctx.device}/${ctx.material}/roman-${ctx.code}.webp`);
        ctx.set("hardware", `${b}/${ctx.device}/hardware.webp`);
      }
    },

    wood: {
      title: "Деревянные",
      thumb: "wood.webp",
      materialLabel: "Оттенок дерева",
      materials: {
        oak: "Светлый дуб",
        walnut: "Орех",
        wenge: "Тёмный венге"
      },
      defaultMaterial: "oak",
      secondaryLabel: "Поворот ламелей",
      secondary: {
        open: "Открыты",
        half: "Полуоткрыты",
        closed: "Закрыты"
      },
      defaultSecondary: "half",
      stateLabel: "Степень опускания",
      defaultState: 3,
      geometry: {
        desktop: { height: 992, start: 153, end: 642, rail: 15 },
        mobile: { height: 1402, start: 315, end: 786, rail: 12 }
      },
      render(ctx) {
        const b = ctx.systemBase;
        const g = this.geometry[ctx.device];
        const cutoff = g.start + (g.end - g.start - g.rail) * ctx.pct / 100;
        ctx.set("lighting", `${b}/${ctx.device}/${ctx.material}/${ctx.secondary}/lighting.webp`, ctx.pct / 100);
        ctx.set("primary", `${b}/${ctx.device}/${ctx.material}/${ctx.secondary}/slats.webp`, 1,
          `inset(0 0 ${100 - cutoff / g.height * 100}% 0)`);
        ctx.set("hardware", `${b}/${ctx.device}/${ctx.material}/hardware.webp`);
        ctx.set("state", `${b}/${ctx.device}/${ctx.material}/state-${ctx.code}.webp`);
      }
    }
  };

  function button(label, attrs, className) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className || "";
    el.textContent = label;
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === "dataset") {
        Object.entries(value).forEach(([dKey, dValue]) => el.dataset[dKey] = dValue);
      } else {
        el.setAttribute(key, value);
      }
    });
    return el;
  }

  function init(root, options) {
    if (!root) throw new Error("VeloraConfigurator: root element is required.");

    const opts = Object.assign({
      assetBase: "assets",
      initialSystem: "roller",
      deviceMode: "auto"
    }, options || {});

    root.classList.add("vc-root");
    root.innerHTML = `
      <header class="vc-header">
        <div>
          <p class="vc-eyebrow">Velora configurator</p>
          <h2 class="vc-title">Посмотрите, как жалюзи изменят ваш интерьер</h2>
        </div>
        <p class="vc-intro">
          Выберите систему, материал и положение полотна. Фон остаётся
          неподвижным, поэтому изделие можно сравнивать без визуальных скачков.
        </p>
      </header>

      <nav class="vc-system-list" aria-label="Системы жалюзи"></nav>

      <div class="vc-layout">
        <div class="vc-visual">
          <div class="vc-stage" data-device="desktop">
            <img data-layer="base" alt="Интерьер с выбранной системой жалюзи">
            <img data-layer="lighting" alt="">
            <img data-layer="primary" alt="">
            <img data-layer="hardware" alt="">
            <img data-layer="state" alt="">

            <div class="vc-device-switch" aria-label="Режим предпросмотра">
              <button type="button" data-device-mode="auto" aria-pressed="true">Авто</button>
              <button type="button" data-device-mode="desktop" aria-pressed="false">ПК</button>
              <button type="button" data-device-mode="mobile" aria-pressed="false">Телефон</button>
            </div>
          </div>

          <div class="vc-caption">
            <strong data-caption-title></strong>
            <span data-caption-details></span>
          </div>
        </div>

        <aside class="vc-controls">
          <section class="vc-card">
            <strong class="vc-card-title" data-material-label></strong>
            <div class="vc-options" data-material-options></div>
          </section>

          <section class="vc-card" data-secondary-card>
            <strong class="vc-card-title" data-secondary-label></strong>
            <div class="vc-options" data-secondary-options></div>
          </section>

          <section class="vc-card">
            <div class="vc-range-head">
              <strong class="vc-card-title" style="margin:0" data-state-label></strong>
              <span class="vc-range-value" data-state-value></span>
            </div>
            <input class="vc-range" data-range type="range" min="0" max="4" step="1">
            <div class="vc-range-labels">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </section>

          <section class="vc-card vc-summary">
            <h3>Выбранная конфигурация</h3>
            <dl>
              <dt>Система</dt><dd data-summary-system></dd>
              <dt>Материал</dt><dd data-summary-material></dd>
              <dt data-summary-secondary-label></dt><dd data-summary-secondary></dd>
              <dt>Положение</dt><dd data-summary-state></dd>
            </dl>
            <p class="vc-note">
              В рабочей версии сайта эти данные можно передавать в форму заявки,
              калькулятор стоимости или мессенджер.
            </p>
          </section>
        </aside>
      </div>
    `;

    const refs = {
      systems: root.querySelector(".vc-system-list"),
      stage: root.querySelector(".vc-stage"),
      base: root.querySelector('[data-layer="base"]'),
      lighting: root.querySelector('[data-layer="lighting"]'),
      primary: root.querySelector('[data-layer="primary"]'),
      hardware: root.querySelector('[data-layer="hardware"]'),
      state: root.querySelector('[data-layer="state"]'),
      materialLabel: root.querySelector("[data-material-label]"),
      materialOptions: root.querySelector("[data-material-options]"),
      secondaryCard: root.querySelector("[data-secondary-card]"),
      secondaryLabel: root.querySelector("[data-secondary-label]"),
      secondaryOptions: root.querySelector("[data-secondary-options]"),
      range: root.querySelector("[data-range]"),
      stateLabel: root.querySelector("[data-state-label]"),
      stateValue: root.querySelector("[data-state-value]"),
      captionTitle: root.querySelector("[data-caption-title]"),
      captionDetails: root.querySelector("[data-caption-details]"),
      summarySystem: root.querySelector("[data-summary-system]"),
      summaryMaterial: root.querySelector("[data-summary-material]"),
      summarySecondaryLabel: root.querySelector("[data-summary-secondary-label]"),
      summarySecondary: root.querySelector("[data-summary-secondary]"),
      summaryState: root.querySelector("[data-summary-state]")
    };

    const state = {
      system: SYSTEMS[opts.initialSystem] ? opts.initialSystem : "roller",
      material: "",
      secondary: "",
      stateIndex: 0,
      deviceMode: opts.deviceMode
    };

    function effectiveDevice() {
      if (state.deviceMode !== "auto") return state.deviceMode;
      return window.matchMedia("(max-width: 560px)").matches ? "mobile" : "desktop";
    }

    function resetLayer(name) {
      const el = refs[name];
      el.removeAttribute("src");
      el.style.display = "none";
      el.style.opacity = "1";
      el.style.clipPath = "none";
    }

    function setLayer(name, src, opacity, clipPath) {
      const el = refs[name];
      if (!src) {
        resetLayer(name);
        return;
      }
      el.style.display = "block";
      el.style.opacity = opacity == null ? "1" : String(opacity);
      el.style.clipPath = clipPath || "none";
      if (el.getAttribute("src") !== src) el.setAttribute("src", src);
    }

    function renderSystems() {
      refs.systems.innerHTML = "";
      Object.entries(SYSTEMS).forEach(([slug, system]) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "vc-system";
        el.dataset.system = slug;
        el.setAttribute("aria-pressed", String(slug === state.system));
        el.innerHTML = `
          <img src="${opts.assetBase}/thumbnails/${system.thumb}" alt="" loading="lazy">
          <span>${system.title}</span>
        `;
        el.addEventListener("click", () => selectSystem(slug));
        refs.systems.appendChild(el);
      });
    }

    function renderOptions(container, values, selected, dataKey, handler) {
      container.innerHTML = "";
      Object.entries(values).forEach(([value, label]) => {
        const el = button(label, {
          "aria-pressed": String(value === selected),
          dataset: { [dataKey]: value }
        }, "vc-option");
        el.addEventListener("click", () => handler(value));
        container.appendChild(el);
      });
    }

    function selectSystem(slug) {
      const system = SYSTEMS[slug];
      state.system = slug;
      state.material = system.defaultMaterial;
      state.secondary = system.defaultSecondary || "";
      state.stateIndex = system.defaultState == null ? 2 : system.defaultState;

      root.querySelectorAll(".vc-system").forEach(el => {
        el.setAttribute("aria-pressed", String(el.dataset.system === slug));
      });

      refs.materialLabel.textContent = system.materialLabel;
      refs.stateLabel.textContent = system.stateLabel;
      refs.range.value = String(state.stateIndex);

      renderMaterial();

      if (system.secondary) {
        refs.secondaryCard.classList.remove("vc-hidden");
        refs.secondaryLabel.textContent = system.secondaryLabel;
        renderOptions(
          refs.secondaryOptions,
          system.secondary,
          state.secondary,
          "secondary",
          value => {
            state.secondary = value;
            renderSecondary();
            render();
          }
        );
      } else {
        refs.secondaryCard.classList.add("vc-hidden");
        refs.secondaryOptions.innerHTML = "";
      }

      renderMaterial();
      renderSecondary();
      render();
    }

    function renderMaterial() {
      const system = SYSTEMS[state.system];
      renderOptions(
        refs.materialOptions,
        system.materials,
        state.material,
        "material",
        value => {
          state.material = value;
          renderMaterial();
          render();
        }
      );
    }

    function renderSecondary() {
      const system = SYSTEMS[state.system];
      if (!system.secondary) return;
      renderOptions(
        refs.secondaryOptions,
        system.secondary,
        state.secondary,
        "secondary",
        value => {
          state.secondary = value;
          renderSecondary();
          render();
        }
      );
    }

    function render() {
      const system = SYSTEMS[state.system];
      const device = effectiveDevice();
      const pct = STATES[state.stateIndex];
      const code = CODES[state.stateIndex];

      refs.stage.dataset.device = device;
      refs.base.src = `${opts.assetBase}/common/room-${device}.webp`;

      ["lighting", "primary", "hardware", "state"].forEach(resetLayer);

      const ctx = {
        device,
        pct,
        code,
        material: state.material,
        secondary: state.secondary,
        systemBase: `${opts.assetBase}/systems/${state.system}`,
        set: setLayer
      };

      system.render.call(system, ctx);

      refs.stateValue.textContent = `${pct}%`;
      refs.captionTitle.textContent = system.title;
      const secondaryText = system.secondary ? system.secondary[state.secondary] : "";
      refs.captionDetails.textContent = [
        system.materials[state.material],
        secondaryText,
        `${pct}%`
      ].filter(Boolean).join(" · ");

      refs.summarySystem.textContent = system.title;
      refs.summaryMaterial.textContent = system.materials[state.material];
      refs.summaryState.textContent = `${pct}%`;

      if (system.secondary) {
        refs.summarySecondaryLabel.textContent = system.secondaryLabel;
        refs.summarySecondary.textContent = system.secondary[state.secondary];
        refs.summarySecondaryLabel.classList.remove("vc-hidden");
        refs.summarySecondary.classList.remove("vc-hidden");
      } else {
        refs.summarySecondaryLabel.textContent = "";
        refs.summarySecondary.textContent = "";
        refs.summarySecondaryLabel.classList.add("vc-hidden");
        refs.summarySecondary.classList.add("vc-hidden");
      }

      root.dispatchEvent(new CustomEvent("velora:change", {
        detail: {
          system: state.system,
          systemTitle: system.title,
          material: state.material,
          materialTitle: system.materials[state.material],
          secondary: state.secondary || null,
          secondaryTitle: secondaryText || null,
          state: pct,
          device
        }
      }));
    }

    refs.range.addEventListener("input", () => {
      state.stateIndex = Number(refs.range.value);
      render();
    });

    root.querySelectorAll("[data-device-mode]").forEach(el => {
      el.addEventListener("click", () => {
        state.deviceMode = el.dataset.deviceMode;
        root.querySelectorAll("[data-device-mode]").forEach(button => {
          button.setAttribute("aria-pressed", String(button === el));
        });
        render();
      });
    });

    const media = window.matchMedia("(max-width: 560px)");
    if (media.addEventListener) {
      media.addEventListener("change", () => {
        if (state.deviceMode === "auto") render();
      });
    }

    renderSystems();
    selectSystem(state.system);

    return {
      getValue() {
        const system = SYSTEMS[state.system];
        return {
          system: state.system,
          systemTitle: system.title,
          material: state.material,
          materialTitle: system.materials[state.material],
          secondary: state.secondary || null,
          secondaryTitle: system.secondary ? system.secondary[state.secondary] : null,
          state: STATES[state.stateIndex],
          device: effectiveDevice()
        };
      },
      setSystem(slug) {
        if (!SYSTEMS[slug]) throw new Error(`Unknown system: ${slug}`);
        selectSystem(slug);
      },
      destroy() {
        root.innerHTML = "";
        root.classList.remove("vc-root");
      }
    };
  }

  global.VeloraConfigurator = { init, systems: SYSTEMS };
})(window);
