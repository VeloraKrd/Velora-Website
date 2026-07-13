/* ============================================================================
   VELORA — ЛОГИКА КОНФИГУРАТОРА  (#configurator)
   ----------------------------------------------------------------------------
   Данные (цены, материалы, цвета, совместимость) — в js/configurator-data.js.
   Здесь только логика: состояние, шаги, визуализация, расчёт, форма.

   Всё состояние хранится в ОДНОМ объекте state и в localStorage.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.VELORA_CFG;
  if (!D) return;

  const root = document.getElementById('configurator');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORAGE_KEY = 'velora_cfg_v1';
  const TOTAL_STEPS = 6;
  const PHONE = '79181384029';
  const STEP_TITLES = ['Система', 'Размеры', 'Установка', 'Материал', 'Цвет и управление', 'Результат'];

  const money = (n) => Math.round(n).toLocaleString('ru-RU');
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Осветление / затемнение hex. pct: -100..100 (отриц. — темнее)
  function shade(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = pct < 0 ? 0 : 255, p = Math.abs(pct) / 100;
    r = Math.round((t - r) * p) + r;
    g = Math.round((t - g) * p) + g;
    b = Math.round((t - b) * p) + b;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* -------- Состояние --------------------------------------------------------- */
  function firstCompatibleInstall(sys) { return sys.installs[0]; }
  function firstControl(sys) { return sys.controls[0]; }

  function defaultState() {
    const sys = D.SYSTEMS[0];
    const mats = D.getMaterials(sys.id);
    const pal = D.getPalette(sys.id, mats[0].id);
    return {
      step: 1,
      system: sys.id,
      width: D.LIMITS.width.def,
      height: D.LIMITS.height.def,
      qty: D.LIMITS.qty.def,
      scope: 'sash-one',
      install: firstCompatibleInstall(sys),
      material: mats[0].id,
      color: pal[0].id,
      hardware: D.HARDWARE_COLORS[0].id,
      side: 'right',
      control: firstControl(sys),
      guides: false,
      montage: true,
      open: sys.defaultOpen,
      tone: 0,
      name: '',
      phone: '',
      contact: 'call'
    };
  }

  // Приводим state к совместимому виду после смены системы
  function reconcile() {
    const sys = D.getSystem(state.system);
    if (!sys.installs.includes(state.install)) state.install = sys.installs[0];
    const mats = D.getMaterials(sys.id);
    if (!mats.some(m => m.id === state.material)) state.material = mats[0].id;
    const pal = D.getPalette(sys.id, state.material);
    if (!pal.some(c => c.id === state.color)) state.color = pal[0].id;
    if (!sys.controls.includes(state.control)) state.control = sys.controls[0];
    if (!sys.guides) state.guides = false;
    state.open = clamp(state.open, 0, 1);
    state.tone = clamp(state.tone, -6, 6);
  }

  let state = load() || defaultState();
  reconcile();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !D.getSystem(s.system)) return null;
      const base = defaultState();
      return Object.assign(base, s, { step: clamp(s.step || 1, 1, TOTAL_STEPS) });
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { }
  }

  /* -------- Ссылки на DOM ------------------------------------------------------ */
  const stage = document.getElementById('vcfgStage');
  const blind = document.getElementById('vcfgBlind');
  const openRange = document.getElementById('vcfgOpen');
  const stepBody = document.getElementById('vcfgStepBody');
  const dotsWrap = document.getElementById('vcfgStepsHead');
  const backBtn = document.getElementById('vcfgBack');
  const nextBtn = document.getElementById('vcfgNext');
  const priceInline = document.getElementById('vcfgPriceInline');
  const mbPrice = document.getElementById('vcfgMbPrice');
  const mbNext = document.getElementById('vcfgMbNext');

  /* -------- Расчёт стоимости ---------------------------------------------------
     area = ш*в / 10000
     base = max(area,minArea) * pricePerM2 * materialCoef * qty
     (для поштучных — отдельная формула с минимальной ценой изделия)
     total = base + systemOptions + controlOptions + installation             */
  function calcPrice() {
    const sys = D.getSystem(state.system);
    const mat = D.getMaterials(sys.id).find(m => m.id === state.material) || D.getMaterials(sys.id)[0];
    const w = clamp(+state.width || 0, 0, D.LIMITS.width.max);
    const h = clamp(+state.height || 0, 0, D.LIMITS.height.max);
    const qty = clamp(+state.qty || 1, 1, D.LIMITS.qty.max);
    const area = (w * h) / 10000;
    const billArea = Math.max(area, sys.minArea);

    let perItem;
    if (sys.unit === 'item') {
      perItem = billArea * sys.pricePerM2 * mat.coef;
      perItem = Math.max(perItem, sys.minItemPrice * mat.coef); // минимальная цена изделия
    } else {
      perItem = billArea * sys.pricePerM2 * mat.coef;
    }
    const base = perItem * qty;

    const guidesPrice = state.guides && sys.guides ? D.GUIDE_PRICE * qty : 0;
    const systemOptions = guidesPrice; // «монтаж» пока 0 (см. montage ниже)
    const controlOptions = (D.CONTROLS[state.control]?.price || 0) * qty;
    const installation = (D.INSTALLS[state.install]?.price || 0) * qty;

    const total = base + systemOptions + controlOptions + installation;

    return {
      area, billArea, base, perItem, guidesPrice, systemOptions, controlOptions,
      installation, total, w, h, qty, sys, mat
    };
  }

  /* -------- Визуализация ------------------------------------------------------- */
  let builtSystem = null;

  function slatSpans(n, cls) {
    let s = '';
    for (let i = 0; i < n; i++) s += `<span class="${cls}"></span>`;
    return s;
  }

  function buildBlind(sys) {
    let html = '';
    switch (sys.vizClass) {
      case 'roller':
        html = `<div class="vcfg-headbox"></div><div class="vcfg-fabric"></div><div class="vcfg-bottombar"></div>`;
        break;
      case 'cassette':
        html = `<div class="vcfg-cassette"></div>
                <div class="vcfg-guide vcfg-guide-l"></div><div class="vcfg-guide vcfg-guide-r"></div>
                <div class="vcfg-fabric vcfg-fabric-inset"></div><div class="vcfg-bottombar vcfg-bar-inset"></div>`;
        break;
      case 'daynight':
        html = `<div class="vcfg-headbox"></div>
                <div class="vcfg-dn"><div class="vcfg-dn-layer"></div></div>
                <div class="vcfg-bottombar"></div>`;
        break;
      case 'pleated':
        html = `<div class="vcfg-headbox vcfg-headbox-slim"></div><div class="vcfg-fabric vcfg-pleat"></div><div class="vcfg-bottombar vcfg-bar-slim"></div>`;
        break;
      case 'roman':
        html = `<div class="vcfg-headbox"></div><div class="vcfg-fabric vcfg-roman">${slatSpans(6, 'vcfg-roman-fold')}</div><div class="vcfg-bottombar"></div>`;
        break;
      case 'horizontal':
        html = `<div class="vcfg-headrail"></div><div class="vcfg-hslats">${slatSpans(18, 'vcfg-hslat')}</div><div class="vcfg-bottombar vcfg-bar-slim"></div>`;
        break;
      case 'wood':
        html = `<div class="vcfg-headrail"></div><div class="vcfg-hslats vcfg-wood">${slatSpans(9, 'vcfg-hslat')}</div><div class="vcfg-tape vcfg-tape-l"></div><div class="vcfg-tape vcfg-tape-r"></div><div class="vcfg-bottombar"></div>`;
        break;
      case 'vertical':
        html = `<div class="vcfg-headrail"></div><div class="vcfg-vslats">${slatSpans(11, 'vcfg-vslat')}</div>`;
        break;
    }
    blind.innerHTML = html;
    builtSystem = sys.vizClass;
  }

  function updateVisual() {
    const sys = D.getSystem(state.system);
    const mat = D.getMaterials(sys.id).find(m => m.id === state.material) || D.getMaterials(sys.id)[0];
    const pal = D.getPalette(sys.id, state.material);
    const colorObj = pal.find(c => c.id === state.color) || pal[0];
    const hw = D.HARDWARE_COLORS.find(c => c.id === state.hardware) || D.HARDWARE_COLORS[0];

    if (builtSystem !== sys.vizClass) buildBlind(sys);

    const baseHex = colorObj.hex;
    const matHex = shade(baseHex, state.tone * 6);
    stage.dataset.system = sys.vizClass;
    stage.dataset.control = state.control;
    stage.dataset.side = state.side;
    stage.style.setProperty('--mat', matHex);
    stage.style.setProperty('--mat-dark', shade(matHex, -22));
    stage.style.setProperty('--mat-light', shade(matHex, 16));
    stage.style.setProperty('--alpha', mat.alpha);
    stage.style.setProperty('--hw', hw.hex);
    stage.style.setProperty('--hw-dark', shade(hw.hex, -25));
    blind.style.setProperty('--open', state.open.toFixed(3));

    // Размеры влияют на пропорции окна (умеренно, композиция не ломается)
    const ar = clamp((+state.width || 120) / (+state.height || 150), 0.55, 1.9);
    let winW, winH;
    if (ar >= 1) { winW = 86; winH = 86 / ar; } else { winH = 86; winW = 86 * ar; }
    winH = clamp(winH, 48, 86); winW = clamp(winW, 42, 88);
    stage.style.setProperty('--win-w', winW.toFixed(1) + '%');
    stage.style.setProperty('--win-h', winH.toFixed(1) + '%');
  }

  /* -------- Обновление цены (везде) -------------------------------------------- */
  function updatePrice() {
    const p = calcPrice();
    const txt = money(p.total) + ' ₽';
    if (priceInline) priceInline.textContent = txt;
    if (mbPrice) mbPrice.textContent = txt;
    const sum = document.getElementById('vcfgResultPrice');
    if (sum) sum.textContent = money(p.total);
    const summ = document.getElementById('vcfgSummary');
    if (summ) renderSummaryRows(summ, p);
    return p;
  }

  /* ==========================================================================
     РЕНДЕР ШАГОВ
     ========================================================================== */
  function renderDots() {
    dotsWrap.innerHTML = STEP_TITLES.map((t, i) => {
      const n = i + 1;
      const cls = 'vcfg-dot' + (n === state.step ? ' active' : '') + (n < state.step ? ' done' : '');
      return `<button type="button" class="${cls}" data-step="${n}" aria-label="Шаг ${n}: ${t}"${n <= maxReached ? '' : ' disabled'}>
                <i>${n}</i><em>${t}</em></button>`;
    }).join('');
  }

  let maxReached = state.step;

  function gotoStep(n, opts) {
    n = clamp(n, 1, TOTAL_STEPS);
    // Валидация при движении вперёд
    if (opts && opts.validate && n > state.step) {
      if (!validateStep(state.step)) return;
    }
    state.step = n;
    maxReached = Math.max(maxReached, n);
    save();
    renderStep();
    if (opts && opts.scroll) {
      const y = root.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  function renderStep() {
    renderDots();
    stepBody.innerHTML = STEP_RENDERERS[state.step]();
    bindStep(state.step);
    // навигация
    backBtn.style.visibility = state.step > 1 ? 'visible' : 'hidden';
    const lastNextLabel = state.step === TOTAL_STEPS ? 'Готово' : 'Далее';
    nextBtn.textContent = state.step === TOTAL_STEPS ? 'Наверх' : 'Далее →';
    nextBtn.classList.toggle('is-final', state.step === TOTAL_STEPS);
    if (mbNext) mbNext.textContent = state.step === TOTAL_STEPS ? 'Получить расчёт' : 'Далее';
    updateVisual();
    updatePrice();
  }

  // ---- Шаг 1: Система ----
  function stepSystem() {
    const cards = D.SYSTEMS.map(s => {
      const active = s.id === state.system;
      return `<button type="button" class="vcfg-card${active ? ' active' : ''}" data-sys="${s.id}" aria-pressed="${active}">
        <span class="vcfg-card-thumb"><img src="${s.thumb}" alt="" width="72" height="90" loading="lazy"></span>
        <span class="vcfg-card-body">
          <span class="vcfg-card-name">${esc(s.name)}</span>
          <span class="vcfg-card-desc">${esc(s.desc)}</span>
          <span class="vcfg-card-price">от ${money(s.priceFrom)} ₽</span>
        </span>
      </button>`;
    }).join('');
    return `<div class="vcfg-step" data-step="1">
      <span class="vcfg-step-label">Шаг 1 из 6 · Система</span>
      <h3 class="vcfg-step-title">Выберите тип жалюзи</h3>
      <div class="vcfg-cards">${cards}</div>
    </div>`;
  }

  // ---- Шаг 2: Размеры ----
  function stepSizes() {
    const L = D.LIMITS;
    const scopeOpts = [
      { id: 'sash-one', name: 'Одна створка' },
      { id: 'sash-multi', name: 'Несколько створок' },
      { id: 'opening', name: 'Весь проём' }
    ];
    return `<div class="vcfg-step" data-step="2">
      <span class="vcfg-step-label">Шаг 2 из 6 · Размеры</span>
      <h3 class="vcfg-step-title">Укажите размеры окна
        <button type="button" class="vcfg-help" id="vcfgMeasureBtn" aria-haspopup="dialog">Как правильно измерить?</button>
      </h3>
      <div class="vcfg-dims">
        <div class="vcfg-field">
          <label for="vcfgW">Ширина, см</label>
          <input type="number" id="vcfgW" inputmode="numeric" value="${esc(state.width)}" min="${L.width.min}" max="${L.width.max}" aria-describedby="vcfgWErr">
          <p class="vcfg-err" id="vcfgWErr" role="alert"></p>
        </div>
        <div class="vcfg-field">
          <label for="vcfgH">Высота, см</label>
          <input type="number" id="vcfgH" inputmode="numeric" value="${esc(state.height)}" min="${L.height.min}" max="${L.height.max}" aria-describedby="vcfgHErr">
          <p class="vcfg-err" id="vcfgHErr" role="alert"></p>
        </div>
        <div class="vcfg-field vcfg-field-qty">
          <label for="vcfgQ">Количество</label>
          <div class="vcfg-stepper">
            <button type="button" class="vcfg-step-btn" data-q="-1" aria-label="Меньше">−</button>
            <input type="number" id="vcfgQ" inputmode="numeric" value="${esc(state.qty)}" min="${L.qty.min}" max="${L.qty.max}">
            <button type="button" class="vcfg-step-btn" data-q="1" aria-label="Больше">+</button>
          </div>
        </div>
      </div>
      <div class="vcfg-scope">
        <label class="vcfg-sublabel">Что закрываем</label>
        <div class="vcfg-chips" role="group" aria-label="Область установки">
          ${scopeOpts.map(o => `<button type="button" class="vcfg-chip${state.scope === o.id ? ' active' : ''}" data-scope="${o.id}" aria-pressed="${state.scope === o.id}">${o.name}</button>`).join('')}
        </div>
      </div>
    </div>`;
  }

  // ---- Шаг 3: Установка ----
  function stepInstall() {
    const sys = D.getSystem(state.system);
    const items = sys.installs.map(id => {
      const inst = D.INSTALLS[id];
      const active = state.install === id;
      const add = inst.price ? `+${money(inst.price)} ₽` : 'включено';
      return `<button type="button" class="vcfg-option${active ? ' active' : ''}" data-install="${id}" aria-pressed="${active}">
        <span class="vcfg-option-main"><b>${esc(inst.name)}</b><small>${esc(inst.note)}</small></span>
        <span class="vcfg-option-add">${add}</span>
      </button>`;
    }).join('');
    return `<div class="vcfg-step" data-step="3">
      <span class="vcfg-step-label">Шаг 3 из 6 · Установка</span>
      <h3 class="vcfg-step-title">Способ установки</h3>
      <p class="vcfg-hint">Показаны только варианты, совместимые с системой «${esc(sys.name)}».</p>
      <div class="vcfg-options">${items}</div>
    </div>`;
  }

  // ---- Шаг 4: Материал ----
  function stepMaterial() {
    const sys = D.getSystem(state.system);
    const mats = D.getMaterials(sys.id);
    const cards = mats.map(m => {
      const active = state.material === m.id;
      return `<button type="button" class="vcfg-mat${active ? ' active' : ''}" data-mat="${m.id}" aria-pressed="${active}">
        <span class="vcfg-mat-swatch" data-swatch="${m.id}"></span>
        <span class="vcfg-mat-info">
          <span class="vcfg-mat-name">${esc(m.name)}
            <span class="vcfg-tip" tabindex="0" aria-label="${esc(m.info)}" data-tip="${esc(m.info)}">i</span>
          </span>
          <span class="vcfg-mat-meta">${esc(m.transp)} · ${esc(m.cat)}</span>
        </span>
      </button>`;
    }).join('');
    return `<div class="vcfg-step" data-step="4">
      <span class="vcfg-step-label">Шаг 4 из 6 · Материал</span>
      <h3 class="vcfg-step-title">Выберите материал</h3>
      <p class="vcfg-hint">Совместимые материалы для системы «${esc(sys.name)}».</p>
      <div class="vcfg-mats">${cards}</div>
    </div>`;
  }

  // ---- Шаг 5: Цвет и управление ----
  function stepColor() {
    const sys = D.getSystem(state.system);
    const pal = D.getPalette(sys.id, state.material);
    const swatches = pal.map(c =>
      `<button type="button" class="vcfg-swatch${state.color === c.id ? ' active' : ''}" data-color="${c.id}" style="--sw:${c.hex}" aria-label="${esc(c.name)}" aria-pressed="${state.color === c.id}"></button>`
    ).join('');
    const hw = D.HARDWARE_COLORS.map(c =>
      `<button type="button" class="vcfg-swatch vcfg-swatch-hw${state.hardware === c.id ? ' active' : ''}" data-hw="${c.id}" style="--sw:${c.hex}" aria-label="${esc(c.name)} фурнитура" aria-pressed="${state.hardware === c.id}"></button>`
    ).join('');
    const sides = D.SIDES.map(s =>
      `<button type="button" class="vcfg-chip${state.side === s.id ? ' active' : ''}" data-side="${s.id}" aria-pressed="${state.side === s.id}">${s.name}</button>`
    ).join('');
    const controls = sys.controls.map(id => {
      const c = D.CONTROLS[id];
      const add = c.price ? ` <small>+${money(c.price)} ₽</small>` : '';
      return `<button type="button" class="vcfg-chip${state.control === id ? ' active' : ''}" data-control="${id}" aria-pressed="${state.control === id}">${esc(c.name)}${add}</button>`;
    }).join('');

    let extra = '';
    if (sys.guides) {
      extra += `<label class="vcfg-toggle">
        <input type="checkbox" id="vcfgGuides" ${state.guides ? 'checked' : ''}>
        <span>Боковые направляющие <small>+${money(D.GUIDE_PRICE)} ₽ / изделие</small></span>
      </label>`;
    }
    extra += `<label class="vcfg-toggle">
        <input type="checkbox" id="vcfgMontage" ${state.montage ? 'checked' : ''}>
        <span>Профессиональный монтаж <small>под ключ, включён</small></span>
      </label>`;

    return `<div class="vcfg-step" data-step="5">
      <span class="vcfg-step-label">Шаг 5 из 6 · Цвет и управление</span>
      <h3 class="vcfg-step-title">Цвет и управление</h3>
      <div class="vcfg-group">
        <label class="vcfg-sublabel">Цвет материала</label>
        <div class="vcfg-swatches" role="group" aria-label="Цвет материала">${swatches}</div>
      </div>
      <div class="vcfg-group">
        <label class="vcfg-sublabel">Цвет фурнитуры</label>
        <div class="vcfg-swatches" role="group" aria-label="Цвет фурнитуры">${hw}</div>
      </div>
      <div class="vcfg-group">
        <label class="vcfg-sublabel">Сторона управления</label>
        <div class="vcfg-chips" role="group" aria-label="Сторона управления">${sides}</div>
      </div>
      <div class="vcfg-group">
        <label class="vcfg-sublabel">Тип управления</label>
        <div class="vcfg-chips" role="group" aria-label="Тип управления">${controls}</div>
      </div>
      <div class="vcfg-group vcfg-extras">${extra}</div>
    </div>`;
  }

  // ---- Шаг 6: Результат ----
  function stepResult() {
    return `<div class="vcfg-step" data-step="6">
      <span class="vcfg-step-label">Шаг 6 из 6 · Результат</span>
      <h3 class="vcfg-step-title">Ваша конфигурация</h3>
      <div class="vcfg-summary" id="vcfgSummary"></div>
      <div class="vcfg-priceblock">
        <span class="vcfg-price-cap">Предварительная стоимость</span>
        <div class="vcfg-price-big"><span id="vcfgResultPrice">0</span> <small>₽</small></div>
        <p class="vcfg-price-sub">Точную стоимость специалист рассчитает после бесплатного замера.</p>
      </div>
      <form class="vcfg-form" id="vcfgForm" novalidate>
        <div class="vcfg-field">
          <label for="vcfgName">Имя</label>
          <input type="text" id="vcfgName" autocomplete="name" value="${esc(state.name)}" aria-describedby="vcfgNameErr">
          <p class="vcfg-err" id="vcfgNameErr" role="alert"></p>
        </div>
        <div class="vcfg-field">
          <label for="vcfgPhone">Телефон</label>
          <input type="tel" id="vcfgPhone" inputmode="tel" autocomplete="tel" value="${esc(state.phone)}" placeholder="+7 (___) ___-__-__" aria-describedby="vcfgPhoneErr">
          <p class="vcfg-err" id="vcfgPhoneErr" role="alert"></p>
        </div>
        <div class="vcfg-field">
          <label class="vcfg-sublabel" id="vcfgContactLbl">Способ связи</label>
          <div class="vcfg-chips" role="group" aria-labelledby="vcfgContactLbl">
            <button type="button" class="vcfg-chip${state.contact === 'call' ? ' active' : ''}" data-contact="call" aria-pressed="${state.contact === 'call'}">Звонок</button>
            <button type="button" class="vcfg-chip${state.contact === 'whatsapp' ? ' active' : ''}" data-contact="whatsapp" aria-pressed="${state.contact === 'whatsapp'}">WhatsApp</button>
            <button type="button" class="vcfg-chip${state.contact === 'telegram' ? ' active' : ''}" data-contact="telegram" aria-pressed="${state.contact === 'telegram'}">Telegram</button>
          </div>
        </div>
        <button type="submit" class="vcfg-submit">Получить точный расчёт
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </form>
      <div class="vcfg-success" id="vcfgSuccess" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
        <h4>Заявка принята!</h4>
        <p id="vcfgSuccessText">Мы свяжемся с вами в рабочее время, чтобы подтвердить конфигурацию и записать на бесплатный замер.</p>
        <div class="vcfg-success-recap" id="vcfgSuccessRecap"></div>
        <a class="vcfg-wa" id="vcfgWaLink" href="#" target="_blank" rel="noopener">Продублировать в WhatsApp</a>
      </div>
    </div>`;
  }

  const STEP_RENDERERS = { 1: stepSystem, 2: stepSizes, 3: stepInstall, 4: stepMaterial, 5: stepColor, 6: stepResult };

  /* -------- Итоговое резюме (шаг 6) -------------------------------------------- */
  function labelFor(map, id) { return (map[id] && map[id].name) || '—'; }
  function scopeName(id) { return ({ 'sash-one': 'Одна створка', 'sash-multi': 'Несколько створок', 'opening': 'Весь проём' })[id] || '—'; }

  function renderSummaryRows(el, p) {
    const sys = p.sys, mat = p.mat;
    const pal = D.getPalette(sys.id, state.material);
    const color = pal.find(c => c.id === state.color) || pal[0];
    const hw = D.HARDWARE_COLORS.find(c => c.id === state.hardware) || D.HARDWARE_COLORS[0];
    const rows = [
      ['Система', sys.name],
      ['Размеры', `${p.w} × ${p.h} см`],
      ['Количество', `${p.qty} шт`],
      ['Площадь', `${p.area.toFixed(2)} м²`],
      ['Область', scopeName(state.scope)],
      ['Установка', labelFor(D.INSTALLS, state.install)],
      ['Материал', mat.name],
      ['Цвет', color.name],
      ['Фурнитура', hw.name],
      ['Сторона', state.side === 'left' ? 'Слева' : 'Справа'],
      ['Управление', labelFor(D.CONTROLS, state.control)]
    ];
    const opts = [];
    if (state.guides && sys.guides) opts.push('направляющие');
    if (state.montage) opts.push('монтаж под ключ');
    rows.push(['Доп. опции', opts.length ? opts.join(', ') : '—']);
    el.innerHTML = rows.map(r => `<div class="vcfg-srow"><span>${r[0]}</span><span>${esc(r[1])}</span></div>`).join('');
  }

  /* ==========================================================================
     ПРИВЯЗКА СОБЫТИЙ ДЛЯ КАЖДОГО ШАГА
     ========================================================================== */
  function bindStep(step) {
    if (step === 1) {
      stepBody.querySelectorAll('[data-sys]').forEach(btn => btn.addEventListener('click', () => {
        if (state.system === btn.dataset.sys) return;
        state.system = btn.dataset.sys;
        state.open = D.getSystem(state.system).defaultOpen;
        reconcile();
        save();
        renderStep(); // перерисовать карточки (активная) и визуал
      }));
    }
    if (step === 2) bindSizes();
    if (step === 3) {
      stepBody.querySelectorAll('[data-install]').forEach(b => b.addEventListener('click', () => {
        state.install = b.dataset.install; markActive(b, '[data-install]'); save(); updatePrice();
      }));
    }
    if (step === 4) {
      paintMatSwatches();
      stepBody.querySelectorAll('[data-mat]').forEach(b => b.addEventListener('click', () => {
        state.material = b.dataset.mat;
        // цвет мог стать несовместимым (дерево/ткань)
        const pal = D.getPalette(state.system, state.material);
        if (!pal.some(c => c.id === state.color)) state.color = pal[0].id;
        markActive(b, '[data-mat]'); save(); updateVisual(); updatePrice();
      }));
    }
    if (step === 5) bindColor();
    if (step === 6) bindResult();
  }

  function markActive(btn, sel) {
    stepBody.querySelectorAll(sel).forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
  }

  function paintMatSwatches() {
    const sys = D.getSystem(state.system);
    const pal = D.getPalette(sys.id, state.material);
    const c0 = (pal.find(c => c.id === state.color) || pal[0]).hex;
    stepBody.querySelectorAll('.vcfg-mat-swatch').forEach(sw => {
      const m = D.getMaterials(sys.id).find(x => x.id === sw.dataset.swatch);
      if (!m) return;
      // образец: цвет материала + степень «плотности» через прозрачность
      sw.style.background = c0;
      sw.style.opacity = String(clamp(1 - m.alpha * 0.5, 0.5, 1));
    });
  }

  function bindSizes() {
    const wEl = document.getElementById('vcfgW');
    const hEl = document.getElementById('vcfgH');
    const qEl = document.getElementById('vcfgQ');
    const onDim = () => {
      state.width = wEl.value === '' ? '' : +wEl.value;
      state.height = hEl.value === '' ? '' : +hEl.value;
      validateDims(false);
      save(); updateVisual(); updatePrice();
    };
    wEl.addEventListener('input', onDim);
    hEl.addEventListener('input', onDim);
    wEl.addEventListener('blur', () => validateDims(true));
    hEl.addEventListener('blur', () => validateDims(true));
    qEl.addEventListener('input', () => {
      state.qty = clamp(+qEl.value || 1, D.LIMITS.qty.min, D.LIMITS.qty.max);
      save(); updatePrice();
    });
    stepBody.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      state.qty = clamp((+state.qty || 1) + (+b.dataset.q), D.LIMITS.qty.min, D.LIMITS.qty.max);
      qEl.value = state.qty; save(); updatePrice();
    }));
    stepBody.querySelectorAll('[data-scope]').forEach(b => b.addEventListener('click', () => {
      state.scope = b.dataset.scope; markActive(b, '[data-scope]'); save();
    }));
    const mBtn = document.getElementById('vcfgMeasureBtn');
    if (mBtn) mBtn.addEventListener('click', openModal);
  }

  function bindColor() {
    stepBody.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => {
      state.color = b.dataset.color; markActive(b, '[data-color]'); save(); updateVisual();
    }));
    stepBody.querySelectorAll('[data-hw]').forEach(b => b.addEventListener('click', () => {
      state.hardware = b.dataset.hw; markActive(b, '[data-hw]'); save(); updateVisual();
    }));
    stepBody.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => {
      state.side = b.dataset.side; markActive(b, '[data-side]'); save(); updateVisual();
    }));
    stepBody.querySelectorAll('[data-control]').forEach(b => b.addEventListener('click', () => {
      state.control = b.dataset.control; markActive(b, '[data-control]'); save(); updateVisual(); updatePrice();
    }));
    const g = document.getElementById('vcfgGuides');
    if (g) g.addEventListener('change', () => { state.guides = g.checked; save(); updateVisual(); updatePrice(); });
    const m = document.getElementById('vcfgMontage');
    if (m) m.addEventListener('change', () => { state.montage = m.checked; save(); updatePrice(); });
  }

  function bindResult() {
    updatePrice(); // заполнить summary + цену
    const nameEl = document.getElementById('vcfgName');
    const phoneEl = document.getElementById('vcfgPhone');
    nameEl.addEventListener('input', () => { state.name = nameEl.value; save(); });
    phoneEl.addEventListener('input', () => {
      phoneEl.value = formatPhone(phoneEl.value);
      state.phone = phoneEl.value; save();
      setErr('vcfgPhoneErr', '', phoneEl);
    });
    phoneEl.addEventListener('focus', () => { if (!phoneEl.value) { phoneEl.value = '+7 ('; state.phone = phoneEl.value; } });
    stepBody.querySelectorAll('[data-contact]').forEach(b => b.addEventListener('click', () => {
      state.contact = b.dataset.contact; markActive(b, '[data-contact]'); save();
    }));
    document.getElementById('vcfgForm').addEventListener('submit', onSubmit);
  }

  /* -------- Валидация ---------------------------------------------------------- */
  function setErr(id, msg, input) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.toggle('show', !!msg); }
    if (input) input.classList.toggle('invalid', !!msg);
  }

  // show=true — показать сообщения об ошибке; всегда возвращает валидность.
  // Значения НЕ переписываем автоматически — пользователь исправляет сам.
  function validateDims(show) {
    const L = D.LIMITS;
    const wEl = document.getElementById('vcfgW');
    const hEl = document.getElementById('vcfgH');
    if (!wEl || !hEl) return true;
    const w = +wEl.value, h = +hEl.value;
    const wBad = wEl.value === '' || isNaN(w) || w < L.width.min || w > L.width.max;
    const hBad = hEl.value === '' || isNaN(h) || h < L.height.min || h > L.height.max;
    setErr('vcfgWErr', (show && wBad) ? `Ширина: от ${L.width.min} до ${L.width.max} см` : '', wEl);
    setErr('vcfgHErr', (show && hBad) ? `Высота: от ${L.height.min} до ${L.height.max} см` : '', hEl);
    return !wBad && !hBad;
  }

  function validateStep(step) {
    if (step === 2) {
      const ok = validateDims(true);
      if (!ok) {
        const first = document.getElementById('vcfgW').classList.contains('invalid')
          ? document.getElementById('vcfgW') : document.getElementById('vcfgH');
        if (first) first.focus();
      }
      return ok;
    }
    return true;
  }

  /* -------- Телефон ------------------------------------------------------------ */
  function formatPhone(value) {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    return out;
  }

  /* -------- Текст заявки / WhatsApp -------------------------------------------- */
  function leadFields() {
    const p = calcPrice();
    const sys = p.sys, mat = p.mat;
    const pal = D.getPalette(sys.id, state.material);
    const color = pal.find(c => c.id === state.color) || pal[0];
    const hw = D.HARDWARE_COLORS.find(c => c.id === state.hardware) || D.HARDWARE_COLORS[0];
    const opts = [];
    if (state.guides && sys.guides) opts.push('направляющие');
    if (state.montage) opts.push('монтаж под ключ');
    return {
      'Система': sys.name,
      'Размеры': `${p.w}×${p.h} см (${p.area.toFixed(2)} м²)`,
      'Количество': `${p.qty} шт`,
      'Область': scopeName(state.scope),
      'Установка': labelFor(D.INSTALLS, state.install),
      'Материал': mat.name,
      'Цвет': color.name,
      'Фурнитура': hw.name,
      'Сторона': state.side === 'left' ? 'слева' : 'справа',
      'Управление': labelFor(D.CONTROLS, state.control),
      'Доп. опции': opts.length ? opts.join(', ') : '—',
      'Предв. стоимость': money(p.total) + ' ₽',
      'Способ связи': { call: 'звонок', whatsapp: 'WhatsApp', telegram: 'Telegram' }[state.contact],
      'Имя': state.name || '—',
      'Телефон': state.phone
    };
  }

  function onSubmit(e) {
    e.preventDefault();
    const nameEl = document.getElementById('vcfgName');
    const phoneEl = document.getElementById('vcfgPhone');
    let ok = true;
    if (!nameEl.value.trim()) { setErr('vcfgNameErr', 'Укажите, как к вам обращаться', nameEl); ok = false; }
    else setErr('vcfgNameErr', '', nameEl);
    const digits = phoneEl.value.replace(/\D/g, '');
    if (digits.length < 11) { setErr('vcfgPhoneErr', 'Укажите корректный номер телефона', phoneEl); ok = false; }
    else setErr('vcfgPhoneErr', '', phoneEl);
    if (!ok) { (nameEl.classList.contains('invalid') ? nameEl : phoneEl).focus(); return; }

    state.name = nameEl.value.trim();
    state.phone = phoneEl.value.trim();
    save();

    const fields = leadFields();
    // 1) Cloudflare Worker (если задан), 2) прямой Telegram (window.sendLead), 3) WhatsApp-фолбэк
    const endpoint = window.VELORA_LEAD_ENDPOINT;
    if (endpoint) {
      fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'Конфигуратор', fields })
      }).catch(() => { /* фолбэк — кнопка WhatsApp в success */ });
    } else if (typeof window.sendLead === 'function') {
      try { window.sendLead('Конфигуратор', fields); } catch (err) { /* см. WhatsApp */ }
    }
    showSuccess(fields);
  }

  function buildWa() {
    const f = leadFields();
    let t = 'Здравствуйте! Хочу заказать жалюзи Velora.\n';
    for (const k in f) { if (k === 'Способ связи') continue; t += `${k}: ${f[k]}\n`; }
    return `https://wa.me/${PHONE}?text=${encodeURIComponent(t)}`;
  }

  function showSuccess(fields) {
    const form = document.getElementById('vcfgForm');
    const success = document.getElementById('vcfgSuccess');
    const recap = document.getElementById('vcfgSuccessRecap');
    const wa = document.getElementById('vcfgWaLink');
    if (form) form.hidden = true;
    if (recap) {
      recap.innerHTML = [
        ['Система', fields['Система']],
        ['Размеры', fields['Размеры']],
        ['Материал', fields['Материал']],
        ['Цвет', fields['Цвет']],
        ['Управление', fields['Управление']],
        ['Предв. стоимость', fields['Предв. стоимость']]
      ].map(r => `<div class="vcfg-srow"><span>${r[0]}</span><span>${esc(r[1])}</span></div>`).join('');
    }
    if (wa) wa.href = buildWa();
    if (success) { success.hidden = false; success.setAttribute('tabindex', '-1'); success.focus(); }
    if (mbNext) { mbNext.textContent = 'Заявка отправлена ✓'; mbNext.disabled = true; }
  }

  /* -------- Модальное окно «Как измерить?» ------------------------------------ */
  const modal = document.getElementById('vcfgModal');
  let lastFocused = null;
  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('vcfg-modal-open');
    const c = modal.querySelector('.vcfg-modal-close');
    if (c) c.focus();
    document.addEventListener('keydown', modalKey);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('vcfg-modal-open');
    document.removeEventListener('keydown', modalKey);
    if (lastFocused) lastFocused.focus();
  }
  function modalKey(e) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      const f = modal.querySelectorAll('button, a, [tabindex]');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  if (modal) {
    modal.addEventListener('click', e => { if (e.target === modal || e.target.hasAttribute('data-close')) closeModal(); });
  }

  /* -------- Панель визуализации: кнопки и ползунок ----------------------------- */
  function setOpen(v) {
    state.open = clamp(v, 0, 1);
    if (openRange) openRange.value = Math.round(state.open * 100);
    blind.style.setProperty('--open', state.open.toFixed(3));
    save();
  }
  if (openRange) {
    openRange.value = Math.round(state.open * 100);
    openRange.addEventListener('input', () => setOpen(+openRange.value / 100));
  }
  root.querySelectorAll('[data-viz]').forEach(btn => btn.addEventListener('click', () => {
    const a = btn.dataset.viz;
    if (a === 'lighter') { state.tone = clamp(state.tone + 1, -6, 6); updateVisual(); save(); }
    if (a === 'darker') { state.tone = clamp(state.tone - 1, -6, 6); updateVisual(); save(); }
    if (a === 'toggle') { setOpen(state.open > 0.5 ? 0 : 1); }
    if (a === 'reset') { resetAll(); }
  }));

  function resetAll() {
    state = defaultState();
    maxReached = 1;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
    builtSystem = null;
    if (openRange) openRange.value = Math.round(state.open * 100);
    renderStep();
  }

  /* -------- Навигация ---------------------------------------------------------- */
  backBtn.addEventListener('click', () => gotoStep(state.step - 1, { scroll: false }));
  nextBtn.addEventListener('click', () => {
    if (state.step === TOTAL_STEPS) { window.scrollTo({ top: root.offsetTop - 70, behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
    gotoStep(state.step + 1, { validate: true, scroll: false });
  });
  if (mbNext) mbNext.addEventListener('click', () => {
    if (state.step === TOTAL_STEPS) { const f = document.getElementById('vcfgForm'); if (f) f.requestSubmit ? f.requestSubmit() : f.querySelector('.vcfg-submit').click(); return; }
    gotoStep(state.step + 1, { validate: true, scroll: true });
  });
  dotsWrap.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (b && !b.disabled) gotoStep(+b.dataset.step, { scroll: false });
  });

  /* -------- Старт -------------------------------------------------------------- */
  renderStep();
})();
