(function () {
  'use strict';

  const Q = window.QuantityRelationsQuestions;
  const Handwriting = window.QuantityRelationsHandwriting;
  const app = document.getElementById('app');
  if (!Q || !app) return;
  if (Handwriting) Handwriting.mount();

  const KEYS = {
    course: `nyushi-daimon2:v2:course:${Q.COURSE_ID}`,
    history: `nyushi-daimon2:v2:history:${Q.COURSE_ID}`
  };
  const memoryStore = new Map();
  const store = {
    get(key) {
      try {
        const value = localStorage.getItem(key);
        return value === null && memoryStore.has(key) ? memoryStore.get(key) : value;
      } catch (_) { return memoryStore.get(key) || null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); memoryStore.delete(key); }
      catch (_) { memoryStore.set(key, value); }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (_) {}
      memoryStore.delete(key);
    }
  };

  let dependenciesReady = false;
  let state = { screen: 'HOME', sessionMode: 'normal', questions: [], index: 0, answers: [], hintLevel: 0, locked: false, reviewRound: 0 };

  function safeJson(key, fallback) {
    try {
      const parsed = JSON.parse(store.get(key));
      if (!parsed || parsed.schemaVersion !== 2) return fallback;
      if (parsed.rngVersion && parsed.rngVersion !== Q.RNG_VERSION) return fallback;
      return parsed;
    } catch (_) { return fallback; }
  }

  function courseData() {
    return safeJson(KEYS.course, { schemaVersion: 2, rngVersion: Q.RNG_VERSION, highestScore: 0, lastMistakes: [] });
  }

  function historyItems() {
    const data = safeJson(KEYS.history, { schemaVersion: 2, items: [] });
    return Array.isArray(data.items) ? data.items.slice(0, 20) : [];
  }

  function writeCourse(patch) {
    store.set(KEYS.course, JSON.stringify({ ...courseData(), ...patch, schemaVersion: 2, rngVersion: Q.RNG_VERSION }));
  }

  function writeHistory(items) {
    store.set(KEYS.history, JSON.stringify({ schemaVersion: 2, rngVersion: Q.RNG_VERSION, items: items.slice(0, 20) }));
  }

  function addHistory(score, status) {
    writeHistory([{ date: new Date().toLocaleString('ja-JP'), score, total: Q.QUESTION_COUNT, status }, ...historyItems()]);
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function renderParts(container, values) {
    container.replaceChildren();
    for (const part of values || []) {
      if (part.type === 'math') {
        const span = element('span');
        span.dataset.math = 'true';
        span.textContent = dependenciesReady ? `\\(${part.value}\\)` : '数式を表示できません';
        container.append(span);
      } else container.append(document.createTextNode(part.value));
    }
  }

  function typeset(container) {
    if (!dependenciesReady || !window.MathJax || typeof window.MathJax.typesetPromise !== 'function') return Promise.resolve();
    return window.MathJax.typesetPromise([container || app]).catch(() => {
      showDependencyError();
    });
  }

  function showDependencyError() {
    if (Handwriting) Handwriting.reset(false);
    dependenciesReady = false;
    app.replaceChildren();
    const section = element('section', 'screen');
    const box = element('div', 'dependency-error');
    box.append(element('h1', '', '数式機能を読み込めませんでした'));
    box.append(element('p', '', 'インターネット接続を確認し、ページを再読み込みしてください。'));
    const reload = element('button', 'primary', '再読み込み');
    reload.addEventListener('click', () => location.reload());
    box.append(reload);
    section.append(box);
    app.append(section);
  }

  function renderHome() {
    if (Handwriting) Handwriting.reset(false);
    state.screen = 'HOME';
    app.innerHTML = '<section class="home"><div class="start-area"><div class="start-content"><h1 class="app-title"><span class="title-series"><span class="emoji-icon">👹</span> 高校入試対策シリーズ</span><span class="title-course">～大問2・割合・数量関係～</span></h1><button class="primary start-button" id="start-button" disabled>▶ スタート！</button><span class="sr-only" id="dependency-status" aria-live="polite">数式機能を読み込み中です</span><a class="about-link" href="legal.html">このアプリについて</a></div></div><aside class="history-card"><h2>学習の履歴</h2><div class="history-list" id="history-list"></div><hr><button class="danger" id="reset-button">この端末の記録を消す</button></aside></section>';
    const historyList = document.getElementById('history-list');
    const items = historyItems();
    if (!items.length) historyList.append(element('p', 'history-empty', 'まだ記録はありません。'));
    else {
      for (const item of items) {
        const row = element('div', 'history-item');
        const label = item.status === 'clear' ? 'クリア' : item.status === 'interrupted' ? '中断' : '挑戦中';
        row.append(element('strong', '', `${item.score} / ${item.total || Q.QUESTION_COUNT}　${label}`));
        const time = element('time', '', item.date || '');
        row.append(time);
        historyList.append(row);
      }
    }
    const startButton = document.getElementById('start-button');
    startButton.disabled = !dependenciesReady;
    startButton.addEventListener('click', startNormal);
    document.getElementById('reset-button').addEventListener('click', () => {
      if (!confirm('このアプリの記録だけを消します。よろしいですか？')) return;
      store.remove(KEYS.course);
      store.remove(KEYS.history);
      renderHome();
    });
  }

  function startNormal() {
    if (!dependenciesReady) { showDependencyError(); return; }
    const seed = Date.now() >>> 0;
    state = { screen: 'QUESTION', sessionMode: 'normal', questions: Q.makeSession(seed), index: 0, answers: [], hintLevel: 0, locked: false, reviewRound: 0 };
    renderQuestion();
  }

  function answerInstruction(question) {
    const kind = question.answerSpec.kind;
    if (kind === 'integerPair') return '「分,秒」の順で入力';
    if (kind === 'naturalSet') return '自然数をすべて入力';
    if (kind === 'linearExpression' || kind === 'monomialExpression') return '式を入力';
    if (kind === 'inequality') return '不等式を入力';
    return '答えを入力';
  }

  function helperText(question) {
    const kind = question.answerSpec.kind;
    if (kind === 'integerPair') return '※ 例：12分34秒なら「12,34」。半角で入力してね。';
    if (kind === 'naturalSet') return '※ 複数あるときは、半角カンマで区切ってね。';
    if (kind === 'linearExpression' || kind === 'monomialExpression') return '※ 文字と数を使って式を入力してね。単位は入力しません。';
    if (kind === 'inequality') return '※ 文字と不等号を使って入力してね。';
    if (question.answerSpec.unit) return `※ ${question.answerSpec.unit} は入力欄の外に表示しています。数字だけ入力してね。`;
    return '※ 半角英数字で入力してね。';
  }

  function renderQuestion() {
    // 作り直す前の入力欄からフォーカスを外す（MathLive が外した欄を参照してエラーを出さないように）
    const oldField = document.getElementById('answer-field');
    if (oldField && typeof oldField.blur === 'function') { try { oldField.blur(); } catch (_) {} }
    state.screen = 'QUESTION';
    state.hintLevel = 0;
    state.locked = false;
    const question = state.questions[state.index];
    const total = state.questions.length;
    app.innerHTML = `<section class="screen"><header class="topbar"><button class="secondary quit-button" id="quit-button" type="button">中断</button><h1>${state.sessionMode === 'review' ? 'まちがいだけ復習' : '割合・数量関係'}</h1><span class="question-number">Q ${state.index + 1} / ${total}</span></header><div class="progress" aria-label="進捗"><span style="width:${state.index / total * 100}%"></span></div><div class="work-layout"><article class="problem-card"><div class="prompt part-line" id="prompt"></div><label class="answer-label" for="answer-field">${answerInstruction(question)}</label><div class="answer-row"><div class="input-wrap"><math-field id="answer-field" inputmode="latin" aria-label="${answerInstruction(question)}"></math-field></div><span class="answer-unit" id="answer-unit"></span></div><p class="helper">${helperText(question)}</p><div class="input-tools" id="input-tools" aria-label="入力補助"><button class="secondary" data-insert="\\frac{#0}{#?}">分数</button><button class="secondary" data-insert="x">x</button><button class="secondary" data-insert="y">y</button><button class="secondary" data-insert="a">a</button><button class="secondary" data-insert="b">b</button><button class="secondary" data-insert=",">,</button><button class="secondary" data-insert="<">&lt;</button><button class="secondary" data-insert="\\le">≦</button><button class="secondary" data-insert=">">&gt;</button><button class="secondary" data-insert="\\ge">≧</button></div><div class="submit-row"><button class="primary" id="submit-button" disabled>決定</button></div><p class="input-notice" id="input-notice" role="status" aria-live="polite"></p></article><aside class="support-card"><h2>ヒント・解説</h2><button class="secondary hint-button" id="hint-button">ヒント1を見る</button><div class="support-content" id="support-content"><p class="support-intro">必要なときだけ、ヒントを順番に見よう。</p></div><div id="feedback-area"></div></aside></div></section>`;
    app.querySelector('.screen').classList.add('question-screen');
    // 前の問題のスクロールを残さない（問題文・見出し・進み具合のバーから見せる）
    window.scrollTo(0, 0);
    if (Handwriting) Handwriting.reset(true);
    renderParts(document.getElementById('prompt'), question.promptParts);
    document.getElementById('answer-unit').textContent = question.answerSpec.unit || '';
    document.getElementById('quit-button').addEventListener('click', quitSession);
    document.getElementById('hint-button').addEventListener('click', showHint);
    document.getElementById('submit-button').addEventListener('click', submitAnswer);
    bindMathField();
    document.querySelectorAll('[data-insert]').forEach(button => button.addEventListener('click', () => insertMath(button.dataset.insert)));
    typeset(app);
  }

  function bindMathField() {
    const field = document.getElementById('answer-field');
    const submit = document.getElementById('submit-button');
    // 入力欄は問題ごとに作り直すので、欄ごとに1回だけ設定する。値の書き戻し（全角→半角）はしない（採点時にそろえる）
    // 実キーの Enter と、仮想キーボードの ↵（change）の両方で決定する。採点後は「次へ」
    bindMathFieldSubmit(field, () => {
      if (state.locked) { const button = document.getElementById('submit-button'); if (button) button.click(); }
      else submitAnswer();
    });
    followVirtualKeyboard(() => state.locked
      ? [document.querySelector('.submit-row'), document.querySelector('#feedback-area .feedback')]
      : [document.querySelector('.answer-row'), document.getElementById('input-notice'), document.querySelector('.submit-row')]);
    customElements.whenDefined('math-field').then(() => {
      submit.disabled = false;
      // 空白キーを「\:」として残し、「3 4」が 34 に化けて採点されないようにする（採点で「区切ろう」と促す）
      try { field.mathModeSpace = '\\:'; } catch (_) {}
      field.setAttribute('inputmode', 'latin');
      field.addEventListener('focus', () => {
        field.setAttribute('inputmode', 'latin');
        const textarea = field.shadowRoot && field.shadowRoot.querySelector('textarea');
        if (textarea) {
          textarea.setAttribute('inputmode', 'latin');
          textarea.setAttribute('autocorrect', 'off');
          textarea.setAttribute('lang', 'en');
        }
      });
      // 仮想キーボードの ↵ は、決定（change）の約50ms後に input（insertLineBreak）を出すので、そのときは一言を消さない
      field.addEventListener('input', event => { if (event && event.inputType === 'insertLineBreak') return; clearNotice(); });
      field.focus();
      // キーボードが開いたままなら、入力欄と決定ボタンがキーボードの上に来るよう合わせる
      if (followVirtualKeyboard.update) followVirtualKeyboard.update();
    }).catch(showDependencyError);
  }

  // 欄ごとに1回だけ。GraderCore.setupMathField の onEnter（実キー）と、欄にフォーカスがあるときの change（仮想キーボードの ↵）。
  // 400ms 以内の2回目は無視する（二重採点を防ぐ）
  function bindMathFieldSubmit(mf, onSubmit) {
    if (!mf || mf.dataset.submitBound) return;
    mf.dataset.submitBound = '1';
    let last = 0;
    const fire = () => { const now = Date.now(); if (now - last < 400) return; last = now; onSubmit(); };
    if (window.GraderCore) window.GraderCore.setupMathField(mf, { onEnter: event => { if (!event.repeat) fire(); } });
    mf.addEventListener('change', () => {
      const focused = typeof mf.hasFocus === 'function' ? mf.hasFocus() : document.activeElement === mf;
      if (focused) fire();
    });
  }

  // 仮想キーボードが出ている間は <html> に vk-open と --vk-height を付けて高さ固定をゆるめ（style.css）、
  // getTargets() の要素がキーボードの上に見えるようにスクロールする。閉じたら先頭へ戻す。1回だけ設定する
  function followVirtualKeyboard(getTargets) {
    const vk = window.mathVirtualKeyboard;
    if (!vk || followVirtualKeyboard.bound) return;
    followVirtualKeyboard.bound = true;
    followVirtualKeyboard.getTargets = getTargets;
    const update = () => {
      const height = Math.round((vk.boundingRect && vk.boundingRect.height) || 0);
      const open = vk.visible !== false && height > 0;
      const root = document.documentElement;
      const was = root.classList.contains('vk-open');
      root.classList.toggle('vk-open', open);
      root.style.setProperty('--vk-height', `${open ? height : 0}px`);
      if (!open) { if (was) { if (!revealFeedbackOnNarrow()) window.scrollTo(0, 0); } return; }
      requestAnimationFrame(() => {
        const targets = (followVirtualKeyboard.getTargets() || []).filter(Boolean);
        if (!targets.length) return;
        const rects = targets.map(target => target.getBoundingClientRect());
        const top = Math.min(...rects.map(rect => rect.top));
        const bottom = Math.max(...rects.map(rect => rect.bottom));
        const visibleBottom = window.innerHeight - height - 8;
        let dy = 0;
        if (bottom > visibleBottom) dy = bottom - visibleBottom;
        if (top - dy < 8) dy = top - 8;
        if (dy) window.scrollBy(0, dy);
      });
    };
    vk.addEventListener('geometrychange', update);
    vk.addEventListener('virtual-keyboard-toggle', update); // geometrychange が来ず、これだけが来ることがある
    window.addEventListener('resize', update);
    followVirtualKeyboard.update = update;
  }

  // 1列になる狭い画面では、判定が入力欄より下に出るので、採点後は判定の先頭まで送る。送ったら true
  function revealFeedbackOnNarrow() {
    if (!state.locked || !window.matchMedia('(max-width: 760px)').matches) return false;
    const feedback = document.querySelector('#feedback-area .feedback');
    if (!feedback) return false;
    feedback.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return true;
  }

  function insertMath(latex) {
    const field = document.getElementById('answer-field');
    if (!field || state.locked) return;
    const options = { selectionMode: 'placeholder', focus: true };
    let inserted = false;
    try { if (typeof field.insert === 'function') { field.insert(latex, options); inserted = true; } } catch (_) {}
    if (!inserted) { try { field.executeCommand(['insert', latex, options]); } catch (_) {} }
    field.focus();
  }

  function clearNotice() {
    const notice = document.getElementById('input-notice');
    if (notice) notice.textContent = '';
  }

  function showNotice(message) {
    const notice = document.getElementById('input-notice');
    if (notice) notice.textContent = message || '答えを入力してから決定しよう。';
    if (followVirtualKeyboard.update) followVirtualKeyboard.update();
  }

  function appendHint(parts, level, final) {
    const support = document.getElementById('support-content');
    const section = element('section', `hint-step${final ? ' final' : ''}`);
    const heading = element('div', 'hint-heading');
    if (!final) heading.append(element('span', 'hint-badge', String(level)));
    heading.append(element('strong', '', final ? '答え・解説' : `ヒント${level}`));
    const content = element('div', 'part-line');
    renderParts(content, parts);
    section.append(heading, content);
    support.append(section);
    typeset(section).then(() => support.scrollTo({ top: support.scrollHeight, behavior: 'smooth' }));
  }

  function showHint() {
    if (state.locked) return;
    const question = state.questions[state.index];
    if (state.hintLevel < 2) {
      state.hintLevel += 1;
      appendHint(question.hints[state.hintLevel - 1], state.hintLevel, false);
      document.getElementById('hint-button').textContent = state.hintLevel === 1 ? 'ヒント2を見る' : '答えを見る';
      return;
    }
    showFinalHintDialog(question);
  }

  function showFinalHintDialog(question) {
    const dialog = element('dialog', 'quit-dialog final-hint-dialog');
    const card = element('div', 'quit-dialog-card');
    card.append(element('h2', '', '答えを表示しますか？'));
    card.append(element('p', '', '答えを表示すると、この問題はギブアップ（不正解）で確定します。'));
    const actions = element('div', 'quit-dialog-actions');
    const continueButton = element('button', 'secondary', '問題に戻る');
    continueButton.type = 'button';
    continueButton.addEventListener('click', () => dialog.close());
    const revealButton = element('button', 'danger quit-confirm-button', '答えを表示する');
    revealButton.type = 'button';
    revealButton.addEventListener('click', () => {
      dialog.remove();
      state.hintLevel = 3;
      appendHint(question.hints[2], 3, true);
      lockAndRecord({ status: 'wrong', kind: 'wrong', reason: 'GIVE_UP', message: '', code: 'GIVE_UP' }, 'GIVE_UP');
    });
    actions.append(continueButton, revealButton);
    card.append(actions);
    dialog.append(card);
    app.append(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
  }

  function submitAnswer() {
    if (state.locked) return;
    const field = document.getElementById('answer-field');
    const raw = String(field.value || '');
    const result = Q.gradeAnswer(state.questions[state.index], raw);
    // 空欄・書きかけは採点しない（消費しない・ロックしない・記録しない）
    if (!Q.consumes(result)) { showNotice(result.message); field.focus(); return; }
    lockAndRecord(result, raw);
  }

  // 正しい答え（\dfrac）と同じ大きさで見せる
  function displayLatex(latex) { return String(latex).replace(/\\frac(?![A-Za-z])/g, '\\dfrac'); }

  function safeMathInput(raw) {
    if (!raw || raw === 'GIVE_UP') return null;
    if (/[^0-9a-zA-Z+\-*/.,<>=≤≥(){}%\\\s]/.test(raw)) return null;
    const commands = raw.match(/\\[A-Za-z]+/g) || [];
    return commands.every(command => ['\\frac', '\\dfrac', '\\left', '\\right', '\\times', '\\cdot', '\\div', '\\le', '\\leq', '\\ge', '\\geq', '\\lt', '\\gt', '\\leqq', '\\geqq', '\\mathrm', '\\operatorname', '\\text'].includes(command)) ? raw.replace(/(^|[^\\])%/g, '$1\\%') : null;
  }

  function appendUserAnswer(container, raw) {
    if (!raw || raw === 'GIVE_UP') { container.append(document.createTextNode(raw === 'GIVE_UP' ? 'ヒント3を使用' : '未入力')); return; }
    // 末尾の単位（\text{時間}・円 など）は数式から外して文字で添える（生の LaTeX を出さない）
    const unitMatch = String(raw).match(/^([\s\S]*?)\s*(?:\\text\s*\{([^{}]*)\}|([\u3040-\u30FF\u3400-\u9FFF々]+))\s*$/);
    if (unitMatch && unitMatch[1] && safeMathInput(unitMatch[1])) {
      const span = element('span', 'part-line');
      renderParts(span, [ { type: 'math', value: displayLatex(safeMathInput(unitMatch[1])) }, { type: 'text', value: ` ${unitMatch[2] || unitMatch[3]}` } ]);
      container.append(span);
      return;
    }
    const safe = safeMathInput(raw);
    if (safe) { const span = element('span', 'part-line'); renderParts(span, [ { type: 'math', value: displayLatex(safe) } ]); container.append(span); }
    else container.append(element('code', '', raw.slice(0, 120)));
  }

  function feedbackPoint(code) {
    const points = {
      'QTY-BASE': 'もとにする量と、それと比べる量を確認しよう。',
      'QTY-PERCENT': '％は100をもとにした割合です。',
      'QTY-UNIT': '分と秒など、単位をそろえて確認しよう。',
      'QTY-RELATION': 'それぞれの量に対応する式を順に確認しよう。',
      'QTY-INEQ': '「以上」「以下」「より大きい」「未満」と不等号を対応させよう。',
      'QTY-NATURAL': '自然数は1以上の整数です。範囲内を1つずつ確認しよう。',
      'UNIT_FORMAT': '指定された小数の位まで書こう。',
      'INCOMPLETE_ANSWER': '答えを入力してから決定しよう。',
      'GIVE_UP': '解説で確認した考え方を、結果後の別数値復習で使ってみよう。'
    };
    return points[code] || '条件と求める量の対応を、もう1度確認しよう。';
  }

  function wrongCode(question) {
    const codes = { number: 'QTY-BASE', integerPair: 'QTY-UNIT', naturalSet: 'QTY-NATURAL', linearExpression: 'QTY-RELATION', monomialExpression: 'QTY-RELATION', inequality: 'QTY-INEQ' };
    return codes[question.answerSpec.kind] || '';
  }

  function feedbackStyle(result) {
    if (result.status === 'correct') return { className: '', title: '○ 正解', short: '○ 正解' };
    if (result.status === 'negDenominator') return { className: ' is-neg', title: '△ 書き直そう（正解には数えません）', short: '△ 書き直そう' };
    if (result.status === 'notReduced' && result.kind === 'unfinished') return { className: ' is-unfinished', title: '× 不正解（あと一歩）', short: '× 不正解（あと一歩）' };
    if (result.status === 'notReduced') return { className: ' is-notation', title: '× 不正解（書き方）', short: '× 不正解（書き方）' };
    return { className: ' is-wrong', title: '× 不正解', short: '× 不正解' };
  }

  function lockAndRecord(result, raw) {
    if (state.locked) return;
    state.locked = true;
    state.lockedAt = Date.now();
    clearNotice();
    const question = state.questions[state.index];
    const ok = result.status === 'correct';
    const code = result.code === 'GIVE_UP' ? 'GIVE_UP' : ok ? '' : wrongCode(question);
    const recordedRaw = code === 'GIVE_UP' ? 'GIVE_UP' : raw;
    state.answers.push({ question, ok, code, raw: recordedRaw, status: result.status, kind: result.kind, message: result.status === 'wrong' ? '' : result.message || '' });
    const field = document.getElementById('answer-field');
    field.setAttribute('readonly', '');
    const submit = document.getElementById('submit-button');
    submit.disabled = false;
    submit.textContent = state.index + 1 === state.questions.length ? '結果を見る' : '次へ';
    submit.removeEventListener('click', submitAnswer);
    // 採点から 500ms は「次へ」を受け付けない（Enter のすばやい2回押しで判定を見ないまま進まないように）
    const onNext = () => {
      if (Date.now() - state.lockedAt < NEXT_GUARD_MS) return;
      submit.removeEventListener('click', onNext);
      nextQuestion();
    };
    submit.addEventListener('click', onNext);
    document.getElementById('hint-button').disabled = true;
    document.querySelectorAll('[data-insert]').forEach(button => { button.disabled = true; });

    const area = document.getElementById('feedback-area');
    const style = feedbackStyle(result);
    const feedback = element('section', `feedback${style.className}`);
    feedback.append(element('h3', '', style.title));
    if (!ok) {
      if (result.message) feedback.append(element('p', 'feedback-message', result.message));
      const yours = element('p'); yours.append(document.createTextNode('あなたの答え：')); appendUserAnswer(yours, recordedRaw); feedback.append(yours);
      const correct = element('p'); correct.append(document.createTextNode('正しい答え：')); const answer = element('span', 'part-line'); renderParts(answer, question.answerSpec.displayParts); correct.append(answer); feedback.append(correct);
      if (result.status === 'wrong') feedback.append(element('p', '', `確認ポイント：${feedbackPoint(code)}`));
      const solution = element('div', 'part-line'); renderParts(solution, question.workedSolution); feedback.append(solution);
    } else feedback.append(element('p', '', 'その調子。次の問題へ進みましょう。'));
    area.append(feedback);
    const wasTyping = document.activeElement === field;
    typeset(area).then(() => {
      if (followVirtualKeyboard.update && document.documentElement.classList.contains('vk-open')) followVirtualKeyboard.update();
      else revealFeedbackOnNarrow();
    });
    if (wasTyping) submit.focus({ preventScroll: true });
  }

  const NEXT_GUARD_MS = 500;

  function nextQuestion() {
    state.index += 1;
    if (state.index < state.questions.length) renderQuestion();
    else finishSession();
  }

  function finishSession() {
    state.screen = 'RESULT';
    const score = state.answers.filter(answer => answer.ok).length;
    if (state.sessionMode === 'normal') {
      const failed = state.answers.filter(answer => !answer.ok).map(answer => ({ templateId: answer.question.templateId, subskillTag: answer.question.subskillTag, fingerprint: answer.question.fingerprint }));
      writeCourse({ highestScore: Math.max(courseData().highestScore || 0, score), lastMistakes: failed });
      addHistory(score, score >= Q.PASS_THRESHOLD ? 'clear' : 'challenging');
    }
    renderResult(score);
    if (state.sessionMode === 'normal' && score >= Q.PASS_THRESHOLD) showConfetti();
  }

  function renderResult(score) {
    if (Handwriting) Handwriting.reset(false);
    const failures = state.answers.filter(answer => !answer.ok);
    app.innerHTML = `<section class="screen"><header class="topbar"><span></span><h1>結果</h1><span></span></header><article class="result-card"><div class="score">${score} / ${state.questions.length}</div><div class="result-list" id="result-list"></div><div class="result-actions" id="result-actions"></div></article></section>`;
    const list = document.getElementById('result-list');
    state.answers.forEach((answer, index) => {
      const item = element('div', 'result-item');
      const style = feedbackStyle({ status: answer.status || (answer.ok ? 'correct' : 'wrong'), kind: answer.kind });
      item.append(element('span', `result-mark ${answer.ok ? 'ok' : 'ng'}${style.className}`, `Q${index + 1} ${style.short}`));
      if (answer.message) item.append(element('div', `result-judge${style.className}`, answer.message));
      const yours = element('div'); yours.append(document.createTextNode('自分の答え：')); appendUserAnswer(yours, answer.raw); item.append(yours);
      const correct = element('div'); correct.append(document.createTextNode('正答：')); const answerView = element('span', 'part-line'); renderParts(answerView, answer.question.answerSpec.displayParts); correct.append(answerView); item.append(correct);
      list.append(item);
    });
    const actions = document.getElementById('result-actions');
    if (failures.length) {
      const review = element('button', 'primary', 'まちがいだけ復習');
      review.addEventListener('click', startReview);
      actions.append(review);
    }
    const again = element('button', 'secondary', 'もう一度');
    again.addEventListener('click', startNormal);
    const home = element('button', 'secondary', 'ホームへ');
    home.addEventListener('click', renderHome);
    actions.append(again, home);
    typeset(app);
  }

  function startReview() {
    const failed = state.answers.filter(answer => !answer.ok);
    const templateIds = failed.map(answer => answer.question.templateId);
    const excluded = failed.map(answer => answer.question.fingerprint);
    const nextRound = state.reviewRound + 1;
    const seed = Q.fnv1a(`${Date.now() >>> 0}|review|${nextRound}|${templateIds.join('|')}`);
    state = { screen: 'QUESTION', sessionMode: 'review', questions: Q.makeSession(seed, templateIds, excluded), index: 0, answers: [], hintLevel: 0, locked: false, reviewRound: nextRound };
    renderQuestion();
  }

  function quitSession() {
    const message = state.sessionMode === 'normal' ? '中断してホームへ戻りますか？' : '復習をやめてホームへ戻りますか？';
    const dialog = element('dialog', 'quit-dialog');
    const card = element('div', 'quit-dialog-card');
    card.append(element('h2', '', '学習を中断しますか？'));
    card.append(element('p', '', message));
    const actions = element('div', 'quit-dialog-actions');
    const continueButton = element('button', 'secondary', '学習を続ける');
    continueButton.type = 'button';
    continueButton.addEventListener('click', () => dialog.close());
    const quitButton = element('button', 'danger quit-confirm-button', '中断してホームへ');
    quitButton.type = 'button';
    quitButton.addEventListener('click', () => {
      if (state.sessionMode === 'normal') addHistory(state.answers.filter(answer => answer.ok).length, 'interrupted');
      renderHome();
    });
    actions.append(continueButton, quitButton);
    card.append(actions);
    dialog.append(card);
    app.append(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
  }

  function showConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = element('div', 'confetti');
    layer.setAttribute('aria-hidden', 'true');
    const colors = ['#4b3f91', '#796bc1', '#e0a31b', '#1f7a62', '#d25a4b'];
    for (let index = 0; index < 34; index += 1) {
      const piece = element('i');
      piece.style.left = `${(index * 37) % 101}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.animationDelay = `${(index % 9) * .07}s`;
      piece.style.setProperty('--drift', `${((index * 19) % 90) - 45}px`);
      layer.append(piece);
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 3300);
  }

  function waitForDependencies() {
    const started = Date.now();
    function check() {
      const mathLiveReady = Boolean(customElements.get('math-field'));
      const mathJaxReady = Boolean(window.MathJax && typeof window.MathJax.typesetPromise === 'function');
      if (mathLiveReady && mathJaxReady) {
        dependenciesReady = true;
        const start = document.getElementById('start-button');
        const status = document.getElementById('dependency-status');
        if (start) start.disabled = false;
        if (status) status.textContent = '数式機能の準備ができました';
        return;
      }
      if (Date.now() - started > 10000) {
        const status = document.getElementById('dependency-status');
        if (status) status.textContent = '数式機能を読み込めませんでした';
        return;
      }
      setTimeout(check, 100);
    }
    check();
  }

  renderHome();
  waitForDependencies();
}());
