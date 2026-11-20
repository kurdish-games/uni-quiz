import { SUBJECTS, buildGameDeck } from './questions.js';
import { I18N } from './i18n.js';
import { audio } from './audio.js';
import { initBackground } from './background.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const STORAGE_KEY = 'uni_quiz_bests_v2';
const LANG_KEY = 'uni_quiz_lang_v2';

const state = {
  lang: localStorage.getItem(LANG_KEY) === 'ckb' ? 'ckb' : 'en',
  screen: 'splash',
  subjectId: 'psychology',
  deck: [],
  qIndex: 0,
  correctCount: 0,
  score: 0,
  armedIndex: null,
  isLocked: false,
  confirmMode: true,
  history: [], // { qObj, pickedIndex, correctIndex, isCorrect }
  outcome: null,
};

const bg = initBackground();

const el = {
  topBar: document.getElementById('top-bar'),
  screens: {
    splash: document.getElementById('splash-screen'),
    home: document.getElementById('home-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen'),
  },

  btnSplashLang: document.getElementById('btn-splash-lang'),
  btnToggleLang: document.getElementById('btn-toggle-lang'),
  btnEnterStudio: document.getElementById('btn-enter-studio'),
  btnEnterSilent: document.getElementById('btn-enter-silent'),
  btnBrandHome: document.getElementById('btn-brand-home'),
  btnToggleMusic: document.getElementById('btn-toggle-music'),
  musicStatusLabel: document.getElementById('music-status-label'),
  musicVolume: document.getElementById('music-volume'),
  btnToggleSfx: document.getElementById('btn-toggle-sfx'),
  prefConfirm: document.getElementById('pref-confirm'),

  // Game HUD & Stage
  hudSubject: document.getElementById('hud-subject'),
  hudProgress: document.getElementById('hud-progress'),
  hudPrize: document.getElementById('hud-prize'),
  questionCard: document.getElementById('question-card'),
  questionTier: document.getElementById('question-tier'),
  safeIndicator: document.getElementById('safe-indicator'),
  questionText: document.getElementById('question-text'),
  answerTiles: Array.from(document.querySelectorAll('.answer-tile')),
  confirmBar: document.getElementById('confirm-bar'),
  confirmPrompt: document.getElementById('confirm-prompt'),
  btnCancelChoice: document.getElementById('btn-cancel-choice'),
  btnLockChoice: document.getElementById('btn-lock-choice'),
  feedbackCard: document.getElementById('feedback-card'),
  feedbackBadge: document.getElementById('feedback-badge'),
  feedbackSub: document.getElementById('feedback-sub'),
  feedbackNote: document.getElementById('feedback-note'),
  btnNextQuestion: document.getElementById('btn-next-question'),
  btnNextLabel: document.getElementById('btn-next-label'),

  // Ladder
  ladderPanel: document.getElementById('ladder-panel'),
  ladderList: document.getElementById('ladder-list'),
  ladderBackdrop: document.getElementById('ladder-backdrop'),
  btnOpenLadder: document.getElementById('btn-open-ladder'),
  btnCloseLadder: document.getElementById('btn-close-ladder'),

  // Result
  resultEyebrow: document.getElementById('result-eyebrow'),
  resultPrize: document.getElementById('result-prize'),
  resultHeadline: document.getElementById('result-headline'),
  statSubject: document.getElementById('stat-subject'),
  statCorrect: document.getElementById('stat-correct'),
  statBest: document.getElementById('stat-best'),
  btnRetryWrong: document.getElementById('btn-retry-wrong'),
  txtRetryWrong: document.getElementById('txt-retry-wrong'),
  btnPlayAgain: document.getElementById('btn-play-again'),
  btnShareScore: document.getElementById('btn-share-score'),
  btnBackHub: document.getElementById('btn-back-hub'),
  btnToggleReview: document.getElementById('btn-toggle-review'),
  txtReviewNotes: document.getElementById('txt-review-notes'),
  reviewList: document.getElementById('review-list'),

  toast: document.getElementById('toast'),
};

function t() {
  return I18N[state.lang] || I18N.en;
}

function fmtPts(val) {
  return `${Number(val || 0)} ${t().ptsUnit}`;
}

function animateScoreCount(node, targetVal) {
  const duration = 680;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = Math.round(targetVal * eased);
    node.textContent = fmtPts(current);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function getLocalizedQ(q) {
  if (state.lang === 'ckb' && q.ku) {
    return {
      question: q.ku.question,
      options: q.ku.options,
      note: q.ku.note,
    };
  }
  return {
    question: q.question,
    options: q.options,
    note: q.note,
  };
}

// ── Apply Language Across Entire UI ──
function applyLanguage() {
  const L = t();
  document.documentElement.lang = state.lang === 'ckb' ? 'ckb' : 'en';
  document.documentElement.dir = L.dir;
  document.title = L.appTitle;

  document.querySelectorAll('.lang-switch-text').forEach((n) => {
    n.textContent = L.switchLabel;
  });

  setText('txt-splash-eyebrow', L.splashEyebrow);
  setHtml('txt-splash-title', L.splashTitleHtml);
  setText('txt-splash-subtitle', L.splashSubtitle);
  setText('txt-enter-studio', L.enterStudio);
  setText('txt-enter-silent', L.enterSilent);
  setText('txt-splash-foot', L.splashFoot);

  setText('txt-brand', L.brand);
  setText('txt-sfx-label', L.sfxLabel);

  setText('txt-home-eyebrow', L.homeEyebrow);
  setHtml('txt-home-title', L.homeTitleHtml);
  setHtml('txt-home-desc', L.homeDescHtml);
  setText('txt-confirm-title', L.confirmToggleTitle);
  setText('txt-confirm-sub', L.confirmToggleSub);

  SUBJECTS.forEach((id) => {
    const s = L.subjects[id];
    setText(`card-title-${id}`, s.title);
    setText(`card-sub-${id}`, s.sub);
    setText(`card-blurb-${id}`, s.blurb);
    setText(`card-count-${id}`, id === 'mixed' ? L.qPoolMixed : L.qPoolSingle);
  });

  document.querySelectorAll('.play-arrow-label').forEach((n) => {
    n.textContent = L.playBtn;
  });

  setText('txt-playing-for', L.playingFor);
  setText('btn-cancel-choice', L.btnChange);
  setText('txt-lock-choice', L.btnLockIn);
  setText('txt-ladder-eyebrow', L.ladderEyebrow);
  setText('txt-ladder-title', L.ladderTitle);

  setText('txt-stat-subject', L.statSubject);
  setText('txt-stat-right', L.statRight);
  setText('txt-stat-best', L.statBest);
  setText('txt-play-again', L.btnPlayAgain);
  setText('txt-share-score', L.btnShare);
  setText('txt-back-hub', L.btnSwitch);
  setText('txt-review-notes', L.btnReviewNotes);

  syncAudioUI();
  refreshHomeBests();

  if (state.screen === 'game' && state.deck[state.qIndex]) {
    refreshActiveQuestionText();
    renderLadder();
  } else if (state.screen === 'result' && state.outcome) {
    renderResultScreen();
  }
}

function setText(id, val) {
  const n = document.getElementById(id);
  if (n) n.textContent = val;
}

function setHtml(id, val) {
  const n = document.getElementById(id);
  if (n) n.innerHTML = val;
}

function toggleLanguage() {
  audio.playClick();
  document.body.classList.add('lang-swapping');
  setTimeout(() => {
    state.lang = state.lang === 'en' ? 'ckb' : 'en';
    try {
      localStorage.setItem(LANG_KEY, state.lang);
    } catch {
      // ignore
    }
    applyLanguage();
    requestAnimationFrame(() => {
      document.body.classList.remove('lang-swapping');
    });
  }, 150);
}

// ── Persistence ──
function loadBests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveBest(subjectId, value) {
  const bests = loadBests();
  if ((bests[subjectId] || 0) < value) {
    bests[subjectId] = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bests));
    } catch {
      // ignore
    }
  }
  return bests[subjectId] || value;
}

function refreshHomeBests() {
  const bests = loadBests();
  const L = t();
  SUBJECTS.forEach((id) => {
    const badge = document.getElementById(`best-${id}`);
    if (badge) badge.textContent = `${L.bestPrefix}: ${fmtPts(bests[id] || 0)}`;
  });
}

// ── Screen Switching (Smooth Sequential Cross-Fade — Zero Layout Jump!) ──
let switchTimer = null;
function switchScreen(target, onBeforeEnter) {
  if (switchTimer) {
    clearTimeout(switchTimer);
    switchTimer = null;
  }

  const prevName = state.screen;
  const prevNode = el.screens[prevName];
  const nextNode = el.screens[target];
  state.screen = target;

  const showNext = () => {
    Object.entries(el.screens).forEach(([name, node]) => {
      if (name !== target) {
        node.classList.remove('active', 'is-visible', 'is-leaving');
      }
    });

    el.topBar.classList.toggle('hidden', target === 'splash');
    if (target === 'home') {
      bg?.setMood('home');
      refreshHomeBests();
    }

    if (onBeforeEnter) onBeforeEnter();

    nextNode.classList.remove('is-leaving', 'is-visible');
    nextNode.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nextNode.classList.add('is-visible');
      });
    });
  };

  if (prevNode && prevNode !== nextNode && prevNode.classList.contains('active')) {
    prevNode.classList.remove('is-visible');
    prevNode.classList.add('is-leaving');
    switchTimer = setTimeout(showNext, 270);
  } else {
    showNext();
  }
}

// ── Toast ──
let toastTimer;
function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2300);
}

function syncAudioUI() {
  const L = t();
  el.btnToggleMusic.classList.toggle('is-playing', audio.musicEnabled);
  el.musicStatusLabel.textContent = audio.musicEnabled ? L.musicOn : L.musicOff;
  el.btnToggleSfx.classList.toggle('is-on', audio.sfxEnabled);
}

// ── Progress Sidebar (Tracks Right ✓ and Missed ✕ for every question!) ──
function renderLadder() {
  const L = t();
  el.ladderList.innerHTML = '';

  state.deck.forEach((_, idx) => {
    const li = document.createElement('li');
    li.className = 'ladder-step';

    const rec = state.history[idx];
    let statusMark = '—';
    if (rec) {
      if (rec.isCorrect) {
        li.classList.add('is-passed');
        statusMark = '✓ +100';
      } else {
        li.classList.add('is-missed');
        statusMark = '✕ 0';
      }
    } else if (idx === state.qIndex) {
      li.classList.add('is-current');
      statusMark = 'Now';
    }

    li.innerHTML = `
      <span class="ladder-step-num">${L.levelShort(idx + 1)}</span>
      <span class="ladder-step-amt">${statusMark}</span>
    `;
    el.ladderList.appendChild(li);
  });
}

function toggleLadderDrawer(forceOpen) {
  const open = typeof forceOpen === 'boolean' ? forceOpen : !el.ladderPanel.classList.contains('is-open');
  el.ladderPanel.classList.toggle('is-open', open);
  el.ladderBackdrop.classList.toggle('hidden', !open);
}

// ── Start Run (Normal or Retry Missed Only!) ──
function startRun(subjectId, customDeck = null) {
  state.subjectId = subjectId;
  state.deck = customDeck ? customDeck : buildGameDeck(subjectId);
  state.qIndex = 0;
  state.correctCount = 0;
  state.score = 0;
  state.armedIndex = null;
  state.isLocked = false;
  state.history = [];
  state.outcome = null;

  bg?.setMood(subjectId);
  switchScreen('game', () => loadQuestion(false));
}

function refreshActiveQuestionText() {
  const L = t();
  const q = state.deck[state.qIndex];
  const lq = getLocalizedQ(q);

  const activeSubjKey = state.subjectId === 'mixed' ? q.subjectKey : state.subjectId;
  el.hudSubject.textContent = L.subjects[activeSubjKey].short;
  el.hudProgress.textContent = L.qProgress(state.qIndex + 1, state.deck.length);
  el.hudPrize.textContent = fmtPts(state.score);

  el.questionTier.textContent = L.tierNames[q.tier] || L.tierNames[1];
  el.safeIndicator.textContent = L.guaranteedLabel(state.correctCount, state.history.length);
  el.questionText.textContent = lq.question;

  el.answerTiles.forEach((tile, idx) => {
    tile.querySelector('.answer-label').textContent = lq.options[idx];
  });

  if (state.armedIndex !== null) {
    el.confirmPrompt.innerHTML = L.confirmPrompt(LETTERS[state.armedIndex]);
  }
}

function loadQuestion(withTransition = false) {
  const renderFresh = () => {
    state.armedIndex = null;
    state.isLocked = false;

    bg?.setMood(state.subjectId);

    el.confirmBar.classList.add('hidden');
    el.feedbackCard.classList.add('hidden');
    el.feedbackCard.classList.remove('is-correct', 'is-wrong');

    // Reset animation classes cleanly so EVERY question & tile animates in!
    el.questionCard.classList.remove('anim-enter', 'anim-exit');
    el.answerTiles.forEach((tile) => {
      tile.disabled = false;
      tile.className = 'answer-tile';
    });

    refreshActiveQuestionText();
    renderLadder();

    // Force reflow then trigger staggered spring entrance
    void el.questionCard.offsetWidth;
    el.questionCard.classList.add('anim-enter');
    el.answerTiles.forEach((tile) => tile.classList.add('anim-in'));
  };

  if (!withTransition) {
    renderFresh();
    return;
  }

  // Smooth exit glide before bringing in the next question
  el.feedbackCard.classList.add('hidden');
  el.questionCard.classList.remove('anim-enter');
  el.questionCard.classList.add('anim-exit');
  el.answerTiles.forEach((tile) => {
    tile.classList.remove('anim-in');
    tile.classList.add('anim-out');
  });

  setTimeout(renderFresh, 260);
}

// ── Answer Selection ──
function handleAnswerTap(idx) {
  if (state.isLocked) return;

  if (!state.confirmMode) {
    lockInAnswer(idx);
    return;
  }

  if (state.armedIndex === idx) {
    lockInAnswer(idx);
    return;
  }

  audio.playSelect();
  state.armedIndex = idx;
  el.answerTiles.forEach((tile, i) => tile.classList.toggle('is-armed', i === idx));
  el.confirmPrompt.innerHTML = t().confirmPrompt(LETTERS[idx]);
  el.confirmBar.classList.remove('hidden');
}

function cancelArmedChoice() {
  if (state.isLocked) return;
  state.armedIndex = null;
  el.answerTiles.forEach((tile) => tile.classList.remove('is-armed'));
  el.confirmBar.classList.add('hidden');
}

function lockInAnswer(pickedIdx) {
  if (state.isLocked) return;
  state.isLocked = true;
  state.armedIndex = null;

  el.confirmBar.classList.add('hidden');
  el.answerTiles.forEach((tile) => (tile.disabled = true));

  const pickedTile = el.answerTiles[pickedIdx];
  pickedTile.classList.remove('is-armed');
  pickedTile.classList.add('is-locking');
  audio.playLockIn();

  setTimeout(() => revealAnswer(pickedIdx), 460);
}

function revealAnswer(pickedIdx) {
  const L = t();
  const q = state.deck[state.qIndex];
  const lq = getLocalizedQ(q);
  const isCorrect = pickedIdx === q.answer;
  const isFinal = state.qIndex === state.deck.length - 1;

  const pickedTile = el.answerTiles[pickedIdx];
  const correctTile = el.answerTiles[q.answer];
  pickedTile.classList.remove('is-locking');

  state.history.push({
    qObj: q,
    pickedIndex: pickedIdx,
    correctIndex: q.answer,
    isCorrect,
  });

  if (isCorrect) {
    state.correctCount += 1;
    state.score += 100;
    pickedTile.classList.add('is-correct');
    bg?.setMood('correct');
    bg?.pulseWave(isFinal ? 1.8 : 1.0);
    audio.playCorrect(isFinal);

    el.feedbackCard.classList.remove('hidden', 'is-wrong');
    el.feedbackCard.classList.add('is-correct');
    el.feedbackBadge.textContent = isFinal ? L.feedbackChampion : L.feedbackCorrect();
    el.feedbackSub.textContent = L.lectureNoteLabel;
  } else {
    pickedTile.classList.add('is-wrong');
    correctTile.classList.add('is-correct');
    bg?.setMood('wrong');
    audio.playWrong();

    el.feedbackCard.classList.remove('hidden', 'is-correct');
    el.feedbackCard.classList.add('is-wrong');
    el.feedbackBadge.textContent = L.feedbackWrong();
    el.feedbackSub.textContent = L.rightAnswerWas(LETTERS[q.answer]);
  }

  // Update live score & progress sidebar with a happy pop!
  el.hudPrize.textContent = fmtPts(state.score);
  if (isCorrect) {
    el.hudPrize.classList.remove('score-pop');
    void el.hudPrize.offsetWidth;
    el.hudPrize.classList.add('score-pop');
  }
  el.safeIndicator.textContent = L.guaranteedLabel(state.correctCount, state.history.length);
  renderLadder();

  // ALWAYS keep going until the end of the run!
  el.feedbackNote.textContent = lq.note;
  el.btnNextLabel.textContent = isFinal ? L.btnViewSummary : L.btnNext;

  el.btnNextQuestion.onclick = () => {
    audio.playClick();
    if (isFinal) {
      finishRun();
    } else {
      state.qIndex += 1;
      loadQuestion(true);
    }
  };
}

// ── Results ──
function finishRun() {
  const total = state.deck.length;
  const missedCount = total - state.correctCount;
  const best = saveBest(state.subjectId, state.score);

  state.outcome = {
    scoreValue: state.score,
    correctCount: state.correctCount,
    total,
    missedCount,
    best,
  };

  if (missedCount === 0) {
    bg?.setMood('correct');
    bg?.pulseWave(2.2);
    audio.playCorrect(true);
  } else {
    bg?.setMood('home');
  }

  switchScreen('result', renderResultScreen);
}

function renderResultScreen() {
  const L = t();
  const { scoreValue, correctCount, total, missedCount, best } = state.outcome;
  const subj = L.subjects[state.subjectId];

  if (missedCount === 0) {
    el.resultEyebrow.textContent = L.resChampionEyebrow;
    el.resultHeadline.textContent = L.resChampionHead;
  } else {
    el.resultEyebrow.textContent = L.resDoneEyebrow;
    el.resultHeadline.textContent = correctCount > 0 ? L.resSafeHead(missedCount) : L.resZeroHead;
  }

  animateScoreCount(el.resultPrize, scoreValue);
  el.statSubject.textContent = subj.short;
  el.statCorrect.textContent = `${correctCount} / ${total}`;
  el.statBest.textContent = fmtPts(best);

  // Show "Retry Missed Questions" button if there were any wrong answers!
  if (missedCount > 0) {
    el.btnRetryWrong.classList.remove('hidden');
    el.txtRetryWrong.textContent = L.btnRetryWrong(missedCount);
  } else {
    el.btnRetryWrong.classList.add('hidden');
  }

  // Sort missed questions to the top & auto-expand when there are mistakes!
  const sortedHistory = [...state.history].sort((a, b) => Number(a.isCorrect) - Number(b.isCorrect));
  el.txtReviewNotes.textContent = missedCount > 0 ? L.wrongOnlyBanner : L.allRightBanner;
  el.reviewList.innerHTML = '';

  const autoOpen = missedCount > 0;
  el.reviewList.classList.toggle('hidden', !autoOpen);
  el.btnToggleReview.setAttribute('aria-expanded', String(autoOpen));

  sortedHistory.forEach((item, idx) => {
    const lq = getLocalizedQ(item.qObj);
    const div = document.createElement('div');
    div.className = `review-item ${item.isCorrect ? '' : 'was-wrong'}`;

    const pickedLine = !item.isCorrect
      ? `<p class="review-picked">✕ ${escapeHtml(L.yourPickLabel)}: ${LETTERS[item.pickedIndex]}. ${escapeHtml(lq.options[item.pickedIndex])}</p>`
      : '';

    div.innerHTML = `
      <p class="review-q">${idx + 1}. ${escapeHtml(lq.question)}</p>
      ${pickedLine}
      <p class="review-a">✓ ${LETTERS[item.correctIndex]}. ${escapeHtml(lq.options[item.correctIndex])}</p>
      <p class="review-note">${escapeHtml(lq.note)}</p>
    `;
    el.reviewList.appendChild(div);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function copyScoreForMates() {
  if (!state.outcome) return;
  const L = t();
  const subj = L.subjects[state.subjectId];
  const msg = L.shareMsg(subj.title, state.outcome.scoreValue, state.outcome.correctCount);
  try {
    await navigator.clipboard.writeText(msg);
    showToast(L.toastCopied);
  } catch {
    showToast(msg);
  }
}

// ── Events ──
function bindEvents() {
  el.btnSplashLang.addEventListener('click', toggleLanguage);
  el.btnToggleLang.addEventListener('click', toggleLanguage);

  el.btnEnterStudio.addEventListener('click', () => {
    audio.musicEnabled = true;
    audio.startMusic(2600);
    audio.playClick();
    syncAudioUI();
    switchScreen('home');
  });

  el.btnEnterSilent.addEventListener('click', () => {
    audio.musicEnabled = false;
    audio.playClick();
    syncAudioUI();
    switchScreen('home');
  });

  el.btnBrandHome.addEventListener('click', () => {
    audio.playClick();
    toggleLadderDrawer(false);
    switchScreen('home');
  });

  el.btnToggleMusic.addEventListener('click', () => {
    audio.toggleMusic();
    syncAudioUI();
    showToast(audio.musicEnabled ? t().musicToastOn : t().musicToastOff);
  });

  el.musicVolume.addEventListener('input', (e) => audio.setVolume(e.target.value));

  el.btnToggleSfx.addEventListener('click', () => {
    audio.toggleSfx();
    syncAudioUI();
  });

  el.prefConfirm.addEventListener('change', (e) => {
    state.confirmMode = e.target.checked;
    audio.playClick();
  });

  document.querySelectorAll('.subject-card').forEach((card) => {
    const launch = () => {
      audio.playClick();
      startRun(card.dataset.subject);
    };
    card.addEventListener('click', launch);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        launch();
      }
    });
  });

  el.answerTiles.forEach((tile) => {
    tile.addEventListener('click', () => handleAnswerTap(Number(tile.dataset.index)));
  });

  el.btnCancelChoice.addEventListener('click', () => {
    audio.playClick();
    cancelArmedChoice();
  });

  el.btnLockChoice.addEventListener('click', () => {
    if (state.armedIndex !== null) lockInAnswer(state.armedIndex);
  });

  el.btnOpenLadder.addEventListener('click', () => {
    audio.playClick();
    toggleLadderDrawer();
  });
  el.btnCloseLadder.addEventListener('click', () => {
    audio.playClick();
    toggleLadderDrawer(false);
  });
  el.ladderBackdrop.addEventListener('click', () => toggleLadderDrawer(false));

  el.btnRetryWrong.addEventListener('click', () => {
    audio.playClick();
    const missedQuestions = state.history.filter((h) => !h.isCorrect).map((h) => h.qObj);
    if (missedQuestions.length > 0) {
      startRun(state.subjectId, missedQuestions);
    }
  });

  el.btnPlayAgain.addEventListener('click', () => {
    audio.playClick();
    startRun(state.subjectId);
  });
  el.btnShareScore.addEventListener('click', () => {
    audio.playClick();
    copyScoreForMates();
  });
  el.btnBackHub.addEventListener('click', () => {
    audio.playClick();
    switchScreen('home');
  });

  el.btnToggleReview.addEventListener('click', () => {
    audio.playClick();
    const expanded = el.btnToggleReview.getAttribute('aria-expanded') === 'true';
    el.btnToggleReview.setAttribute('aria-expanded', String(!expanded));
    el.reviewList.classList.toggle('hidden', expanded);
  });

  // Bubbly hover tick on desktop
  document.addEventListener(
    'pointerenter',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const target = e.target.closest?.('button, .subject-card');
      if (target && !target.disabled) audio.playHover();
    },
    true
  );

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleLadderDrawer(false);
      return;
    }

    if (e.key.toLowerCase() === 'm' && state.screen !== 'splash') {
      audio.toggleMusic();
      syncAudioUI();
      return;
    }

    if (state.screen !== 'game') return;

    const keyMap = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
    const mapped = keyMap[e.key.toLowerCase()];
    if (mapped !== undefined && !state.isLocked) {
      handleAnswerTap(mapped);
    } else if (e.key === 'Enter') {
      if (!el.feedbackCard.classList.contains('hidden')) {
        el.btnNextQuestion.click();
      } else if (state.armedIndex !== null && !state.isLocked) {
        lockInAnswer(state.armedIndex);
      }
    }
  });
}

// ── Boot ──
bindEvents();
applyLanguage();
requestAnimationFrame(() => el.screens.splash.classList.add('is-visible'));
