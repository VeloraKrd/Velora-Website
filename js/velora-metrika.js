/* ============================================================================
   VELORA — ЯНДЕКС.МЕТРИКА: безопасная обёртка целей + клики по контактам
   ----------------------------------------------------------------------------
   Сам счётчик (tag.js) подключается официальным кодом в <head> каждой страницы.
   Здесь — только helper для целей и делегирование кликов по tel/WhatsApp/Telegram.
   Подключается на всех HTML-страницах сайта.
   ========================================================================== */
(function () {
  "use strict";

  var COUNTER_ID = 110831737;

  // Безопасный вызов цели: не падает, если Метрика ещё не загружена / заблокирована.
  window.veloraReachGoal = function (goalName, params) {
    if (typeof window.ym !== 'function') return;
    try {
      window.ym(COUNTER_ID, 'reachGoal', goalName, params || {});
    } catch (error) {
      console.warn('Yandex Metrika goal error:', error);
    }
  };

  // Клики по телефону / WhatsApp / Telegram — одно делегирование на документе.
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;
    var href = (link.getAttribute('href') || '').trim().toLowerCase();
    if (!href) return;
    if (href.indexOf('tel:') === 0) {
      window.veloraReachGoal('click_phone');
    } else if (href.indexOf('wa.me') > -1 || href.indexOf('whatsapp.com') > -1) {
      window.veloraReachGoal('click_whatsapp');
    } else if (href.indexOf('t.me') > -1 || href.indexOf('telegram.me') > -1) {
      window.veloraReachGoal('click_telegram');
    }
  }, true);
})();
