/* ============================================================================
   VELORA — SVG-ВИЗУАЛИЗАТОР V2 (адаптер для существующего wizard)
   ----------------------------------------------------------------------------
   Чистая SVG-логика, извлечённая из assets/configurator-v2/engines/*.js.
   НЕ монтирует автономные controls — только строит картинку по состоянию
   wizard. Вся бизнес-логика (шаги, цена, форма) остаётся в configurator.js.

   API:
     VeloraVisualV2.init({ stage, room, darkness, svg, geometryUrl, assetBase })
     VeloraVisualV2.render({ system, device, material, secondary, state })
     VeloraVisualV2.destroy()
     VeloraVisualV2.meta            // метаданные систем (для wizard)

   Геометрия берётся ТОЛЬКО из geometry-v2.json (единый viewBox для фона и SVG).
   ========================================================================== */
window.VeloraVisualV2 = (function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var STATES = [0, 25, 50, 75, 100];

  function E(name, attrs) {
    var el = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function nearest(v) {
    return STATES.reduce(function (best, item) {
      return Math.abs(item - v) < Math.abs(best - v) ? item : best;
    });
  }
  function grad(id, stops) {
    var g = E("linearGradient", { id: id, x1: 0, y1: 0, x2: 0, y2: 1 });
    stops.forEach(function (s) { g.appendChild(E("stop", { offset: s[0], "stop-color": s[1] })); });
    return g;
  }
  function dropShadow(id, dy, sd, color, op) {
    var f = E("filter", { id: id, x: "-20%", y: "-20%", width: "140%", height: "160%" });
    f.appendChild(E("feDropShadow", { dx: 0, dy: dy, stdDeviation: sd, "flood-color": color, "flood-opacity": op }));
    return f;
  }
  function chain(mx2, my1, boxH, gy1, gy2, glassH, scale, offset) {
    var cx = mx2 - offset, cy1 = my1 + boxH * 0.72, cy2 = Math.min(gy2 - 20 * scale, gy1 + glassH * 0.68);
    var g = E("g", { opacity: 0.9 });
    g.appendChild(E("line", { x1: cx, y1: cy1, x2: cx, y2: cy2, stroke: "#ddd9d0", "stroke-width": Math.max(1, scale) }));
    for (var y = cy1; y <= cy2; y += Math.max(5 * scale, 5))
      g.appendChild(E("circle", { cx: cx, cy: y, r: Math.max(1.2 * scale, 1.2), fill: "#ece8df", stroke: "#aaa69e", "stroke-width": Math.max(0.4, scale * 0.4) }));
    return g;
  }
  function sashes(g, fn) { ["left", "center", "right"].forEach(function (key) { fn(key, g.glass[key], g.mount[key]); }); }

  /* ===================== МАТЕРИАЛЫ (из движков) ===================== */
  var ROLLER = {
    milk: { fill: "#e7ddcc", opacity: 0.72, darkness: 0.06 },
    dimout: { fill: "#b99367", opacity: 0.88, darkness: 0.17 },
    blackout: { fill: "#4c4b49", opacity: 0.98, darkness: 0.35 }
  };
  var CASSETTE = {
    milk: { fill: "#e8dfcf", opacity: 0.72, darkness: 0.06 },
    dimout: { fill: "#b99569", opacity: 0.88, darkness: 0.16 },
    blackout: { fill: "#4d4b48", opacity: 0.98, darkness: 0.34 }
  };
  var DN = {
    ivory: { opaque: "#ded4c2", sheer: "#f5f0e7", opaqueOpacity: 0.86, sheerOpacity: 0.20, darkness: { open: 0.06, half: 0.15, closed: 0.25 } },
    beige: { opaque: "#b68d61", sheer: "#ead9c2", opaqueOpacity: 0.92, sheerOpacity: 0.22, darkness: { open: 0.08, half: 0.20, closed: 0.32 } },
    graphite: { opaque: "#535250", sheer: "#aaa8a3", opaqueOpacity: 0.97, sheerOpacity: 0.25, darkness: { open: 0.12, half: 0.28, closed: 0.43 } }
  };
  var DN_SHIFT = { open: 0, half: 0.25, closed: 0.5 };
  var HZ = {
    white: { base: "#e9e9e5", edge: "#aaa9a5", highlight: "#fdfdf9", cord: "#cbc9c3", darkness: { open: 0.05, half: 0.15, closed: 0.27 } },
    silver: { base: "#bfc2c2", edge: "#7e8283", highlight: "#ecefef", cord: "#b9bab8", darkness: { open: 0.07, half: 0.18, closed: 0.31 } },
    anthracite: { base: "#484a4a", edge: "#272828", highlight: "#7b7e7e", cord: "#60615f", darkness: { open: 0.11, half: 0.26, closed: 0.43 } }
  };
  var HZ_FACE = { open: 0.34, half: 0.60, closed: 0.92 };
  var VT = {
    ivory: { base: "#ded7ca", edge: "#aaa294", highlight: "#f4efe5", chain: "#d3cec4", darkness: { open: 0.07, half: 0.17, closed: 0.29 } },
    greige: { base: "#afa596", edge: "#756e64", highlight: "#d9d0c2", chain: "#bbb5ab", darkness: { open: 0.09, half: 0.22, closed: 0.35 } },
    graphite: { base: "#4b4c4a", edge: "#272827", highlight: "#7f817d", chain: "#686965", darkness: { open: 0.13, half: 0.29, closed: 0.45 } }
  };
  var VT_FACE = { open: 0.27, half: 0.56, closed: 0.92 };
  var PL = {
    ivory: { base: "#ddd5c6", dark: "#a59b8d", light: "#f4efe5", cord: "#c7c1b6", darkness: 0.12 },
    beige: { base: "#b49168", dark: "#765c42", light: "#dec5a5", cord: "#a9957c", darkness: 0.25 },
    graphite: { base: "#4c4d4b", dark: "#262725", light: "#7e817c", cord: "#666863", darkness: 0.43 }
  };
  var RM = {
    ivory: { base: "#dcd3c2", shadow: "#998e7e", highlight: "#f3ede2", cord: "#c5beb2", darkness: 0.13 },
    beige: { base: "#b48f66", shadow: "#755a3f", highlight: "#dfc4a1", cord: "#a79178", darkness: 0.27 },
    graphite: { base: "#4c4d4b", shadow: "#262725", highlight: "#7f817d", cord: "#646661", darkness: 0.44 }
  };
  var WD = {
    oak: { base: "#b58250", dark: "#68462c", light: "#dfb67d", grain: "#5d3923", tape: "#7a5a40", cord: "#8b6e50", darkness: { open: 0.08, half: 0.20, closed: 0.34 } },
    walnut: { base: "#754c31", dark: "#3e271b", light: "#ad7a50", grain: "#2f1c14", tape: "#4d3829", cord: "#5e4431", darkness: { open: 0.10, half: 0.25, closed: 0.40 } },
    wenge: { base: "#3c2f28", dark: "#1c1714", light: "#6a5548", grain: "#16110f", tape: "#2c2521", cord: "#3d332d", darkness: { open: 0.13, half: 0.30, closed: 0.47 } }
  };
  var WD_FACE = { open: 0.32, half: 0.60, closed: 0.93 };

  function pick(map, id, fb) { return map[id] || map[fb]; }

  /* ===================== СТРОИТЕЛИ (по одному на систему) ===================== */

  function buildRoller(svg, g, device, material, secondary, pct, scale) {
    var mat = pick(ROLLER, material, "dimout");
    var defs = E("defs");
    defs.appendChild(dropShadow("rlShadow", 3 * scale, 3.2 * scale, "#211d17", 0.3));
    defs.appendChild(grad("rlTube", [["0%", "#fcfbf8"], ["52%", "#deddd8"], ["100%", "#bdbcb7"]]));
    defs.appendChild(grad("rlBar", [["0%", "#f4f3ef"], ["100%", "#c5c4bf"]]));
    svg.appendChild(defs);
    sashes(g, function (key, glass, mount) {
      var gx1 = glass[0], gy1 = glass[1], gx2 = glass[2], gy2 = glass[3], mx1 = mount[0], my1 = mount[1], mx2 = mount[2];
      var glassW = gx2 - gx1, glassH = gy2 - gy1, mountW = mx2 - mx1;
      var tubeH = Math.max(17 * scale, Math.min(24 * scale, glassH * 0.045));
      var tubeInset = Math.max(5 * scale, mountW * 0.025);
      var fabricInset = Math.max(4 * scale, glassW * 0.018);
      var barH = Math.max(7 * scale, glassH * 0.018);
      var bracketW = Math.max(8 * scale, tubeH * 0.46);
      var Gg = E("g", { "data-sash": key });
      Gg.appendChild(E("rect", { x: mx1 + tubeInset, y: my1, width: mountW - tubeInset * 2, height: tubeH, rx: tubeH * 0.48, fill: "url(#rlTube)", stroke: "#aaa9a5", "stroke-width": Math.max(0.8, scale), filter: "url(#rlShadow)" }));
      Gg.appendChild(E("rect", { x: mx1, y: my1 + tubeH * 0.12, width: bracketW, height: tubeH * 0.76, rx: Math.max(2 * scale, bracketW * 0.28), fill: "#efeee9", stroke: "#b5b4af", "stroke-width": Math.max(0.7, scale * 0.8) }));
      Gg.appendChild(E("rect", { x: mx2 - bracketW, y: my1 + tubeH * 0.12, width: bracketW, height: tubeH * 0.76, rx: Math.max(2 * scale, bracketW * 0.28), fill: "#efeee9", stroke: "#b5b4af", "stroke-width": Math.max(0.7, scale * 0.8) }));
      Gg.appendChild(E("rect", { x: mx1 + tubeInset + bracketW * 0.30, y: my1 + tubeH * 0.18, width: mountW - tubeInset * 2 - bracketW * 0.60, height: tubeH * 0.64, rx: tubeH * 0.32, fill: mat.fill, opacity: Math.min(1, mat.opacity + 0.08) }));
      var h = glassH * pct / 100;
      Gg.appendChild(E("rect", { x: gx1 + fabricInset, y: gy1, width: glassW - fabricInset * 2, height: h, rx: Math.max(1.5 * scale, 2), fill: mat.fill, opacity: mat.opacity, filter: "url(#rlShadow)" }));
      Gg.appendChild(E("rect", { x: gx1 + fabricInset, y: gy1 + Math.max(0, h - barH * 0.18), width: glassW - fabricInset * 2, height: barH, rx: barH * 0.35, fill: "url(#rlBar)", stroke: "#aaa9a4", "stroke-width": Math.max(0.7, scale * 0.8) }));
      Gg.appendChild(chain(mx2, my1, tubeH, gy1, gy2, glassH, scale, bracketW * 0.58));
      svg.appendChild(Gg);
    });
    return mat.darkness * pct / 100;
  }

  function buildCassette(svg, g, device, material, secondary, pct, scale) {
    var mat = pick(CASSETTE, material, "dimout");
    var defs = E("defs");
    defs.appendChild(dropShadow("csShadow", 3, 3.5, "#241f18", 0.3));
    defs.appendChild(grad("csBox", [["0%", "#fbfaf7"], ["52%", "#e7e6e1"], ["100%", "#c8c7c3"]]));
    defs.appendChild(grad("csBar", [["0%", "#f7f6f2"], ["100%", "#c7c6c1"]]));
    svg.appendChild(defs);
    sashes(g, function (key, glass, mount) {
      var gx1 = glass[0], gy1 = glass[1], gx2 = glass[2], gy2 = glass[3], mx1 = mount[0], my1 = mount[1], mx2 = mount[2];
      var glassW = gx2 - gx1, glassH = gy2 - gy1, w = mx2 - mx1;
      var bh = Math.max(18 * scale, Math.min(28 * scale, glassH * 0.055));
      var gd = Math.max(4 * scale, glassW * 0.018);
      var barh = Math.max(7 * scale, glassH * 0.018);
      var ins = Math.max(3 * scale, glassW * 0.015);
      var Gg = E("g", { "data-sash": key });
      Gg.appendChild(E("rect", { x: mx1, y: my1, width: w, height: bh, rx: Math.max(6 * scale, bh * 0.32), fill: "url(#csBox)", stroke: "#b4b3af", "stroke-width": Math.max(1, scale), filter: "url(#csShadow)" }));
      Gg.appendChild(E("line", { x1: mx1 + bh * 0.42, y1: my1 + bh - 3 * scale, x2: mx2 - bh * 0.42, y2: my1 + bh - 3 * scale, stroke: "#aeada9", "stroke-width": Math.max(1, scale), opacity: 0.72 }));
      Gg.appendChild(E("rect", { x: gx1 - gd * 0.35, y: gy1, width: gd, height: glassH, rx: gd * 0.35, fill: "#efeee9", stroke: "#b7b6b2", "stroke-width": Math.max(0.7, scale * 0.8) }));
      Gg.appendChild(E("rect", { x: gx2 - gd * 0.65, y: gy1, width: gd, height: glassH, rx: gd * 0.35, fill: "#efeee9", stroke: "#b7b6b2", "stroke-width": Math.max(0.7, scale * 0.8) }));
      var h = glassH * pct / 100;
      Gg.appendChild(E("rect", { x: gx1 + ins, y: gy1, width: glassW - ins * 2, height: Math.max(0, h), rx: Math.max(1.5 * scale, 2), fill: mat.fill, opacity: mat.opacity, filter: "url(#csShadow)" }));
      Gg.appendChild(E("rect", { x: gx1 + ins, y: gy1 + Math.max(0, h - barh * 0.18), width: glassW - ins * 2, height: barh, rx: barh * 0.35, fill: "url(#csBar)", stroke: "#aaa9a4", "stroke-width": Math.max(0.7, scale * 0.8) }));
      Gg.appendChild(chain(mx2, my1, bh, gy1, gy2, glassH, scale, Math.max(5 * scale, w * 0.025)));
      svg.appendChild(Gg);
    });
    return mat.darkness * pct / 100;
  }

  function buildDayNight(svg, g, device, material, secondary, pct, scale) {
    var mat = pick(DN, material, "beige");
    var mode = DN_SHIFT[secondary] != null ? secondary : "half";
    var canvas = g.canvas;
    var period = device === "desktop" ? 48 : 40;
    var opaqueH = period * 0.54, sheerH = period - opaqueH;
    var shiftPx = period * DN_SHIFT[mode];
    var defs = E("defs");
    defs.appendChild(dropShadow("dnShadow", 3, 3.2 * scale, "#211d17", 0.3));
    defs.appendChild(grad("dnBox", [["0%", "#fbfaf7"], ["55%", "#e6e5e0"], ["100%", "#c8c7c2"]]));
    defs.appendChild(grad("dnBar", [["0%", "#f6f5f1"], ["100%", "#c5c4bf"]]));
    var pf = E("pattern", { id: "dnFront", patternUnits: "userSpaceOnUse", x: 0, y: 0, width: canvas.width, height: period, patternTransform: "translate(0 0)" });
    pf.appendChild(E("rect", { x: 0, y: 0, width: canvas.width, height: opaqueH, fill: mat.opaque, "fill-opacity": mat.opaqueOpacity }));
    pf.appendChild(E("rect", { x: 0, y: opaqueH, width: canvas.width, height: sheerH, fill: mat.sheer, "fill-opacity": mat.sheerOpacity }));
    defs.appendChild(pf);
    var pb = E("pattern", { id: "dnBack", patternUnits: "userSpaceOnUse", x: 0, y: 0, width: canvas.width, height: period, patternTransform: "translate(0 " + shiftPx + ")" });
    pb.appendChild(E("rect", { x: 0, y: 0, width: canvas.width, height: opaqueH, fill: mat.opaque, "fill-opacity": mat.opaqueOpacity }));
    pb.appendChild(E("rect", { x: 0, y: opaqueH, width: canvas.width, height: sheerH, fill: mat.sheer, "fill-opacity": mat.sheerOpacity }));
    defs.appendChild(pb);
    svg.appendChild(defs);
    sashes(g, function (key, glass, mount) {
      var gx1 = glass[0], gy1 = glass[1], gx2 = glass[2], gy2 = glass[3], mx1 = mount[0], my1 = mount[1], mx2 = mount[2];
      var glassW = gx2 - gx1, glassH = gy2 - gy1, mountW = mx2 - mx1;
      var boxH = Math.max(19 * scale, Math.min(29 * scale, glassH * 0.057));
      var barH = Math.max(8 * scale, glassH * 0.019);
      var inset = Math.max(3 * scale, glassW * 0.015);
      var Gg = E("g", { "data-sash": key });
      Gg.appendChild(E("rect", { x: mx1, y: my1, width: mountW, height: boxH, rx: Math.max(6 * scale, boxH * 0.32), fill: "url(#dnBox)", stroke: "#b2b1ad", "stroke-width": Math.max(1, scale), filter: "url(#dnShadow)" }));
      Gg.appendChild(E("line", { x1: mx1 + boxH * 0.40, y1: my1 + boxH - 3 * scale, x2: mx2 - boxH * 0.40, y2: my1 + boxH - 3 * scale, stroke: "#aaa9a5", "stroke-width": Math.max(1, scale), opacity: 0.72 }));
      var h = glassH * pct / 100;
      Gg.appendChild(E("rect", { x: gx1 + inset, y: gy1, width: glassW - inset * 2, height: h, fill: "url(#dnBack)", opacity: 0.72, filter: "url(#dnShadow)" }));
      Gg.appendChild(E("rect", { x: gx1 + inset, y: gy1, width: glassW - inset * 2, height: h, fill: "url(#dnFront)", opacity: 0.92 }));
      Gg.appendChild(E("rect", { x: gx1 + inset, y: gy1 + Math.max(0, h - barH * 0.18), width: glassW - inset * 2, height: barH, rx: barH * 0.35, fill: "url(#dnBar)", stroke: "#aaa9a4", "stroke-width": Math.max(0.7, scale * 0.8) }));
      Gg.appendChild(chain(mx2, my1, boxH, gy1, gy2, glassH, scale, Math.max(5 * scale, mountW * 0.025)));
      svg.appendChild(Gg);
    });
    return mat.darkness[mode] * pct / 100;
  }

  function buildHorizontal(svg, g, device, material, secondary, pct, scale) {
    var c = pick(HZ, material, "white");
    var tilt = HZ_FACE[secondary] != null ? secondary : "half";
    var canvas = g.canvas;
    var period = device === "desktop" ? 24 : 20;
    var faceH = period * HZ_FACE[tilt];
    var defs = E("defs");
    defs.appendChild(dropShadow("hzShadow", 2.5 * scale, 2.6 * scale, "#201d19", 0.28));
    defs.appendChild(grad("hzHead", [["0%", "#fafaf7"], ["52%", "#d9d9d5"], ["100%", "#b8b8b4"]]));
    defs.appendChild(grad("hzRail", [["0%", "#f5f5f1"], ["100%", "#bdbdb8"]]));
    var pat = E("pattern", { id: "hzSlat", patternUnits: "userSpaceOnUse", x: 0, y: 0, width: canvas.width, height: period });
    pat.appendChild(E("rect", { x: 0, y: period * 0.18, width: canvas.width, height: period * 0.46, fill: "#1f1d1a", "fill-opacity": 0.16 }));
    pat.appendChild(E("rect", { x: 0, y: 0, width: canvas.width, height: faceH, fill: c.base }));
    pat.appendChild(E("line", { x1: 0, y1: period * 0.10, x2: canvas.width, y2: period * 0.10, stroke: c.highlight, "stroke-opacity": 0.70, "stroke-width": Math.max(0.7, scale) }));
    pat.appendChild(E("line", { x1: 0, y1: faceH, x2: canvas.width, y2: faceH, stroke: c.edge, "stroke-opacity": 0.82, "stroke-width": Math.max(0.7, scale) }));
    defs.appendChild(pat);
    svg.appendChild(defs);
    var stackVisible = 1 - pct / 100;
    sashes(g, function (key, glass, mount) {
      var gx1 = glass[0], gy1 = glass[1], gx2 = glass[2], gy2 = glass[3], mx1 = mount[0], my1 = mount[1], mx2 = mount[2];
      var glassW = gx2 - gx1, glassH = gy2 - gy1, mountW = mx2 - mx1;
      var headH = Math.max(17 * scale, Math.min(24 * scale, glassH * 0.045));
      var inset = Math.max(4 * scale, glassW * 0.018);
      var railH = Math.max(9 * scale, glassH * 0.021);
      var h = glassH * pct / 100;
      var Gg = E("g", { "data-sash": key });
      Gg.appendChild(E("rect", { x: mx1, y: my1, width: mountW, height: headH, rx: Math.max(5 * scale, headH * 0.28), fill: "url(#hzHead)", stroke: "#aaa9a5", "stroke-width": Math.max(0.8, scale), filter: "url(#hzShadow)" }));
      Gg.appendChild(E("rect", { x: gx1 + inset, y: gy1, width: glassW - inset * 2, height: h, fill: "url(#hzSlat)" }));
      [0.30, 0.70].forEach(function (fr) {
        var x = gx1 + inset + (glassW - inset * 2) * fr;
        Gg.appendChild(E("line", { x1: x, y1: gy1, x2: x, y2: gy1 + h, stroke: c.cord, "stroke-width": Math.max(1.1 * scale, 1), opacity: 0.72 }));
      });
      Gg.appendChild(E("rect", { x: gx1 + inset, y: gy1 + Math.max(0, h - railH * 0.14), width: glassW - inset * 2, height: railH, rx: railH * 0.34, fill: "url(#hzRail)", stroke: "#aaa9a4", "stroke-width": Math.max(0.7, scale * 0.8), filter: "url(#hzShadow)" }));
      if (stackVisible > 0.01) {
        var st = E("g", { opacity: stackVisible });
        for (var i = 0; i < 7; i++) st.appendChild(E("rect", { x: gx1 + inset, y: gy1 + i * 3.2 * scale, width: glassW - inset * 2, height: Math.max(3 * scale, 3), rx: Math.max(1.2 * scale, 1), fill: c.base, stroke: c.edge, "stroke-width": Math.max(0.35, scale * 0.35) }));
        Gg.appendChild(st);
      }
      var cordX = mx2 - Math.max(12 * scale, mountW * 0.05), cordY2 = Math.min(gy2 - 22 * scale, gy1 + glassH * 0.68);
      Gg.appendChild(E("line", { x1: cordX, y1: my1 + headH * 0.72, x2: cordX, y2: cordY2, stroke: c.cord, "stroke-width": Math.max(1, scale), opacity: 0.88 }));
      svg.appendChild(Gg);
    });
    return c.darkness[tilt] * pct / 100;
  }

  function buildVertical(svg, g, device, material, secondary, pct, scale) {
    var mat = pick(VT, material, "ivory");
    var tilt = VT_FACE[secondary] != null ? secondary : "half";
    var canvas = g.canvas;
    var pitch = device === "desktop" ? 53 : 43;
    var faceW = pitch * VT_FACE[tilt];
    var defs = E("defs");
    defs.appendChild(dropShadow("vtShadow", 2 * scale, 2.8 * scale, "#211d17", 0.28));
    defs.appendChild(grad("vtTrack", [["0%", "#fbfaf7"], ["52%", "#deddd8"], ["100%", "#bbb9b4"]]));
    var pat = E("pattern", { id: "vtSlat", patternUnits: "userSpaceOnUse", x: 0, y: 0, width: pitch, height: canvas.height });
    pat.appendChild(E("rect", { x: 0, y: 0, width: faceW, height: canvas.height, rx: Math.max(2 * scale, 2), fill: mat.base, filter: "url(#vtShadow)" }));
    pat.appendChild(E("line", { x1: pitch * 0.12, y1: 0, x2: pitch * 0.12, y2: canvas.height, stroke: mat.highlight, "stroke-opacity": 0.58, "stroke-width": Math.max(0.7, scale) }));
    pat.appendChild(E("line", { x1: faceW, y1: 0, x2: faceW, y2: canvas.height, stroke: mat.edge, "stroke-opacity": 0.78, "stroke-width": Math.max(0.7, scale) }));
    defs.appendChild(pat);
    svg.appendChild(defs);
    var o = g.fullOpening, ox1 = o[0], oy1 = o[1], ox2 = o[2], oy2 = o[3];
    var openingW = ox2 - ox1, openingH = oy2 - oy1;
    var trackY = oy1 - Math.max(17 * scale, openingH * 0.035);
    var trackH = Math.max(20 * scale, openingH * 0.045);
    var fieldY1 = trackY + trackH - Math.max(2 * scale, 2);
    var fieldH = oy2 - fieldY1;
    var visibleW = openingW * pct / 100;
    var visibleEdge = ox1 + visibleW;
    svg.appendChild(E("rect", { x: ox1, y: trackY, width: openingW, height: trackH, rx: Math.max(6 * scale, trackH * 0.28), fill: "url(#vtTrack)", stroke: "#aaa9a5", "stroke-width": Math.max(0.8, scale), filter: "url(#vtShadow)" }));
    svg.appendChild(E("rect", { x: ox1, y: fieldY1, width: visibleW, height: fieldH, fill: "url(#vtSlat)" }));
    var carriers = E("g", {});
    for (var x = ox1; x <= ox2; x += pitch) {
      if (x > visibleEdge) continue;
      carriers.appendChild(E("rect", { x: x + pitch * 0.10, y: trackY + trackH - 2 * scale, width: Math.max(4 * scale, pitch * 0.10), height: Math.max(7 * scale, trackH * 0.28), rx: Math.max(1.5 * scale, 1.5), fill: "#efeee9", stroke: "#aaa9a5", "stroke-width": Math.max(0.5, scale * 0.5) }));
    }
    svg.appendChild(carriers);
    var beads = E("g", {});
    var chainY = oy2 - Math.max(9 * scale, 9);
    for (var bx = ox1 + pitch * 0.18; bx <= ox2; bx += pitch) {
      if (bx > visibleEdge) continue;
      beads.appendChild(E("circle", { cx: bx, cy: chainY, r: Math.max(1.4 * scale, 1.4), fill: mat.chain, stroke: "#aaa69e", "stroke-width": Math.max(0.35, scale * 0.35) }));
    }
    svg.appendChild(beads);
    var stackVisible = 1 - pct / 100;
    if (stackVisible > 0.01) {
      var st = E("g", { opacity: stackVisible });
      for (var i = 0; i < 10; i++) st.appendChild(E("rect", { x: ox2 - (i + 1) * Math.max(4 * scale, 4), y: fieldY1, width: Math.max(5 * scale, 5), height: fieldH, rx: Math.max(1.5 * scale, 1.5), fill: mat.base, stroke: mat.edge, "stroke-width": Math.max(0.35, scale * 0.35) }));
      svg.appendChild(st);
    }
    var cordX = ox2 - Math.max(15 * scale, openingW * 0.018), cordY1 = trackY + trackH * 0.78, cordY2 = Math.min(oy2 - 28 * scale, fieldY1 + fieldH * 0.68);
    var ctrl = E("g", { opacity: 0.9 });
    ctrl.appendChild(E("line", { x1: cordX, y1: cordY1, x2: cordX, y2: cordY2, stroke: "#d8d3c9", "stroke-width": Math.max(1, scale) }));
    for (var cy = cordY1; cy <= cordY2; cy += Math.max(5 * scale, 5)) ctrl.appendChild(E("circle", { cx: cordX, cy: cy, r: Math.max(1.2 * scale, 1.2), fill: "#ece8df", stroke: "#aaa69e", "stroke-width": Math.max(0.4, scale * 0.4) }));
    svg.appendChild(ctrl);
    return mat.darkness[tilt] * pct / 100;
  }

  function buildPleated(svg, g, device, material, secondary, pct, scale) {
    var mat = pick(PL, material, "ivory");
    var dir = (secondary === "top-down" || secondary === "center" || secondary === "bottom-up") ? secondary : "bottom-up";
    var canvas = g.canvas;
    var period = device === "desktop" ? 18 : 15;
    var defs = E("defs");
    defs.appendChild(dropShadow("plShadow", 2.4 * scale, 2.5 * scale, "#211d17", 0.26));
    defs.appendChild(grad("plProfile", [["0%", "#faf9f5"], ["52%", "#deddd8"], ["100%", "#bcbab5"]]));
    var pat = E("pattern", { id: "plPleat", patternUnits: "userSpaceOnUse", x: 0, y: 0, width: canvas.width, height: period });
    pat.appendChild(E("path", { d: "M 0 0 L " + canvas.width + " 0 L " + canvas.width + " " + (period / 2) + " L 0 " + (period / 2) + " Z", fill: mat.light, "fill-opacity": 0.80 }));
    pat.appendChild(E("path", { d: "M 0 " + (period / 2) + " L " + canvas.width + " " + (period / 2) + " L " + canvas.width + " " + period + " L 0 " + period + " Z", fill: mat.dark, "fill-opacity": 0.72 }));
    pat.appendChild(E("line", { x1: 0, y1: period / 2, x2: canvas.width, y2: period / 2, stroke: mat.dark, "stroke-opacity": 0.45, "stroke-width": Math.max(0.55, scale * 0.65) }));
    defs.appendChild(pat);
    svg.appendChild(defs);
    sashes(g, function (key, glass, mount) {
      var gx1 = glass[0], gy1 = glass[1], gx2 = glass[2], gy2 = glass[3];
      var glassW = gx2 - gx1, glassH = gy2 - gy1;
      var inset = Math.max(4 * scale, glassW * 0.018);
      var profileH = Math.max(10 * scale, glassH * 0.022);
      var visibleH = glassH * pct / 100;
      var bandTop, bandBottom;
      if (dir === "bottom-up") { bandBottom = gy2; bandTop = gy2 - visibleH; }
      else if (dir === "top-down") { bandTop = gy1; bandBottom = gy1 + visibleH; }
      else { var cY = (gy1 + gy2) / 2; bandTop = cY - visibleH / 2; bandBottom = cY + visibleH / 2; }
      var Gg = E("g", { "data-sash": key });
      [0.27, 0.73].forEach(function (fr) {
        var x = gx1 + inset + (glassW - inset * 2) * fr;
        Gg.appendChild(E("line", { x1: x, y1: gy1, x2: x, y2: gy2, stroke: mat.cord, "stroke-width": Math.max(0.9, scale), "stroke-dasharray": Math.max(4 * scale, 4) + " " + Math.max(3 * scale, 3), opacity: 0.72 }));
      });
      Gg.appendChild(E("rect", { x: gx1 + inset, y: bandTop, width: glassW - inset * 2, height: Math.max(0, bandBottom - bandTop), fill: "url(#plPleat)", filter: "url(#plShadow)" }));
      Gg.appendChild(E("rect", { x: gx1 + inset, y: bandTop - profileH * 0.10, width: glassW - inset * 2, height: profileH, rx: profileH * 0.30, fill: "url(#plProfile)", stroke: "#aaa9a4", "stroke-width": Math.max(0.7, scale * 0.8), filter: "url(#plShadow)" }));
      Gg.appendChild(E("rect", { x: gx1 + inset, y: bandBottom - profileH * 0.90, width: glassW - inset * 2, height: profileH, rx: profileH * 0.30, fill: "url(#plProfile)", stroke: "#aaa9a4", "stroke-width": Math.max(0.7, scale * 0.8), filter: "url(#plShadow)" }));
      svg.appendChild(Gg);
    });
    return mat.darkness * pct / 100;
  }

  function buildRoman(svg, g, device, material, secondary, pct, scale) {
    var mat = pick(RM, material, "ivory");
    var canvas = g.canvas;
    var period = device === "desktop" ? 64 : 52;
    var defs = E("defs");
    defs.appendChild(dropShadow("rmShadow", 2.8 * scale, 3 * scale, "#211d17", 0.29));
    defs.appendChild(grad("rmHead", [["0%", "#fbfaf7"], ["52%", "#deddd8"], ["100%", "#bbb9b4"]]));
    defs.appendChild(grad("rmRail", [["0%", "#f5f4ef"], ["100%", "#c2c0bb"]]));
    var pat = E("pattern", { id: "rmFold", patternUnits: "userSpaceOnUse", x: 0, y: 0, width: canvas.width, height: period });
    pat.appendChild(E("rect", { x: 0, y: 0, width: canvas.width, height: period, fill: mat.base }));
    pat.appendChild(E("path", { d: "M 0 0 L " + canvas.width + " 0 L " + canvas.width + " " + (period * 0.46) + " L 0 " + (period * 0.46) + " Z", fill: mat.highlight, "fill-opacity": 0.46 }));
    pat.appendChild(E("path", { d: "M 0 " + (period * 0.46) + " L " + canvas.width + " " + (period * 0.46) + " L " + canvas.width + " " + period + " L 0 " + period + " Z", fill: mat.shadow, "fill-opacity": 0.34 }));
    pat.appendChild(E("line", { x1: 0, y1: period - 1, x2: canvas.width, y2: period - 1, stroke: mat.shadow, "stroke-opacity": 0.60, "stroke-width": Math.max(0.7, scale) }));
    defs.appendChild(pat);
    svg.appendChild(defs);
    sashes(g, function (key, glass, mount) {
      var gx1 = glass[0], gy1 = glass[1], gx2 = glass[2], gy2 = glass[3], mx1 = mount[0], my1 = mount[1], mx2 = mount[2];
      var glassW = gx2 - gx1, glassH = gy2 - gy1, mountW = mx2 - mx1;
      var headH = Math.max(18 * scale, Math.min(26 * scale, glassH * 0.050));
      var inset = Math.max(5 * scale, glassW * 0.020);
      var railH = Math.max(9 * scale, glassH * 0.020);
      var stackMax = Math.max(48 * scale, glassH * 0.12);
      var visibleH = glassH * pct / 100;
      var fabricEdge = gy1 + visibleH;
      var stackH = stackMax * (1 - pct / 100);
      var stripH = Math.max(7 * scale, stackH / Math.max(1, 5) + 3 * scale);
      var Gg = E("g", { "data-sash": key });
      Gg.appendChild(E("rect", { x: mx1, y: my1, width: mountW, height: headH, rx: Math.max(6 * scale, headH * 0.30), fill: "url(#rmHead)", stroke: "#aaa9a5", "stroke-width": Math.max(0.8, scale), filter: "url(#rmShadow)" }));
      Gg.appendChild(E("rect", { x: gx1 + inset, y: gy1, width: glassW - inset * 2, height: Math.max(0, visibleH), rx: Math.max(2 * scale, 2), fill: "url(#rmFold)", filter: "url(#rmShadow)" }));
      [0.33, 0.67].forEach(function (fr) {
        var x = gx1 + inset + (glassW - inset * 2) * fr;
        Gg.appendChild(E("line", { x1: x, y1: gy1, x2: x, y2: fabricEdge, stroke: mat.cord, "stroke-width": Math.max(0.8, scale), opacity: 0.30 }));
      });
      var st = E("g", { opacity: Math.max(0.12, 1 - pct / 100) });
      for (var i = 0; i < 6; i++) {
        var y = pct === 0 ? gy1 + i * stripH * 0.72 : Math.max(gy1, fabricEdge - stackH) + i * stripH * 0.72;
        st.appendChild(E("rect", { x: gx1 + inset, y: y, width: glassW - inset * 2, height: stripH, rx: Math.max(3 * scale, 3), fill: mat.base, stroke: mat.shadow, "stroke-width": Math.max(0.45, scale * 0.45), filter: "url(#rmShadow)" }));
      }
      Gg.appendChild(st);
      var railY = pct === 0 ? gy1 + Math.max(railH, stackH * 0.74) : fabricEdge - railH * 0.16;
      Gg.appendChild(E("rect", { x: gx1 + inset, y: railY, width: glassW - inset * 2, height: railH, rx: railH * 0.34, fill: "url(#rmRail)", stroke: "#aaa9a4", "stroke-width": Math.max(0.7, scale * 0.8), filter: "url(#rmShadow)" }));
      Gg.appendChild(chain(mx2, my1, headH, gy1, gy2, glassH, scale, Math.max(6 * scale, mountW * 0.028)));
      svg.appendChild(Gg);
    });
    return mat.darkness * pct / 100;
  }

  function buildWood(svg, g, device, material, secondary, pct, scale) {
    var w = pick(WD, material, "oak");
    var tilt = WD_FACE[secondary] != null ? secondary : "half";
    var canvas = g.canvas;
    var period = device === "desktop" ? 34 : 28;
    var faceH = period * WD_FACE[tilt];
    var defs = E("defs");
    defs.appendChild(dropShadow("wdShadow", 2.8 * scale, 2.8 * scale, "#201b17", 0.31));
    defs.appendChild(grad("wdHead", [["0%", w.light], ["54%", w.base], ["100%", w.dark]]));
    defs.appendChild(grad("wdRail", [["0%", w.light], ["100%", w.dark]]));
    var pat = E("pattern", { id: "wdSlat", patternUnits: "userSpaceOnUse", x: 0, y: 0, width: canvas.width, height: period });
    pat.appendChild(E("rect", { x: 0, y: 0, width: canvas.width, height: faceH, fill: w.base }));
    pat.appendChild(E("rect", { x: 0, y: 0, width: canvas.width, height: period * 0.20, fill: w.light, "fill-opacity": 0.42 }));
    pat.appendChild(E("rect", { x: 0, y: period * 0.34, width: canvas.width, height: period * 0.28, fill: w.dark, "fill-opacity": 0.25 }));
    [4, 9, 15, 21, 26].forEach(function (y, idx) {
      var a = 1.2 + idx * 0.22;
      var d = "M 0 " + y + " C " + (canvas.width * 0.18) + " " + (y - a) + " " + (canvas.width * 0.31) + " " + (y + a) + " " + (canvas.width * 0.48) + " " + y + " S " + (canvas.width * 0.79) + " " + (y - a) + " " + canvas.width + " " + y;
      pat.appendChild(E("path", { d: d, fill: "none", stroke: w.grain, "stroke-opacity": 0.16 + idx * 0.025, "stroke-width": Math.max(0.45, scale * 0.48) }));
    });
    pat.appendChild(E("line", { x1: 0, y1: faceH, x2: canvas.width, y2: faceH, stroke: w.dark, "stroke-opacity": 0.82, "stroke-width": Math.max(0.8, scale) }));
    defs.appendChild(pat);
    svg.appendChild(defs);
    var stackVisible = Math.max(0.10, 1 - pct / 100);
    sashes(g, function (key, glass, mount) {
      var gx1 = glass[0], gy1 = glass[1], gx2 = glass[2], gy2 = glass[3], mx1 = mount[0], my1 = mount[1], mx2 = mount[2];
      var glassW = gx2 - gx1, glassH = gy2 - gy1, mountW = mx2 - mx1;
      var headH = Math.max(19 * scale, Math.min(27 * scale, glassH * 0.052));
      var inset = Math.max(5 * scale, glassW * 0.020);
      var railH = Math.max(12 * scale, glassH * 0.025);
      var stackMax = Math.max(50 * scale, glassH * 0.12);
      var tapeW = Math.max(10 * scale, glassW * 0.055);
      var h = glassH * pct / 100;
      var Gg = E("g", { "data-sash": key });
      Gg.appendChild(E("rect", { x: mx1, y: my1, width: mountW, height: headH, rx: Math.max(6 * scale, headH * 0.28), fill: "url(#wdHead)", stroke: w.dark, "stroke-width": Math.max(0.8, scale), filter: "url(#wdShadow)" }));
      Gg.appendChild(E("rect", { x: gx1 + inset, y: gy1, width: glassW - inset * 2, height: h, fill: "url(#wdSlat)", filter: "url(#wdShadow)" }));
      [0.30, 0.70].forEach(function (fr) {
        var x = gx1 + inset + (glassW - inset * 2) * fr - tapeW / 2;
        Gg.appendChild(E("rect", { x: x, y: gy1, width: tapeW, height: h, rx: Math.max(2 * scale, 2), fill: w.tape, "fill-opacity": 0.88 }));
      });
      var stackH = stackMax * (1 - pct / 100);
      var stripH = Math.max(5 * scale, stackH / Math.max(1, 7) + 2.5 * scale);
      var st = E("g", { opacity: stackVisible });
      for (var i = 0; i < 8; i++) st.appendChild(E("rect", { x: gx1 + inset, y: gy1 + i * stripH * 0.68, width: glassW - inset * 2, height: stripH, rx: Math.max(2 * scale, 2), fill: w.base, stroke: w.dark, "stroke-width": Math.max(0.45, scale * 0.45), filter: "url(#wdShadow)" }));
      Gg.appendChild(st);
      Gg.appendChild(E("rect", { x: gx1 + inset, y: gy1 + Math.max(0, h - railH * 0.14), width: glassW - inset * 2, height: railH, rx: railH * 0.34, fill: "url(#wdRail)", stroke: w.dark, "stroke-width": Math.max(0.7, scale * 0.8), filter: "url(#wdShadow)" }));
      var cordX = mx2 - Math.max(13 * scale, mountW * 0.052), cordY2 = Math.min(gy2 - 22 * scale, gy1 + glassH * 0.68);
      Gg.appendChild(E("line", { x1: cordX, y1: my1 + headH * 0.74, x2: cordX, y2: cordY2, stroke: w.cord, "stroke-width": Math.max(1, scale), opacity: 0.9 }));
      svg.appendChild(Gg);
    });
    return w.darkness[tilt] * pct / 100;
  }

  var BUILD = {
    roller: buildRoller, cassette: buildCassette, daynight: buildDayNight, horizontal: buildHorizontal,
    vertical: buildVertical, pleated: buildPleated, roman: buildRoman, wood: buildWood
  };

  /* ===================== МЕТАДАННЫЕ СИСТЕМ (для wizard) =====================
     Формат совместим с прежним window.VeloraConfigurator.systems:
     defaultState (индекс 0..4), secondary (id→подпись | undefined),
     defaultSecondary, secondaryLabel, stateLabel.                          */
  var TILT = { open: "Открыты", half: "Полуоткрыты", closed: "Закрыты" };
  var META = {
    roller: { stateLabel: "Степень закрытия", defaultState: 2 },
    cassette: { stateLabel: "Степень закрытия", defaultState: 2 },
    daynight: { stateLabel: "Степень закрытия", defaultState: 2, secondaryLabel: "Совпадение полос", defaultSecondary: "half", secondary: { open: "Максимум света", half: "Рассеянный свет", closed: "Минимум света" } },
    horizontal: { stateLabel: "Степень опускания", defaultState: 3, secondaryLabel: "Поворот ламелей", defaultSecondary: "half", secondary: TILT },
    vertical: { stateLabel: "Степень раздвижения", defaultState: 4, secondaryLabel: "Поворот ламелей", defaultSecondary: "half", secondary: TILT },
    pleated: { stateLabel: "Степень закрытия", defaultState: 3, secondaryLabel: "Направление движения", defaultSecondary: "bottom-up", secondary: { "bottom-up": "Снизу вверх", "top-down": "Сверху вниз", center: "Двустороннее" } },
    roman: { stateLabel: "Степень опускания", defaultState: 3 },
    wood: { stateLabel: "Степень опускания", defaultState: 3, secondaryLabel: "Поворот ламелей", defaultSecondary: "half", secondary: TILT }
  };

  /* ===================== ПУБЛИЧНЫЙ API ===================== */
  var refs = null, geometry = null, geomPromise = null;

  function init(o) {
    o = o || {};
    refs = {
      stage: o.stage, room: o.room, darkness: o.darkness, svg: o.svg,
      assetBase: o.assetBase || "assets/configurator-v2/assets"
    };
    var url = o.geometryUrl || "assets/configurator-v2/geometry-v2.json";
    if (!geomPromise) {
      geomPromise = fetch(url).then(function (r) {
        if (!r.ok) throw new Error("geometry-v2.json load failed: " + r.status);
        return r.json();
      }).then(function (d) { geometry = d; return d; });
    }
    return geomPromise;
  }

  function render(o) {
    if (!geometry || !refs || !refs.svg) return;
    var device = o.device === "mobile" ? "mobile" : "desktop";
    var g = geometry[device];
    if (!g) return;
    var scale = device === "desktop" ? 1 : 0.82;
    if (refs.stage) refs.stage.dataset.device = device;
    if (refs.room) {
      var src = refs.assetBase + "/room-" + device + ".webp";
      if (refs.room.getAttribute("src") !== src) refs.room.setAttribute("src", src);
    }
    var svg = refs.svg;
    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 " + g.canvas.width + " " + g.canvas.height);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    var builder = BUILD[o.system] || BUILD.roller;
    var darkness = builder(svg, g, device, o.material, o.secondary, nearest(Number(o.state)), scale);
    if (refs.darkness) refs.darkness.style.opacity = String(darkness || 0);
  }

  function destroy() {
    if (refs && refs.svg) refs.svg.innerHTML = "";
    refs = null;
  }

  return { init: init, render: render, destroy: destroy, meta: META };
})();
