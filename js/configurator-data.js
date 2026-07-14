/* ============================================================================
   VELORA — ДАННЫЕ КОНФИГУРАТОРА  (коммерческая часть)
   ----------------------------------------------------------------------------
   Визуализация (слои изображений, поворот ламелей, совпадение полос и т.д.)
   живёт в отдельном движке: assets/configurator/visual-engine.js
   (там же — названия материалов/режимов для показа на визуализации).

   ЗДЕСЬ хранится всё, что нужно для КОММЕРЧЕСКОГО расчёта и заявки:
   • цены систем и коэффициенты материалов;
   • совместимость установки и управления;
   • цвета фурнитуры, стороны, опции.

   Наборы материалов согласованы с библиотекой (id совпадают с движком),
   поэтому выбранный материал сразу отражается на реалистичной визуализации.

   БЫСТРЫЕ ОТВЕТЫ:
   • Цены систем        → SYSTEMS[].pricePerM2 / minItemPrice / priceFrom
   • Коэффициент ткани  → SYSTEMS[].materials[].coef
   • Названия материалов→ SYSTEMS[].materials[].name (дублируют движок; можно править)
   • Установка/управление → INSTALLS / CONTROLS
   • Фурнитура          → HARDWARE_COLORS
   ========================================================================== */

window.VELORA_CFG = (function () {

  // Ценовые категории — только подпись на карточке материала.
  const CAT = { base: 'Базовая', std: 'Стандарт', prem: 'Премиум' };

  /* -------- Системы -----------------------------------------------------------
     id            — совпадает с id системы в движке визуализации
     unit          — 'm2' (за м²) | 'item' (поштучно, есть минимальная цена)
     pricePerM2    — базовая цена за м²
     minArea       — минимальная расчётная площадь, м²
     minItemPrice  — минимальная цена изделия (для unit:'item')
     priceFrom     — «от …» на карточке
     installs      — совместимые способы установки (ключи INSTALLS)
     controls      — совместимые типы управления (ключи CONTROLS)
     guides        — можно ли добавить направляющие
     defMat        — материал по умолчанию (id из materials)
     materials     — согласованный с движком набор {id,name,transp,coef,cat,hex,info}
                     hex — цвет образца-кружка в карточке материала.                */
  const SYSTEMS = [
    {
      id: 'roller', name: 'Рулонные', thumb: 'assets/configurator/thumbnails/roller.webp',
      desc: 'Компактное полотно для любых окон и интерьеров.',
      unit: 'item', pricePerM2: 1700, minArea: 0.5, minItemPrice: 1700, priceFrom: 1700,
      installs: ['sash', 'recess', 'wall', 'ceiling'], controls: ['chain', 'manual', 'motor'], guides: true,
      defMat: 'dimout',
      materials: [
        { id: 'milk',     name: 'Светопроницаемый молочный', transp: 'Высокая',  coef: 1.00, cat: CAT.base, hex: '#EFE7D6', info: 'Мягко рассеивает свет, сохраняет вид из окна.' },
        { id: 'dimout',   name: 'Бежевый Dimout',            transp: 'Затемнение', coef: 1.15, cat: CAT.std,  hex: '#D8C4A0', info: 'Приглушает свет, не пропускает прямые лучи.' },
        { id: 'blackout', name: 'Графитовый Blackout',       transp: 'Полное затемнение', coef: 1.30, cat: CAT.prem, hex: '#4A463F', info: 'Практически не пропускает свет — для спальни и медиа-комнат.' }
      ]
    },
    {
      id: 'cassette', name: 'Кассетные', thumb: 'assets/configurator/thumbnails/cassette.webp',
      desc: 'Закрытая кассета и боковые направляющие — без просветов.',
      unit: 'item', pricePerM2: 2500, minArea: 0.5, minItemPrice: 2500, priceFrom: 2500,
      installs: ['sash', 'recess'], controls: ['chain', 'motor'], guides: false,
      defMat: 'dimout',
      materials: [
        { id: 'milk',     name: 'Светопроницаемый молочный', transp: 'Высокая',  coef: 1.00, cat: CAT.base, hex: '#EFE7D6', info: 'Мягко рассеивает свет, сохраняет вид из окна.' },
        { id: 'dimout',   name: 'Бежевый Dimout',            transp: 'Затемнение', coef: 1.15, cat: CAT.std,  hex: '#D8C4A0', info: 'Приглушает свет, не пропускает прямые лучи.' },
        { id: 'blackout', name: 'Графитовый Blackout',       transp: 'Полное затемнение', coef: 1.30, cat: CAT.prem, hex: '#4A463F', info: 'Плотное полотно с боковыми направляющими.' }
      ]
    },
    {
      id: 'daynight', name: 'День-Ночь', thumb: 'assets/configurator/thumbnails/daynight.webp',
      desc: 'Прозрачные и плотные полосы — свет под настроение.',
      unit: 'item', pricePerM2: 3500, minArea: 0.5, minItemPrice: 3500, priceFrom: 3500,
      installs: ['sash', 'recess', 'wall', 'ceiling'], controls: ['chain', 'motor'], guides: true,
      defMat: 'beige',
      materials: [
        { id: 'ivory',    name: 'Молочный',         transp: 'Регулируемая', coef: 1.00, cat: CAT.base, hex: '#EDE4D2', info: 'Светлая «зебра», максимум света.' },
        { id: 'beige',    name: 'Тёплый бежевый',   transp: 'Регулируемая', coef: 1.05, cat: CAT.std,  hex: '#D3BC93', info: 'Тёплые полосы, мягкий рассеянный свет.' },
        { id: 'graphite', name: 'Графитовый',       transp: 'Регулируемая', coef: 1.20, cat: CAT.prem, hex: '#45413B', info: 'Контрастные полосы, глубокое затемнение.' }
      ]
    },
    {
      id: 'horizontal', name: 'Горизонтальные', thumb: 'assets/configurator/thumbnails/horizontal.webp',
      desc: 'Алюминиевые ламели, точная регулировка света.',
      unit: 'm2', pricePerM2: 1500, minArea: 0.4, minItemPrice: 0, priceFrom: 1500,
      installs: ['sash', 'recess', 'wall'], controls: ['manual', 'chain'], guides: false,
      defMat: 'white',
      materials: [
        { id: 'white',      name: 'Белый',           transp: 'Регулируется ламелями', coef: 1.00, cat: CAT.base, hex: '#EFEDE8', info: 'Классический белый алюминий 16/25 мм.' },
        { id: 'silver',     name: 'Светлое серебро', transp: 'Регулируется ламелями', coef: 1.10, cat: CAT.std,  hex: '#C7C9CC', info: 'Матовое серебро, нейтральный металлик.' },
        { id: 'anthracite', name: 'Антрацит',        transp: 'Регулируется ламелями', coef: 1.15, cat: CAT.prem, hex: '#33322F', info: 'Тёмные ламели для строгих интерьеров.' }
      ]
    },
    {
      id: 'vertical', name: 'Вертикальные', thumb: 'assets/configurator/thumbnails/vertical.webp',
      desc: 'Для панорамных окон, балконов и офисов.',
      unit: 'm2', pricePerM2: 1500, minArea: 0.6, minItemPrice: 0, priceFrom: 1500,
      installs: ['recess', 'wall', 'ceiling'], controls: ['chain'], guides: false,
      defMat: 'ivory',
      materials: [
        { id: 'ivory',    name: 'Молочный текстиль', transp: 'Средняя', coef: 1.00, cat: CAT.base, hex: '#EDE4D2', info: 'Тканевые ламели, мягкий свет.' },
        { id: 'greige',   name: 'Серо-бежевый',      transp: 'Средняя', coef: 1.05, cat: CAT.std,  hex: '#B7AC99', info: 'Нейтральный серо-бежевый текстиль.' },
        { id: 'graphite', name: 'Графитовый',        transp: 'Низкая',  coef: 1.15, cat: CAT.prem, hex: '#45413B', info: 'Плотные тёмные ламели для офисов.' }
      ]
    },
    {
      id: 'pleated', name: 'Плиссе', thumb: 'assets/configurator/thumbnails/pleated.webp',
      desc: 'Мягкие складки для мансард и нестандартных окон.',
      unit: 'm2', pricePerM2: 6000, minArea: 0.3, minItemPrice: 0, priceFrom: 6000,
      installs: ['sash', 'recess'], controls: ['manual', 'chain'], guides: true,
      defMat: 'ivory',
      materials: [
        { id: 'ivory',    name: 'Молочный',           transp: 'Высокая',   coef: 1.00, cat: CAT.base, hex: '#EDE4D2', info: 'Светлая ткань-плиссе, рассеивает свет.' },
        { id: 'beige',    name: 'Бежевый Dimout',     transp: 'Затемнение', coef: 1.15, cat: CAT.std,  hex: '#D3BC93', info: 'Тёплый беж с затемнением.' },
        { id: 'graphite', name: 'Графитовый Blackout', transp: 'Полное затемнение', coef: 1.30, cat: CAT.prem, hex: '#45413B', info: 'Плотное плиссе для сна и мансард.' }
      ]
    },
    {
      id: 'roman', name: 'Римские', thumb: 'assets/configurator/thumbnails/roman.webp',
      desc: 'Крупные горизонтальные складки, мягкий свет.',
      unit: 'm2', pricePerM2: 8000, minArea: 0.4, minItemPrice: 0, priceFrom: 8000,
      installs: ['recess', 'wall', 'ceiling'], controls: ['chain', 'manual', 'motor'], guides: false,
      defMat: 'ivory',
      materials: [
        { id: 'ivory',    name: 'Молочный лён',       transp: 'Высокая',   coef: 1.00, cat: CAT.base, hex: '#EDE4D2', info: 'Натуральный светлый лён.' },
        { id: 'beige',    name: 'Бежевый Dimout',     transp: 'Затемнение', coef: 1.15, cat: CAT.std,  hex: '#D3BC93', info: 'Плотный беж, мягкое затемнение.' },
        { id: 'graphite', name: 'Графитовый Blackout', transp: 'Полное затемнение', coef: 1.30, cat: CAT.prem, hex: '#45413B', info: 'Тёмная ткань для полного затемнения.' }
      ]
    },
    {
      id: 'wood', name: 'Деревянные', thumb: 'assets/configurator/thumbnails/wood.webp',
      desc: 'Широкие ламели из массива, тёплая фактура.',
      unit: 'm2', pricePerM2: 10000, minArea: 0.5, minItemPrice: 0, priceFrom: 10000,
      installs: ['recess', 'wall', 'ceiling'], controls: ['manual', 'chain', 'motor'], guides: false,
      defMat: 'oak',
      materials: [
        { id: 'oak',    name: 'Светлый дуб',  transp: 'Регулируется ламелями', coef: 1.00, cat: CAT.prem,  hex: '#C79A5B', info: 'Тёплый светлый дуб, ламели 50 мм.' },
        { id: 'walnut', name: 'Орех',         transp: 'Регулируется ламелями', coef: 1.15, cat: CAT.prem,  hex: '#7A4E2C', info: 'Насыщенный орех, благородная фактура.' },
        { id: 'wenge',  name: 'Тёмный венге', transp: 'Регулируется ламелями', coef: 1.25, cat: CAT.prem,  hex: '#3B2B20', info: 'Глубокий тёмный оттенок.' }
      ]
    }
  ];

  /* -------- Способы установки — надбавка к цене одного изделия ----------------- */
  const INSTALLS = {
    sash:    { id: 'sash',    name: 'На створку', price: 0,   note: 'Крепление на раму без сверления.' },
    recess:  { id: 'recess',  name: 'В проём',    price: 0,   note: 'Внутри оконного проёма.' },
    wall:    { id: 'wall',    name: 'На стену',   price: 500, note: 'Над проёмом, с запасом по краям.' },
    ceiling: { id: 'ceiling', name: 'На потолок', price: 900, note: 'Для панорамных окон и ниш.' }
  };

  /* -------- Типы управления --------------------------------------------------- */
  const CONTROLS = {
    manual: { id: 'manual', name: 'Ручное',        price: 0,    note: 'Управление рукой или штоком.' },
    chain:  { id: 'chain',  name: 'Цепочное',      price: 0,    note: 'Пластиковая или металлическая цепочка.' },
    motor:  { id: 'motor',  name: 'Электропривод', price: 9000, note: 'Пульт ДУ, совместимо с умным домом.' }
  };

  const GUIDE_PRICE = 800; // направляющие, надбавка на изделие

  const SIDES = [
    { id: 'left',  name: 'Слева' },
    { id: 'right', name: 'Справа' }
  ];

  const HARDWARE_COLORS = [
    { id: 'white',      name: 'Белая',        hex: '#EDEBE6' },
    { id: 'brown',      name: 'Коричневая',   hex: '#5A4632' },
    { id: 'anthracite', name: 'Антрацитовая', hex: '#33322F' }
  ];

  const LIMITS = {
    width:  { min: 20, max: 600, def: 120 },
    height: { min: 20, max: 400, def: 150 },
    qty:    { min: 1,  max: 20,  def: 1 }
  };

  function getSystem(id) { return SYSTEMS.find(s => s.id === id) || SYSTEMS[0]; }
  function getMaterials(systemId) { return getSystem(systemId).materials; }
  function getMaterial(systemId, matId) {
    const list = getMaterials(systemId);
    return list.find(m => m.id === matId) || list.find(m => m.id === getSystem(systemId).defMat) || list[0];
  }

  return {
    SYSTEMS, INSTALLS, CONTROLS, SIDES, HARDWARE_COLORS, LIMITS, GUIDE_PRICE,
    getSystem, getMaterials, getMaterial
  };
})();
