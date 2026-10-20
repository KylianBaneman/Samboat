(() => {
  'use strict';

  const DESTS = [
    { slug: 'corsica',     name: 'Corsica' },
    { slug: 'la-rochelle', name: 'La Rochelle' },
    { slug: 'arcachon',    name: 'Arcachon' },
    { slug: 'marseille',   name: 'Marseille' },
    { slug: 'lake-annecy', name: 'Lake Annecy' },
    { slug: 'croatia',     name: 'Croatia' },
    { slug: 'greece',      name: 'Greece' },
    { slug: 'majorca',     name: 'Majorca' },
    { slug: 'sicily',      name: 'Sicily' },
    { slug: 'malta',       name: 'Malta' },
  ];
  const N = DESTS.length;
  const STEP = 360 / N;
  const MAX_SPINS = 2;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPIN_MS = REDUCED ? 1200 : 6200;
  const LAND_PAUSE_MS = 700;      // la roue s'est arrêtée : un temps de suspense avant le zoom
  const ZOOM_MS = 1400;           // identique aux transitions de zoom dans style.css
  const DWELL_MS = 4500;          // après le 2e tirage : temps sur la photo avant de continuer seul
  const NEXT_SPIN_DELAY_MS = 900; // le médaillon s'envole, puis la roue repart
  const THANKS_SECONDS = 12;

  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), backdrop = $('backdrop'), wheel = $('wheel'), zoomer = $('zoomer');
  const pips = $('pips'), live = $('live');
  const result = $('result'), kicker = $('kicker'), nameEl = $('name');
  const dlg = $('dlg'), steps = [...dlg.querySelectorAll('.step')];
  const formQuestion = $('formQuestion'), answer = $('answer'), answerErr = $('answerErr');
  const formMail = $('formMail'), mail = $('mail'), mailErr = $('mailErr');

  const mod = (x, m) => ((x % m) + m) % m;
  const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

  const bgs = [], thumbs = [];
  DESTS.forEach((d, i) => {
    const bg = new Image();
    bg.src = `img/full/${d.slug}.jpg`;
    bg.alt = '';
    bg.decoding = 'async';
    backdrop.append(bg);
    bgs.push(bg);

    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.style.setProperty('--i', i);
    slot.innerHTML = `<div class="thumb"><div class="thumb-in"><img src="img/thumb/${d.slug}.jpg" alt="${d.name}" draggable="false"></div></div>`;
    wheel.append(slot);
    thumbs.push(slot.firstElementChild);
  });

  // phase : idle → spinning → landed → zoomed → leaving → (idle | done)
  const st = {
    phase: 'idle', angle: 0, left: MAX_SPINS, picks: [], top: -1, run: 0, timers: [], tick: 0, autoT: 0,
    gone: new Set(),     // destinations déjà tirées : elles ont quitté le gouvernail
    pending: null,       // la destination affichée, qui partira quand on repasse sur le gouvernail
  };
  const after = (ms, fn) => { const t = setTimeout(fn, ms); st.timers.push(t); return t; };

  // la roue tourne d'un bloc ; chaque médaillon se contre-tourne pour rester droit
  function render(a) {
    wheel.style.transform = `rotate(${a}deg)`;
    thumbs.forEach((t, i) => { t.style.transform = `rotate(${-(a + i * STEP)}deg)`; });
  }
  const topIndex = (a) => mod(Math.round(-a / STEP), N);
  function setTop(i) {
    thumbs.forEach((t, k) => t.classList.toggle('top', k === i));
    st.top = i;
  }
  const show = (i) => bgs.forEach((b, k) => b.classList.toggle('on', k === i));

  function updatePips() {
    [...pips.children].forEach((p, k) => p.classList.toggle('is-full', k < st.left));
    pips.setAttribute('aria-label', `${st.left} lancer${st.left > 1 ? 's' : ''} restant${st.left > 1 ? 's' : ''}`);
  }

  // Espace / Entrée : le geste unique du visiteur (plus tard : le vrai gouvernail)
  function advance() {
    if (dlg.open) return;
    if (st.phase === 'idle') spin();
    else if (st.phase === 'zoomed') leave();
  }

  function spin() {
    if (st.phase !== 'idle' || !st.left) return;
    st.phase = 'spinning';
    st.left--;
    updatePips();
    flush();

    const pool = DESTS.map((_, i) => i).filter((i) => !st.gone.has(i));
    const w = pool[rnd(pool.length)];
    st.picks.push(w);

    const from = st.angle;
    const base = from + (5 + rnd(2)) * 360;
    const to = base + mod(-w * STEP - base, 360); // le médaillon w finit pile en haut
    run(from, to, w);
  }

  function run(from, to, w) {
    const token = ++st.run;
    const t0 = performance.now();
    (function frame(now) {
      if (token !== st.run) return;
      const p = Math.min((now - t0) / SPIN_MS, 1);
      const a = from + (to - from) * (1 - Math.pow(1 - p, 3));
      st.angle = a;
      render(a);
      const i = topIndex(a);
      if (i !== st.top) setTop(i);
      if (p < 1) requestAnimationFrame(frame); else land(w);
    })(t0);
  }

  function land(w) {
    st.angle = mod(st.angle, 360);
    render(st.angle);
    setTop(w);
    thumbs[w].classList.add('win');
    st.pending = w;
    st.phase = 'landed';
    stage.classList.add('is-landed');
    kicker.textContent = `Destination ${st.picks.length} sur ${MAX_SPINS}`;
    nameEl.textContent = DESTS[w].name;
    live.textContent = `Destination tirée : ${DESTS[w].name}.`;
    after(LAND_PAUSE_MS, () => zoomIn(w));
  }

  // la caméra plonge dans le médaillon : la photo s'ouvre en cercle depuis lui jusqu'au plein écran
  function zoomIn(w) {
    const r = thumbs[w].getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    stage.style.setProperty('--cx', `${cx}px`);
    stage.style.setProperty('--cy', `${cy}px`);
    stage.style.setProperty('--r0', `${(r.width / 2) * 1.12}px`);
    zoomer.style.transformOrigin = `${cx}px ${cy}px`;
    show(w);
    result.setAttribute('aria-hidden', 'false');
    st.phase = 'zoomed';
    // deux frames : la photo doit être posée sur le médaillon avant que la transition démarre
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-zoomed')));
    if (!st.left) st.autoT = after(ZOOM_MS + DWELL_MS, leave);
  }

  // retour au gouvernail : la photo se referme, le médaillon part, puis la roue repart (ou la modale s'ouvre)
  function leave() {
    if (st.phase !== 'zoomed') return;
    st.phase = 'leaving';
    clearTimeout(st.autoT);
    stage.classList.remove('is-zoomed');
    result.setAttribute('aria-hidden', 'true');
    after(ZOOM_MS, () => {
      flush();
      bgs.forEach((b) => b.classList.remove('on'));
      stage.classList.remove('is-landed');
      if (st.left) {
        after(NEXT_SPIN_DELAY_MS, () => { st.phase = 'idle'; spin(); });
      } else {
        st.phase = 'done';
        after(600, openModal);
      }
    });
  }

  // la destination tirée part du gouvernail : son médaillon s'envole et elle ne peut plus sortir
  function flush() {
    if (st.pending === null) return;
    st.gone.add(st.pending);
    thumbs[st.pending].classList.remove('win');
    thumbs[st.pending].classList.add('gone');
    st.pending = null;
  }

  // ─── Modale : chaque étape remplace la précédente ───

  function go(step) { steps.forEach((s) => { s.hidden = s.dataset.step !== step; }); }
  function fail(field, err, on) { err.hidden = !on; field.setAttribute('aria-invalid', String(on)); }

  function openModal() {
    const [a, b] = st.picks.map((i) => DESTS[i].name);
    $('picks').textContent = `${a} · ${b}`;
    $('lead').textContent = `${a} et ${b} vous attendent. Laissez votre email pour tenter de remporter 15 % de remise sur un voyage SamBoat.`;
    go('question');
    dlg.showModal();
    answer.focus();
  }

  formQuestion.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!answer.value.trim()) { fail(answer, answerErr, true); answer.focus(); return; }
    fail(answer, answerErr, false);
    go('draw');
    mail.focus();
  });

  formMail.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!mail.value.trim() || !mail.checkValidity()) { fail(mail, mailErr, true); mail.focus(); return; }
    fail(mail, mailErr, false);
    thanks();
  });
  $('again').addEventListener('click', reset);

  // concept : la réponse et l'email ne sont ni stockés ni envoyés
  function thanks() {
    $('thanksTitle').textContent = 'Merci pour votre réponse.';
    $('thanksText').textContent = 'Vous participez au tirage au sort : si vous êtes le gagnant, SamBoat vous écrira. Bon vent !';
    let n = THANKS_SECONDS;
    $('count').textContent = n;
    go('thanks');
    $('again').focus();
    clearInterval(st.tick);
    st.tick = setInterval(() => {
      $('count').textContent = --n;
      if (n <= 0) reset();
    }, 1000);
  }

  function reset() {
    st.run++;
    st.timers.forEach(clearTimeout);
    st.timers = [];
    clearInterval(st.tick);
    if (dlg.open) dlg.close();
    formQuestion.reset();
    formMail.reset();
    fail(answer, answerErr, false);
    fail(mail, mailErr, false);
    Object.assign(st, { phase: 'idle', left: MAX_SPINS, picks: [], pending: null });
    st.gone.clear();
    stage.classList.remove('is-landed', 'is-zoomed');
    thumbs.forEach((t) => t.classList.remove('win', 'gone'));
    bgs.forEach((b) => b.classList.remove('on'));
    result.setAttribute('aria-hidden', 'true');
    live.textContent = '';
    updatePips();
    setTop(topIndex(st.angle));
  }

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!dlg.open) reset(); return; }
    if (dlg.open || e.repeat) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); advance(); }
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); reset(); }); // Échap dans la modale = nouvelle partie

  if (window.visualViewport) {
    visualViewport.addEventListener('resize', () => {
      dlg.classList.toggle('kb', visualViewport.height < innerHeight * 0.85);
    });
  }

  render(0);
  setTop(0);
  updatePips();
})();
