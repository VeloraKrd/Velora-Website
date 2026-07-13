/* ============================================================================
   VELORA — ДАННЫЕ КОНФИГУРАТОРА
   ----------------------------------------------------------------------------
   ВСЁ, что связано с ценами, материалами, цветами и совместимостью, находится
   ЗДЕСЬ. Правьте только этот файл — логика (configurator.js) трогать не нужно.

   БЫСТРЫЕ ОТВЕТЫ:
   • Где менять цены?            → в массиве SYSTEMS (pricePerM2, minItemPrice,
                                    priceFrom) и в OPTIONS (installs / controls /
                                    guidePrice).
   • Где менять материалы?       → в MATERIAL_SETS (coef — коэффициент цены,
                                    alpha — прозрачность на визуализации).
   • Где менять цвета?           → в PALETTES (цвет материала) и HARDWARE_COLORS
                                    (цвет фурнитуры).
   • Как считается цена?         → см. функцию calcPrice в configurator.js
                                    (формула вынесена, но все числа берутся отсюда).

   Цены — ПРЕДВАРИТЕЛЬНЫЕ базовые значения, перенесённые со старого калькулятора
   сайта. Их специально держим простыми для последующего редактирования.
   ========================================================================== */

window.VELORA_CFG = (function () {

  /* -------- Наборы материалов -------------------------------------------------
     coef  — множитель к базовой цене за м²
     alpha — «светопроницаемость» для визуализации (0 = не пропускает свет,
             1 = полностью прозрачный). На цену не влияет.
     cat   — ценовая категория (для карточки)
     transp — текст степени светопроницаемости
     info  — короткая подсказка (tooltip)                                       */
  const MATERIAL_SETS = {
    // Рулонные, кассетные, плиссе, римские
    standard: [
      { id: 'light',    name: 'Светопроницаемый', transp: 'Высокая',           coef: 1.00, cat: 'Базовая',  alpha: 0.55, info: 'Мягко рассеивает свет и сохраняет вид из окна.' },
      { id: 'dimout',   name: 'Dimout',           transp: 'Частичное затемнение', coef: 1.15, cat: 'Стандарт', alpha: 0.28, info: 'Приглушает свет, не пропускает прямые лучи.' },
      { id: 'blackout', name: 'Blackout',         transp: 'Полное затемнение',  coef: 1.30, cat: 'Премиум',  alpha: 0.04, info: 'Практически не пропускает свет — для спальни и медиа-комнат.' },
      { id: 'texture',  name: 'Фактурный',        transp: 'Средняя',           coef: 1.25, cat: 'Премиум',  alpha: 0.24, info: 'Выраженная фактура ткани, декоративный эффект.' }
    ],
    // День-Ночь — отдельный набор
    daynight: [
      { id: 'zebra-classic',  name: 'Зебра классик',  transp: 'Регулируемая',      coef: 1.00, cat: 'Базовая',  alpha: 0.42, info: 'Чередование прозрачных и плотных полос.' },
      { id: 'zebra-metallic', name: 'Зебра металлик', transp: 'Регулируемая',      coef: 1.20, cat: 'Стандарт', alpha: 0.30, info: 'Полосы с металлизированным напылением.' },
      { id: 'zebra-blackout', name: 'Зебра блэкаут',  transp: 'Плотное затемнение', coef: 1.35, cat: 'Премиум',  alpha: 0.08, info: 'Плотные полосы для сильного затемнения.' },
      { id: 'zebra-texture',  name: 'Зебра фактура',  transp: 'Регулируемая',      coef: 1.25, cat: 'Премиум',  alpha: 0.26, info: 'Фактурные полосы «день-ночь».' }
    ],
    // Горизонтальные
    aluwood: [
      { id: 'alu',      name: 'Алюминий',          transp: 'Регулируется ламелями', coef: 1.00, cat: 'Базовая', alpha: 0.02, info: 'Влагостойкие алюминиевые ламели 16 / 25 мм.' },
      { id: 'woodlike', name: 'Дерево / имитация', transp: 'Регулируется ламелями', coef: 1.40, cat: 'Премиум', alpha: 0.00, info: 'Тёплая фактура дерева или его имитации.' }
    ],
    // Вертикальные
    verticalmat: [
      { id: 'fabric',  name: 'Ткань',    transp: 'Средняя', coef: 1.00, cat: 'Базовая', alpha: 0.35, info: 'Тканевые ламели, широкая палитра оттенков.' },
      { id: 'plastic', name: 'Пластик',  transp: 'Низкая',  coef: 0.90, cat: 'Базовая', alpha: 0.12, info: 'Практичный ПВХ, легко моется.' },
      { id: 'alu',     name: 'Алюминий', transp: 'Низкая',  coef: 1.30, cat: 'Премиум', alpha: 0.02, info: 'Металлические ламели для офисов.' }
    ],
    // Деревянные
    wood: [
      { id: 'solid25', name: 'Массив 25 мм',     transp: 'Регулируется ламелями', coef: 1.00, cat: 'Премиум',  alpha: 0.00, info: 'Ламели из массива липы 25 мм.' },
      { id: 'solid50', name: 'Массив 50 мм',     transp: 'Регулируется ламелями', coef: 1.25, cat: 'Премиум',  alpha: 0.00, info: 'Широкие ламели 50 мм, выразительная фактура.' },
      { id: 'faux',    name: 'Имитация дерева',  transp: 'Регулируется ламелями', coef: 0.70, cat: 'Стандарт', alpha: 0.00, info: 'Влагостойкая имитация дерева.' }
    ]
  };

  /* -------- Палитры цвета материала ------------------------------------------
     Тканевая палитра — для тканей/ПВХ; деревянная — для дерева и имитации.     */
  const PALETTES = {
    fabric: [
      { id: 'white',      name: 'Белый',            hex: '#F3EFE7' },
      { id: 'ivory',      name: 'Слоновая кость',   hex: '#E7DCC6' },
      { id: 'beige',      name: 'Бежевый',          hex: '#D8C4A0' },
      { id: 'sand',       name: 'Песочный',         hex: '#C9AE83' },
      { id: 'taupe',      name: 'Тёмный беж',       hex: '#A98C64' },
      { id: 'olive',      name: 'Олива',            hex: '#8CA07A' },
      { id: 'terra',      name: 'Терракота',        hex: '#B5764F' },
      { id: 'blue',       name: 'Пыльно-синий',     hex: '#6E7E8C' },
      { id: 'graphite',   name: 'Графит',           hex: '#4A463F' },
      { id: 'anthracite', name: 'Антрацит',         hex: '#2C2A27' }
    ],
    wood: [
      { id: 'natural',  name: 'Натуральный', hex: '#C79A5B' },
      { id: 'oak',      name: 'Дуб',         hex: '#B07C43' },
      { id: 'walnut',   name: 'Орех',        hex: '#7A4E2C' },
      { id: 'wenge',    name: 'Венге',       hex: '#3B2B20' },
      { id: 'bleached', name: 'Белёный',     hex: '#E6DAC4' },
      { id: 'graphite', name: 'Графит',      hex: '#413A34' }
    ]
  };

  /* -------- Цвет фурнитуры (кассеты, направляющих, механизма) ---------------- */
  const HARDWARE_COLORS = [
    { id: 'white',      name: 'Белая',        hex: '#EDEBE6' },
    { id: 'brown',      name: 'Коричневая',   hex: '#5A4632' },
    { id: 'anthracite', name: 'Антрацитовая', hex: '#33322F' }
  ];

  /* -------- Способы установки (совместимость задаётся в SYSTEMS) --------------
     price — надбавка к стоимости одного изделия                                */
  const INSTALLS = {
    sash:    { id: 'sash',    name: 'На створку', price: 0,   note: 'Крепление на раму без сверления.' },
    recess:  { id: 'recess',  name: 'В проём',    price: 0,   note: 'Внутри оконного проёма.' },
    wall:    { id: 'wall',    name: 'На стену',   price: 500, note: 'Над проёмом, с запасом по краям.' },
    ceiling: { id: 'ceiling', name: 'На потолок', price: 900, note: 'Для панорамных окон и ниш.' }
  };

  /* -------- Типы управления (совместимость задаётся в SYSTEMS) --------------- */
  const CONTROLS = {
    manual: { id: 'manual', name: 'Ручное',        price: 0,    note: 'Управление рукой или штоком.' },
    chain:  { id: 'chain',  name: 'Цепочное',      price: 0,    note: 'Пластиковая или металлическая цепочка.' },
    motor:  { id: 'motor',  name: 'Электропривод', price: 9000, note: 'Пульт ДУ, совместимо с умным домом.' }
  };

  /* -------- Направляющие (боковые) — доступность в SYSTEMS.guides ------------- */
  const GUIDE_PRICE = 800; // надбавка за комплект направляющих на изделие

  /* -------- Стороны управления ----------------------------------------------- */
  const SIDES = [
    { id: 'left',  name: 'Слева' },
    { id: 'right', name: 'Справа' }
  ];

  /* -------- Системы (порядок = порядок карточек на шаге 1) --------------------
     unit          — 'm2' (за м²) | 'item' (поштучно, есть минимальная цена)
     pricePerM2    — базовая цена за м²
     minArea       — минимальная расчётная площадь, м²
     minItemPrice  — минимальная цена одного изделия (для unit:'item')
     priceFrom     — что показывать как «от …» на карточке
     installs      — совместимые способы установки
     controls      — совместимые типы управления
     materialSet   — ключ из MATERIAL_SETS
     guides        — можно ли добавить направляющие
     defaultOpen   — стартовая степень открытия визуализации (0..1)             */
  const SYSTEMS = [
    {
      id: 'roller', name: 'Рулонные', vizClass: 'roller', thumb: 'img/roller.svg',
      desc: 'Компактное полотно для любых окон и интерьеров.',
      unit: 'item', pricePerM2: 1700, minArea: 0.5, minItemPrice: 1700, priceFrom: 1700,
      installs: ['sash', 'recess', 'wall', 'ceiling'], controls: ['chain', 'manual', 'motor'],
      materialSet: 'standard', guides: true, defaultOpen: 0.35
    },
    {
      id: 'cassette', name: 'Кассетные', vizClass: 'cassette', thumb: 'img/cassette.svg',
      desc: 'Закрытая кассета и боковые направляющие — без просветов.',
      unit: 'item', pricePerM2: 2500, minArea: 0.5, minItemPrice: 2500, priceFrom: 2500,
      installs: ['sash', 'recess'], controls: ['chain', 'motor'],
      materialSet: 'standard', guides: false, defaultOpen: 0.35
    },
    {
      id: 'daynight', name: 'День-Ночь', vizClass: 'daynight', thumb: 'img/daynight.svg',
      desc: 'Прозрачные и плотные полосы — свет под настроение.',
      unit: 'item', pricePerM2: 3500, minArea: 0.5, minItemPrice: 3500, priceFrom: 3500,
      installs: ['sash', 'recess', 'wall', 'ceiling'], controls: ['chain', 'motor'],
      materialSet: 'daynight', guides: true, defaultOpen: 0.5
    },
    {
      id: 'horizontal', name: 'Горизонтальные', vizClass: 'horizontal', thumb: 'img/horizontal.svg',
      desc: 'Точная регулировка света поворотом ламелей.',
      unit: 'm2', pricePerM2: 1500, minArea: 0.4, minItemPrice: 0, priceFrom: 1500,
      installs: ['sash', 'recess', 'wall'], controls: ['manual', 'chain'],
      materialSet: 'aluwood', guides: false, defaultOpen: 0.5
    },
    {
      id: 'vertical', name: 'Вертикальные', vizClass: 'vertical', thumb: 'img/vertical.svg',
      desc: 'Для панорамных окон, балконов и офисов.',
      unit: 'm2', pricePerM2: 1500, minArea: 0.6, minItemPrice: 0, priceFrom: 1500,
      installs: ['recess', 'wall', 'ceiling'], controls: ['chain'],
      materialSet: 'verticalmat', guides: false, defaultOpen: 0.5
    },
    {
      id: 'pleated', name: 'Плиссе', vizClass: 'pleated', thumb: 'img/pleated.svg',
      desc: 'Мягкие складки для мансард и нестандартных окон.',
      unit: 'm2', pricePerM2: 6000, minArea: 0.3, minItemPrice: 0, priceFrom: 6000,
      installs: ['sash', 'recess'], controls: ['manual', 'chain'],
      materialSet: 'standard', guides: true, defaultOpen: 0.4
    },
    {
      id: 'roman', name: 'Римские', vizClass: 'roman', thumb: 'img/roman.svg',
      desc: 'Крупные горизонтальные складки, мягкий свет.',
      unit: 'm2', pricePerM2: 8000, minArea: 0.4, minItemPrice: 0, priceFrom: 8000,
      installs: ['recess', 'wall', 'ceiling'], controls: ['chain', 'manual', 'motor'],
      materialSet: 'standard', guides: false, defaultOpen: 0.35
    },
    {
      id: 'wood', name: 'Деревянные', vizClass: 'wood', thumb: 'img/wood.svg',
      desc: 'Широкие ламели и декоративные ленты из массива.',
      unit: 'm2', pricePerM2: 10000, minArea: 0.5, minItemPrice: 0, priceFrom: 10000,
      installs: ['recess', 'wall', 'ceiling'], controls: ['manual', 'chain', 'motor'],
      materialSet: 'wood', guides: false, defaultOpen: 0.5
    }
  ];

  /* -------- Ограничения размеров (валидация шага 2) --------------------------- */
  const LIMITS = {
    width:  { min: 20, max: 600, def: 120 },  // см
    height: { min: 20, max: 400, def: 150 },  // см
    qty:    { min: 1,  max: 20,  def: 1 }
  };

  /* -------- Помощники доступа ------------------------------------------------- */
  function getSystem(id) { return SYSTEMS.find(s => s.id === id) || SYSTEMS[0]; }
  function getMaterials(systemId) {
    const s = getSystem(systemId);
    return MATERIAL_SETS[s.materialSet] || MATERIAL_SETS.standard;
  }
  // Палитра зависит от системы и выбранного материала:
  // деревянные и «дерево/имитация» у горизонтальных → деревянная палитра.
  function getPalette(systemId, materialId) {
    const s = getSystem(systemId);
    if (s.materialSet === 'wood') return PALETTES.wood;
    if (s.materialSet === 'aluwood' && materialId === 'woodlike') return PALETTES.wood;
    return PALETTES.fabric;
  }

  return {
    MATERIAL_SETS, PALETTES, HARDWARE_COLORS, INSTALLS, CONTROLS,
    SIDES, SYSTEMS, LIMITS, GUIDE_PRICE,
    getSystem, getMaterials, getPalette
  };
})();
