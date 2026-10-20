/* Offline evolution resume: bounded, frame-sliced catch-up for the Planet Genome WebView. */
(function () {
  'use strict';
  const KEY = 'planet-offline-checkpoint-v1';
  const MAX_OFFLINE_SECONDS = 7 * 24 * 60 * 60;
  const MAX_STEPS = 240;
  let running = false;

  function saveCheckpoint() {
    try {
      const now = Date.now();
      localStorage.setItem(KEY, JSON.stringify({
        at: now,
        started: !!lifeStarted,
        age: Number(lifeAgeMa) || 0,
        speed: Number(lifeSpeed) || 8
      }));
    } catch (error) {
      console.warn('Offline checkpoint save skipped:', error);
    }
  }

  function resume() {
    if (running || typeof lifeStarted !== 'boolean') return;
    let checkpoint;
    try { checkpoint = JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (_) { checkpoint = null; }
    const now = Date.now();
    const elapsedRaw = checkpoint && Number.isFinite(Number(checkpoint.at))
      ? Math.max(0, (now - Number(checkpoint.at)) / 1000) : 0;
    const shouldResume = !!(checkpoint && checkpoint.started && lifeStarted && elapsedRaw >= 2 && lifeAgeMa < 4540);
    saveCheckpoint();
    if (!shouldResume) return;

    const elapsed = Math.min(MAX_OFFLINE_SECONDS, elapsedRaw);
    const capped = elapsedRaw > MAX_OFFLINE_SECONDS;
    const startAge = Math.max(0, Number(lifeAgeMa) || 0);
    const targetAge = Math.min(4540, startAge + elapsed * Math.max(1, Math.min(30, Number(lifeSpeed) || 8)) * 3);
    if (targetAge <= startAge) return;

    const steps = Math.min(MAX_STEPS, Math.max(1, Math.ceil(Math.min(elapsed, 180) / 0.75)));
    const wasStarted = lifeStarted;
    let index = 0;
    running = true;
    catchUpInProgress = true;
    function finish() {
      running = false;
      catchUpInProgress = false;
      lifeAgeMa = targetAge;
      lifeStarted = wasStarted && lifeStarted && targetAge < 4540;
      evolutionAccumulator = 0;
      updateLifeUI();
      renderSpeciesCatalog(true);
      persistLifeState();
      saveCheckpoint();
      if (capped && typeof toast === 'function') toast(isEnglishLife() ? 'Offline catch-up was limited to 7 days.' : 'جبران زمان آفلاین برای جلوگیری از فشار پردازشی به ۷ روز محدود شد.');
    }
    function advance() {
      if (!running) return;
      // Respect a manual pause made while catch-up is running.
      if (!lifeStarted && targetAge < 4540) {
        running = false; catchUpInProgress = false; evolutionAccumulator = 0;
        updateLifeUI(); persistLifeState(); saveCheckpoint(); return;
      }
      try {
        lifeAgeMa = startAge + (targetAge - startAge) * ((index + 1) / steps);
        evolutionaryStep({ deferUI: true });
        index++;
        if (index >= steps || lifeAgeMa >= 4540) { finish(); return; }
        if (index % 8 === 0) updateLifeUI();
        requestAnimationFrame(advance);
      } catch (error) {
        running = false;
        catchUpInProgress = false;
        lifeStarted = false;
        evolutionAccumulator = 0;
        console.error('Offline evolution catch-up failed; evolution paused safely:', error);
        updateLifeUI();
        persistLifeState();
        saveCheckpoint();
        if (typeof toast === 'function') toast(isEnglishLife() ? 'Offline catch-up failed safely; evolution is paused.' : 'جبران تکامل آفلاین با خطا متوقف شد؛ شبیه‌سازی در حالت توقف ذخیره شد.');
      }
    }
    requestAnimationFrame(advance);
  }

  // Preserve the previous checkpoint until resume() has measured the elapsed interval.
  window.setInterval(saveCheckpoint, 5000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      try { persistLifeState(); } catch (_) {}
      saveCheckpoint();
    } else {
      resume();
    }
  });
  window.addEventListener('pagehide', function () {
    try { persistLifeState(); } catch (_) {}
    saveCheckpoint();
  });
  window.addEventListener('pageshow', function () {
    if (document.visibilityState === 'visible') resume();
  });
  // One startup check, after the saved state has been restored by the main app.
  if (document.readyState === 'complete') resume();
  else window.addEventListener('load', resume, { once: true });
})();
