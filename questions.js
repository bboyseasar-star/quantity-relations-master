/* D2-QTY: evidence-backed original variants with deterministic generation. */
(function (root, factory) {
  'use strict';
  const api = factory();
  root.QuantityRelationsQuestions = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COURSE_ID = 'quantity-relations';
  const SPEC_ID = 'D2-QTY';
  const RNG_VERSION = 'mulberry32-v1';
  const QUESTION_COUNT = 10;
  const PASS_THRESHOLD = 9;
  const COVERAGE_REQUIRED_GROUPS = [
    'qty.percent',
    'qty.rate_or_ratio',
    'qty.expression',
    'qty.inequality_or_natural'
  ];

  const FORMS = [
    { templateId: 'ratio-mixture', subskillTag: 'qty.ratio', lane: 'A', evidenceYears: ['H15'], evidenceForm: '比で混ぜる2量のうち一方を求める' },
    { templateId: 'percent-of-base', subskillTag: 'qty.percent', lane: 'A', evidenceYears: ['H18', 'H19', 'H22'], evidenceForm: '基準量の指定された百分率を求める' },
    { templateId: 'percent-duration', subskillTag: 'qty.percent', lane: 'A', evidenceYears: ['H23'], evidenceForm: '全体時間の割合を分・秒で表す' },
    { templateId: 'percent-rounded', subskillTag: 'qty.percent', lane: 'A', evidenceYears: ['H24'], evidenceForm: '比較量が基準量の何％かを指定桁で求める' },
    { templateId: 'discount-price', subskillTag: 'qty.percent', lane: 'A', evidenceYears: ['H30'], evidenceForm: '割引後の代金を求める' },
    { templateId: 'natural-range', subskillTag: 'qty.natural', lane: 'B', evidenceYears: ['R05'], evidenceForm: '不等式を満たす自然数をすべて求める' },
    { templateId: 'price-expression', subskillTag: 'qty.expression', lane: 'B', evidenceYears: ['H19'], evidenceForm: '単価と個数から合計金額の文字式を作る' },
    { templateId: 'speed-expression', subskillTag: 'qty.rate', lane: 'B', evidenceYears: ['H24'], evidenceForm: '速さ・道のり・時間の関係を文字式で表す' },
    { templateId: 'verbal-inequality', subskillTag: 'qty.inequality', lane: 'B', evidenceYears: ['H30', 'R03'], evidenceForm: '言葉で示した数量関係を不等式で表す' },
    { templateId: 'chained-percent', subskillTag: 'qty.transfer', lane: 'T', evidenceYears: ['H20'], evidenceForm: '2段階の割合から数量を求める' }
  ];

  const text = value => ({ type: 'text', value: String(value) });
  const math = value => ({ type: 'math', value: String(value) });
  const parts = (...values) => values.flat();

  function fnv1a(value) {
    let hash = 2166136261;
    const source = String(value);
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function next() {
      value |= 0;
      value = value + 0x6D2B79F5 | 0;
      let result = Math.imul(value ^ value >>> 15, 1 | value);
      result = result + Math.imul(result ^ result >>> 7, 61 | result) ^ result;
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function pick(random, values) {
    return values[Math.floor(random() * values.length)];
  }

  function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function makeBase(meta, generatedParams, promptParts, answerSpec, hints, workedSolution) {
    const canonicalParams = canonical(generatedParams);
    return {
      templateId: meta.templateId,
      fingerprint: `${meta.templateId}:${fnv1a(canonicalParams).toString(16).padStart(8, '0')}`,
      courseId: COURSE_ID,
      subskillTag: meta.subskillTag,
      lane: meta.lane,
      difficulty: meta.lane === 'A' ? 1 : meta.lane === 'B' ? 2 : 3,
      generatedParams,
      promptParts,
      diagramModel: null,
      answerSpec,
      eligibleForD2Mix: true,
      evidenceYears: meta.evidenceYears.slice(),
      evidenceForm: meta.evidenceForm,
      misconceptionCodes: ['QTY-BASE', 'QTY-PERCENT', 'QTY-UNIT', 'QTY-RELATION', 'QTY-INEQ', 'QTY-NATURAL'],
      hints,
      workedSolution,
      generatorConstraints: { uniqueInterpretation: true, originalContext: true },
      provenance: { policy: 'past-exam-structure-only', copiedText: false }
    };
  }

  function numericSpec(value, displayLatex, unit, decimals = null) {
    return {
      kind: 'number',
      canonicalValue: value,
      displayParts: parts(math(displayLatex), unit ? text(` ${unit}`) : []),
      unit,
      decimals,
      formPolicy: { numericEquivalence: decimals === null, exactDecimalPlaces: decimals }
    };
  }

  function makeQuestion(meta, sessionSeed, retryIndex) {
    const templateSeed = fnv1a(`${sessionSeed >>> 0}|normal|${meta.templateId}|${meta.subskillTag}|${RNG_VERSION}`);
    const questionSeed = fnv1a(`${templateSeed}|${meta.templateId}|${retryIndex}`);
    const random = mulberry32(questionSeed);

    if (meta.templateId === 'ratio-mixture') {
      const ratio = pick(random, [[2, 1], [3, 2], [4, 3], [5, 2]]);
      const scale = pick(random, [80, 100, 120, 140, 160]);
      const first = ratio[0] * scale;
      const answer = ratio[1] * scale;
      const p = { firstRatio: ratio[0], secondRatio: ratio[1], first, answer };
      return makeBase(meta, p,
        parts(text('展示用の色紙を、紺色と白色の重さの比が '), math(`${ratio[0]}:${ratio[1]}`), text(` になるように混ぜます。紺色が ${first} g のとき、白色は何 g 必要ですか。`)),
        numericSpec(answer, String(answer), 'g'),
        [
          parts(text('比の左側と右側で、同じ何倍になっているかを見ましょう。')),
          parts(text('紺色の重さを比の左側で割ると、1あたりの重さが分かります。')),
          parts(math(`${first}\\div${ratio[0]}=${scale}`), text('より、白色は '), math(`${scale}\\times${ratio[1]}=${answer}`), text(' g です。'))
        ],
        parts(text('比の1あたりの重さを求めてから、白色の比の数をかけます。'), math(`${first}\\div${ratio[0]}\\times${ratio[1]}=${answer}`), text(' g です。')));
    }

    if (meta.templateId === 'percent-of-base') {
      const percent = pick(random, [20, 25, 30, 40, 60, 75, 80]);
      const base = pick(random, [120, 160, 200, 240, 300, 360, 400, 500]);
      const answer = base * percent / 100;
      if (!Number.isInteger(answer) || (base === 120 && percent === 80)) return makeQuestion(meta, sessionSeed, retryIndex + 1);
      const p = { base, percent, answer };
      return makeBase(meta, p,
        parts(text(`工作用テープが全部で ${base} cm あります。そのうち ${percent} % を使いました。使ったテープは何 cm ですか。`)),
        numericSpec(answer, String(answer), 'cm'),
        [
          parts(text('もとにする量は、テープ全体の長さです。')),
          parts(text('比較量＝基準量×割合。百分率は100で割ってからかけます。')),
          parts(math(`${base}\\times\\dfrac{${percent}}{100}=${answer}`), text('なので、'), math(String(answer)), text(' cm です。'))
        ],
        parts(text('基準量は全体の長さです。'), math(`${base}\\times\\dfrac{${percent}}{100}=${answer}`), text(' cm です。')));
    }

    if (meta.templateId === 'percent-duration') {
      const totalMinutes = pick(random, [60, 80, 90, 120]);
      const percent = pick(random, [35, 43, 45, 55, 65]);
      const totalSeconds = totalMinutes * 60 * percent / 100;
      if (!Number.isInteger(totalSeconds) || totalSeconds % 60 === 0 || (totalMinutes === 90 && percent === 43)) return makeQuestion(meta, sessionSeed, retryIndex + 1);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const p = { totalMinutes, percent, minutes, seconds };
      return makeBase(meta, p,
        parts(text(`架空の映像作品は全体で ${totalMinutes} 分です。そのうち音楽が流れる時間は全体の ${percent} % でした。音楽が流れる時間を何分何秒ですか。「分,秒」の順にカンマで区切って入力してください。`)),
        { kind: 'integerPair', canonicalValue: [minutes, seconds], displayParts: parts(math(String(minutes)), text(' 分 '), math(String(seconds)), text(' 秒')), unit: '分,秒', formPolicy: { orderMatters: true } },
        [
          parts(text('もとにする量は、作品全体の時間です。')),
          parts(text('まず割合分の時間を分で求め、小数部分だけ60をかけて秒に直します。')),
          parts(math(`${totalMinutes}\\times\\dfrac{${percent}}{100}=${minutes}+\\dfrac{${seconds}}{60}`), text('なので、'), math(String(minutes)), text(' 分 '), math(String(seconds)), text(' 秒です。'))
        ],
        parts(math(`${totalMinutes}\\times\\dfrac{${percent}}{100}`), text('分を計算し、小数部分を秒に直すと、'), math(String(minutes)), text(' 分 '), math(String(seconds)), text(' 秒です。')));
    }

    if (meta.templateId === 'percent-rounded') {
      const total = pick(random, [160, 240, 320, 480, 640]);
      const part = Math.floor(total * (0.16 + random() * 0.52));
      const exactRate = part * 100 / total;
      const answer = Math.round(exactRate * 10) / 10;
      if (Math.abs(exactRate - answer) < 1e-12) return makeQuestion(meta, sessionSeed, retryIndex + 1);
      const p = { total, part, exactRate, answer };
      return makeBase(meta, p,
        parts(text(`架空の体験会で ${total} 枚の参加券を用意し、${part} 枚が使われました。使われた枚数は、用意した枚数の何 % ですか。小数第2位を四捨五入して、小数第1位まで答えなさい。`)),
        numericSpec(answer, answer.toFixed(1), '%', 1),
        [
          parts(text('基準量は用意した枚数、比較量は使われた枚数です。')),
          parts(text('割合（％）＝比較量÷基準量×100で求め、指定された位まで表します。')),
          parts(math(`${part}\\div${total}\\times100=${exactRate.toFixed(3)}\\ldots`), text('なので、小数第2位を四捨五入すると '), math(answer.toFixed(1)), text(' % です。'))
        ],
        parts(text('比較量を基準量で割って100をかけます。'), math(`${part}\\div${total}\\times100=${exactRate.toFixed(3)}\\ldots`), text('なので、'), math(answer.toFixed(1)), text(' % です。')));
    }

    if (meta.templateId === 'discount-price') {
      const price = pick(random, [1200, 1800, 2400, 3200, 3600, 4800, 5400, 6000]);
      const discount = pick(random, [10, 20, 25, 30]);
      const answer = price * (100 - discount) / 100;
      if (!Number.isInteger(answer) || (price === 5400 && discount === 20)) return makeQuestion(meta, sessionSeed, retryIndex + 1);
      const p = { price, discount, answer };
      return makeBase(meta, p,
        parts(text(`ある架空の店で、工作セットの値札は ${price} 円です。${discount} % 引きで買うときの代金は何円ですか。消費税は考えないものとします。`)),
        numericSpec(answer, String(answer), '円'),
        [
          parts(text('値引き後に支払う割合は、100 % から値引き率を引いた割合です。')),
          parts(text('値札に「支払う割合」をかけます。割合は100で割ってから使います。')),
          parts(math(`${price}\\times\\dfrac{100-${discount}}{100}=${answer}`), text('なので、'), math(String(answer)), text(' 円です。'))
        ],
        parts(text('支払う割合は '), math(`${100 - discount}\\%`), text('です。'), math(`${price}\\times\\dfrac{${100 - discount}}{100}=${answer}`), text(' 円です。')));
    }

    if (meta.templateId === 'natural-range') {
      const lower = pick(random, [2, 3, 4, 5, 6, 7, 8, 9]);
      const width = pick(random, [4, 5, 6]);
      const upper = lower + width;
      if (lower === 5 && upper === 11) return makeQuestion(meta, sessionSeed, retryIndex + 1);
      const values = [];
      for (let n = lower + 1; n < upper; n += 1) values.push(n);
      const p = { lower, upper, values };
      return makeBase(meta, p,
        parts(math(`${lower}<n<${upper}`), text('を満たす自然数 '), math('n'), text('をすべて答えなさい。自然数は1以上とし、複数あるときは半角カンマで区切ってください。')),
        { kind: 'naturalSet', canonicalValue: values, displayParts: parts(math(values.join(','))), unit: '', formPolicy: { orderMatters: false, requireAll: true } },
        [
          parts(text('下の数より大きく、上の数より小さい1以上の整数を探します。')),
          parts(text('下の数の次の整数から、上の数の1つ前まで順に書きます。')),
          parts(text('当てはまる自然数は '), math(values.join(',')), text(' のすべてです。'))
        ],
        parts(text('両端は「より大きい」「より小さい」ので含みません。答えは '), math(values.join(',')), text(' です。')));
    }

    if (meta.templateId === 'price-expression') {
      const firstPrice = pick(random, [40, 50, 60, 70, 80, 90]);
      let secondPrice = pick(random, [30, 50, 70, 100, 120]);
      if (secondPrice === firstPrice) secondPrice += 20;
      if (firstPrice === 80 && secondPrice === 50) return makeQuestion(meta, sessionSeed, retryIndex + 1);
      const p = { firstPrice, secondPrice };
      const correct = `${firstPrice}a+${secondPrice}b`;
      return makeBase(meta, p,
        parts(text(`1枚 ${firstPrice} 円のカードを `), math('a'), text(` 枚、1本 ${secondPrice} 円のテープを `), math('b'), text(' 本買います。合計金額を円の単位で、'), math('a,b'), text('を使った式で表しなさい。')),
        { kind: 'linearExpression', canonicalValue: correct, displayParts: parts(math(correct), text(' 円')), unit: '円', allowedVariables: ['a', 'b'], formPolicy: { numericEquivalence: true, requireCollectedTerms: false } },
        [
          parts(text('「1個の値段×個数」を、それぞれの品物について考えます。')),
          parts(text('それぞれの代金を文字式で表し、最後に足し合わせます。')),
          parts(text('カードの代金とテープの代金を足して、'), math(correct), text(' 円です。'))
        ],
        parts(text('合計金額は、カードの代金とテープの代金の和です。答えは '), math(correct), text(' 円です。')));
    }

    if (meta.templateId === 'speed-expression') {
      const distanceFactor = pick(random, [2, 3, 4, 5, 6, 7, 8, 9]);
      const p = { speedVariable: 'x', distanceVariable: 'y', distanceFactor };
      const correct = `${distanceFactor}y/x`;
      return makeBase(meta, p,
        parts(text('一定の速さで進む架空の移動装置があります。時速 '), math('x'), text(' km で、道のりが '), math(`${distanceFactor}y`), text(' km の区間を進むとき、かかる時間を '), math('x,y'), text('を使った式で表しなさい。')),
        { kind: 'monomialExpression', canonicalValue: correct, displayParts: parts(math(`\\dfrac{${distanceFactor}y}{x}`), text(' 時間')), unit: '時間', allowedVariables: ['x', 'y'], formPolicy: { numericEquivalence: true } },
        [
          parts(text('求めるのは時間です。道のり・速さ・時間の関係を思い出しましょう。')),
          parts(text('時間は、道のりを速さで割って求めます。')),
          parts(text('時間＝道のり÷速さなので、'), math(`\\dfrac{${distanceFactor}y}{x}`), text(' 時間です。'))
        ],
        parts(text('道のりを速さで割ります。答えは '), math(`\\dfrac{${distanceFactor}y}{x}`), text(' 時間です。')));
    }

    if (meta.templateId === 'verbal-inequality') {
      const coefficient = pick(random, [2, 3, 4, 5, 6]);
      const boundary = pick(random, [5, 7, 9, 11, 13, 15]);
      if (coefficient === 4 && boundary === 7) return makeQuestion(meta, sessionSeed, retryIndex + 1);
      const p = { coefficient, boundary };
      const correct = `${coefficient}x-y>${boundary}`;
      return makeBase(meta, p,
        parts(text('架空の工作室で、1枚から '), math(String(coefficient)), text(' 個の部品を作れる板を '), math('x'), text(' 枚使い、その中から予備として '), math('y'), text(` 個を取り分けます。完成用に残る部品が ${boundary} 個より多いとき、この数量の関係を不等式で表しなさい。`)),
        { kind: 'inequality', canonicalValue: correct, displayParts: parts(math(correct)), unit: '', allowedVariables: ['x', 'y'], formPolicy: { solutionSetEquivalence: true } },
        [
          parts(text('「より大きい」に対応する不等号を考えましょう。')),
          parts(text('作った部品の総数から、予備にする個数をひいて考えます。')),
          parts(text('完成用に残る個数を式にすると、'), math(correct), text(' です。'))
        ],
        parts(text('「より大きい」は '), math('>'), text('で表します。答えは '), math(correct), text(' です。')));
    }

    const cTotal = pick(random, [200, 300, 400, 500, 600]);
    const bPercent = pick(random, [60, 70, 80, 90]);
    const aPercent = pick(random, [50, 60, 70, 80, 90]);
    const bCount = cTotal * bPercent / 100;
    const answer = bCount * aPercent / 100;
    if (!Number.isInteger(bCount) || !Number.isInteger(answer)) return makeQuestion(meta, sessionSeed, retryIndex + 1);
    const p = { cTotal, bPercent, aPercent, bCount, answer };
    return makeBase(meta, p,
      parts(text(`架空のCクラブには ${cTotal} 人います。Bクラブの人数はCクラブの ${bPercent} %、Aクラブの人数はBクラブの ${aPercent} % です。Aクラブの人数は何人ですか。`)),
      numericSpec(answer, String(answer), '人'),
      [
        parts(text('割合をかける順序に注意しましょう。まずCからBの人数を求めます。')),
        parts(text('最初の比較量を、次の計算の基準量にします。')),
        parts(text('Bクラブは '), math(`${cTotal}\\times\\dfrac{${bPercent}}{100}=${bCount}`), text(' 人。したがってAクラブは '), math(`${bCount}\\times\\dfrac{${aPercent}}{100}=${answer}`), text(' 人です。'))
      ],
      parts(text('まずCからBを求め、そのBを基準量としてAを求めます。答えは '), math(String(answer)), text(' 人です。')));
  }

  function makeSession(sessionSeed, templateIds, excludedFingerprints) {
    const requested = templateIds && templateIds.length ? templateIds.slice() : FORMS.map(form => form.templateId);
    const excluded = new Set(excludedFingerprints || []);
    const used = new Set();
    return requested.map((templateId, slotIndex) => {
      const meta = FORMS.find(form => form.templateId === templateId);
      if (!meta) throw new Error(`Unknown template: ${templateId}`);
      for (let retryIndex = 0; retryIndex < 50; retryIndex += 1) {
        const derivedSessionSeed = fnv1a(`${sessionSeed >>> 0}|${slotIndex}|${retryIndex}|${templateId}`);
        const question = makeQuestion(meta, derivedSessionSeed, retryIndex);
        if (!excluded.has(question.fingerprint) && !used.has(question.fingerprint)) {
          used.add(question.fingerprint);
          return question;
        }
      }
      throw new Error(`Unable to generate a distinct question: ${templateId}`);
    });
  }

  function toHalfWidth(value) {
    return String(value || '')
      .replace(/[０-９Ａ-Ｚａ-ｚ]/g, character => String.fromCharCode(character.charCodeAt(0) - 0xFEE0))
      .replace(/[＋]/g, '+').replace(/[－ー−]/g, '-')
      .replace(/[＊×・]/g, '*').replace(/[÷／]/g, '/')
      .replace(/[＝]/g, '=').replace(/[（]/g, '(').replace(/[）]/g, ')')
      .replace(/[．]/g, '.').replace(/[，、]/g, ',')
      .replace(/[＜]/g, '<').replace(/[＞]/g, '>')
      .replace(/[≦]/g, '≤').replace(/[≧]/g, '≥');
  }

  function prepareMathInput(value) {
    let source = toHalfWidth(value).trim();
    if (source.length > 240) throw new Error('INPUT_TOO_LONG');
    source = source.replace(/\\left|\\right|\\,|\\!|\\;|\\:/g, '')
      .replace(/\\times|\\cdot/g, '*').replace(/\\div/g, '/')
      .replace(/\\leq?|\\lt/g, match => match.startsWith('\\l') && match.includes('e') ? '≤' : '<')
      .replace(/\\geq?|\\gt/g, match => match.startsWith('\\g') && match.includes('e') ? '≥' : '>');
    for (let count = 0; count < 8; count += 1) {
      const replaced = source.replace(/\\(?:dfrac|frac)\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
      if (replaced === source) break;
      source = replaced;
    }
    if (/\\[A-Za-z]+/.test(source)) throw new Error('UNKNOWN_COMMAND');
    return source.replace(/[{}]/g, match => match === '{' ? '(' : ')').replace(/\s+/g, '');
  }

  function tokenizeExpression(source) {
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      const rest = source.slice(index);
      const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (number) {
        tokens.push({ type: 'number', value: number[0] });
        index += number[0].length;
        continue;
      }
      const character = source[index];
      if (/[a-z]/i.test(character)) tokens.push({ type: 'variable', value: character.toLowerCase() });
      else if ('+-*/()'.includes(character)) tokens.push({ type: character, value: character });
      else throw new Error('INVALID_TOKEN');
      index += 1;
      if (tokens.length > 100) throw new Error('TOO_COMPLEX');
    }
    const expanded = [];
    for (const token of tokens) {
      const previous = expanded[expanded.length - 1];
      const leftCanMultiply = previous && (previous.type === 'number' || previous.type === 'variable' || previous.type === ')');
      const rightCanMultiply = token.type === 'variable' || token.type === '(';
      if (leftCanMultiply && rightCanMultiply) expanded.push({ type: '*', value: '*' });
      expanded.push(token);
    }
    return expanded;
  }

  // 答案の「同値」は浮動小数点の近似ではなく、有理数として完全一致で判定する。
  // これにより 320 と 319.9999999 のような異なる答えを許容しない。
  const RAT_ZERO = Object.freeze({ n: 0n, d: 1n });
  const RAT_ONE = Object.freeze({ n: 1n, d: 1n });

  function gcd(left, right) {
    let a = left < 0n ? -left : left;
    let b = right < 0n ? -right : right;
    while (b) { const remainder = a % b; a = b; b = remainder; }
    return a || 1n;
  }

  function rat(numerator, denominator = 1n) {
    if (denominator === 0n) throw new Error('DIVIDE_ZERO');
    let n = numerator;
    let d = denominator;
    if (d < 0n) { n = -n; d = -d; }
    const divisor = gcd(n, d);
    return { n: n / divisor, d: d / divisor };
  }

  function ratFromDecimal(source) {
    const match = String(source).match(/^(\d*)(?:\.(\d*))?$/);
    if (!match || (!match[1] && !match[2])) throw new Error('INVALID_NUMBER');
    const integer = match[1] || '0';
    const decimal = match[2] || '';
    const denominator = 10n ** BigInt(decimal.length);
    const numerator = BigInt(`${integer}${decimal}` || '0');
    const value = rat(numerator, denominator);
    if (value.n < -1000000000n * value.d || value.n > 1000000000n * value.d) throw new Error('NUMBER_RANGE');
    return value;
  }

  function addRat(left, right) { return rat(left.n * right.d + right.n * left.d, left.d * right.d); }
  function negRat(value) { return rat(-value.n, value.d); }
  function mulRat(left, right) { return rat(left.n * right.n, left.d * right.d); }
  function divRat(left, right) { return rat(left.n * right.d, left.d * right.n); }
  function equalRat(left, right) { return left.n === right.n && left.d === right.d; }
  function isZeroRat(value) { return value.n === 0n; }
  function signRat(value) { return value.n === 0n ? 0 : value.n > 0n ? 1 : -1; }
  function isIntegerRat(value) { return value.d === 1n; }

  function addLinear(left, right, sign) {
    const coefficients = { ...left.coefficients };
    for (const [variable, value] of Object.entries(right.coefficients)) coefficients[variable] = addRat(coefficients[variable] || RAT_ZERO, sign === 1 ? value : negRat(value));
    return { constant: addRat(left.constant, sign === 1 ? right.constant : negRat(right.constant)), coefficients };
  }

  function scaleLinear(value, scalar) {
    const coefficients = {};
    for (const [variable, coefficient] of Object.entries(value.coefficients)) coefficients[variable] = mulRat(coefficient, scalar);
    return { constant: mulRat(value.constant, scalar), coefficients };
  }

  function hasVariables(value) {
    return Object.values(value.coefficients).some(coefficient => !isZeroRat(coefficient));
  }

  function parseLinear(value, allowedVariables) {
    const source = prepareMathInput(value);
    const tokens = tokenizeExpression(source);
    let position = 0;
    function peek(type) { return tokens[position] && tokens[position].type === type; }
    function factor(depth) {
      if (depth > 12) throw new Error('TOO_DEEP');
      if (peek('+') || peek('-')) {
        const negative = peek('-'); position += 1;
        return scaleLinear(factor(depth + 1), negative ? negRat(RAT_ONE) : RAT_ONE);
      }
      if (peek('number')) return { constant: ratFromDecimal(tokens[position++].value), coefficients: {} };
      if (peek('variable')) {
        const variable = tokens[position++].value;
        if (allowedVariables && !allowedVariables.includes(variable)) throw new Error('VARIABLE_NOT_ALLOWED');
        return { constant: RAT_ZERO, coefficients: { [variable]: RAT_ONE } };
      }
      if (peek('(')) {
        position += 1;
        const result = expression(depth + 1);
        if (!peek(')')) throw new Error('MISSING_PAREN');
        position += 1;
        return result;
      }
      throw new Error('EXPECTED_VALUE');
    }
    function term(depth) {
      let result = factor(depth + 1);
      while (peek('*') || peek('/')) {
        const operation = tokens[position++].type;
        const right = factor(depth + 1);
        if (operation === '*') {
          if (hasVariables(result) && hasVariables(right)) throw new Error('NON_LINEAR');
          result = hasVariables(right) ? scaleLinear(right, result.constant) : scaleLinear(result, right.constant);
        } else {
          if (hasVariables(right) || isZeroRat(right.constant)) throw new Error('INVALID_DIVISION');
          result = scaleLinear(result, divRat(RAT_ONE, right.constant));
        }
      }
      return result;
    }
    function expression(depth) {
      let result = term(depth + 1);
      while (peek('+') || peek('-')) {
        const sign = peek('+') ? 1 : -1; position += 1;
        result = addLinear(result, term(depth + 1), sign);
      }
      return result;
    }
    const result = expression(0);
    if (position !== tokens.length) throw new Error('TRAILING_TOKEN');
    return result;
  }

  function parseMonomial(value, allowedVariables) {
    const tokens = tokenizeExpression(prepareMathInput(value));
    let position = 0;
    function combine(left, right, divide) {
      if (divide && isZeroRat(right.coefficient)) throw new Error('DIVIDE_ZERO');
      const powers = { ...left.powers };
      for (const [variable, power] of Object.entries(right.powers)) powers[variable] = (powers[variable] || 0) + (divide ? -power : power);
      return { coefficient: divide ? divRat(left.coefficient, right.coefficient) : mulRat(left.coefficient, right.coefficient), powers };
    }
    function factor(depth) {
      if (depth > 12) throw new Error('TOO_DEEP');
      let sign = RAT_ONE;
      if (tokens[position] && (tokens[position].type === '+' || tokens[position].type === '-')) sign = tokens[position++].type === '-' ? negRat(RAT_ONE) : RAT_ONE;
      const token = tokens[position];
      if (!token) throw new Error('EXPECTED_VALUE');
      if (token.type === 'number') { position += 1; return { coefficient: mulRat(sign, ratFromDecimal(token.value)), powers: {} }; }
      if (token.type === 'variable') {
        position += 1;
        if (allowedVariables && !allowedVariables.includes(token.value)) throw new Error('VARIABLE_NOT_ALLOWED');
        return { coefficient: sign, powers: { [token.value]: 1 } };
      }
      if (token.type === '(') {
        position += 1;
        const nested = sequence(depth + 1);
        if (!tokens[position] || tokens[position].type !== ')') throw new Error('MISSING_PAREN');
        position += 1;
        nested.coefficient = mulRat(nested.coefficient, sign);
        return nested;
      }
      throw new Error('INVALID_MONOMIAL');
    }
    function sequence(depth) {
      let result = factor(depth + 1);
      while (tokens[position] && (tokens[position].type === '*' || tokens[position].type === '/')) {
        const divide = tokens[position++].type === '/';
        result = combine(result, factor(depth + 1), divide);
      }
      return result;
    }
    const result = sequence(0);
    if (position !== tokens.length) throw new Error('INVALID_MONOMIAL');
    return result;
  }

  function sameLinear(left, right) {
    const variables = new Set([...Object.keys(left.coefficients), ...Object.keys(right.coefficients)]);
    if (!equalRat(left.constant, right.constant)) return false;
    for (const variable of variables) if (!equalRat(left.coefficients[variable] || RAT_ZERO, right.coefficients[variable] || RAT_ZERO)) return false;
    return true;
  }

  function isCollectedLinearForm(value, expected, allowedVariables) {
    const tokens = tokenizeExpression(prepareMathInput(value));
    const expectedVariables = Object.entries(expected.coefficients)
      .filter(([, coefficient]) => !isZeroRat(coefficient))
      .map(([variable]) => variable)
      .sort();
    const seen = [];
    let depth = 0;
    let topLevelSeparators = 0;
    let currentVariables = [];
    function closeTerm() {
      if (currentVariables.length !== 1) return false;
      seen.push(currentVariables[0]);
      currentVariables = [];
      return true;
    }
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.type === '(') depth += 1;
      else if (token.type === ')') depth -= 1;
      else if (token.type === 'variable') currentVariables.push(token.value);
      else if (depth === 0 && (token.type === '+' || token.type === '-') && index > 0) {
        topLevelSeparators += 1;
        if (!closeTerm()) return false;
      }
    }
    if (topLevelSeparators === 0) return true;
    if (!closeTerm()) return false;
    if (new Set(seen).size !== seen.length) return false;
    return seen.sort().join(',') === expectedVariables.join(',')
      && seen.every(variable => allowedVariables.includes(variable));
  }

  function hasExplicitZeroTerm(value) {
    const tokens = tokenizeExpression(prepareMathInput(value));
    let depth = 0;
    let term = [];
    function isZeroTerm() {
      return term.length === 1 && term[0].type === 'number' && isZeroRat(ratFromDecimal(term[0].value));
    }
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.type === '(') depth += 1;
      if (token.type === ')') depth -= 1;
      if (depth === 0 && index > 0 && (token.type === '+' || token.type === '-')) {
        if (isZeroTerm()) return true;
        term = [];
      } else {
        term.push(token);
      }
    }
    return isZeroTerm();
  }

  function sameMonomial(left, right) {
    const variables = new Set([...Object.keys(left.powers), ...Object.keys(right.powers)]);
    if (!equalRat(left.coefficient, right.coefficient)) return false;
    for (const variable of variables) if ((left.powers[variable] || 0) !== (right.powers[variable] || 0)) return false;
    return true;
  }

  function parseInequality(value, allowedVariables) {
    const source = prepareMathInput(value).replace(/<=/g, '≤').replace(/>=/g, '≥');
    const matches = [...source.matchAll(/[<>≤≥]/g)];
    if (matches.length !== 1) throw new Error('INEQUALITY_COUNT');
    const relation = matches[0][0];
    const index = matches[0].index;
    const left = parseLinear(source.slice(0, index), allowedVariables);
    const right = parseLinear(source.slice(index + relation.length), allowedVariables);
    let vector = addLinear(left, right, -1);
    let normalizedRelation = relation;
    if (relation === '>' || relation === '≥') {
      vector = scaleLinear(vector, negRat(RAT_ONE));
      normalizedRelation = relation === '>' ? '<' : '≤';
    }
    if (!hasVariables(vector)) throw new Error('NO_VARIABLE');
    return { relation: normalizedRelation, vector };
  }

  function sameInequality(left, right) {
    if (left.relation !== right.relation) return false;
    const variables = new Set([...Object.keys(left.vector.coefficients), ...Object.keys(right.vector.coefficients)]);
    const expected = [...variables].sort().map(variable => right.vector.coefficients[variable] || RAT_ZERO).concat(right.vector.constant);
    const actual = [...variables].sort().map(variable => left.vector.coefficients[variable] || RAT_ZERO).concat(left.vector.constant);
    let ratio = null;
    for (let i = 0; i < expected.length; i += 1) {
      if (!isZeroRat(expected[i])) { ratio = divRat(actual[i], expected[i]); break; }
    }
    if (ratio === null || signRat(ratio) <= 0) return false;
    return expected.every((value, index) => equalRat(actual[index], mulRat(value, ratio)));
  }

  function numericValue(value) {
    const parsed = parseLinear(value, []);
    if (hasVariables(parsed)) throw new Error('NOT_NUMBER');
    return parsed.constant;
  }

  function grade(question, input) {
    const spec = question.answerSpec;
    const raw = toHalfWidth(input).trim();
    if (!raw) return { ok: false, code: 'INCOMPLETE_ANSWER' };
    try {
      if (spec.kind === 'number') {
        if (spec.decimals !== null && !new RegExp(`^[+-]?\\d+\\.\\d{${spec.decimals}}$`).test(raw.replace(/\s+/g, ''))) {
          return { ok: false, code: 'UNIT_FORMAT' };
        }
        return { ok: equalRat(numericValue(raw), ratFromDecimal(String(spec.canonicalValue))), code: 'QTY-BASE' };
      }
      if (spec.kind === 'integerPair') {
        const chunks = raw.split(',');
        if (chunks.length !== 2) return { ok: false, code: 'INCOMPLETE_ANSWER' };
        const values = chunks.map(value => numericValue(value));
        const ok = values.every(isIntegerRat) && values.every((value, index) => equalRat(value, ratFromDecimal(String(spec.canonicalValue[index]))));
        return { ok, code: ok ? '' : 'QTY-UNIT' };
      }
      if (spec.kind === 'naturalSet') {
        const chunks = raw.split(',');
        if (chunks.some(value => !value.trim())) return { ok: false, code: 'QTY-NATURAL' };
        const values = chunks.map(value => numericValue(value));
        if (!values.length || values.some(value => !isIntegerRat(value) || signRat(value) < 1)) return { ok: false, code: 'QTY-NATURAL' };
        const unique = [...new Map(values.map(value => [`${value.n}/${value.d}`, value])).values()].sort((a, b) => a.n < b.n ? -1 : a.n > b.n ? 1 : 0);
        const ok = unique.length === values.length && unique.length === spec.canonicalValue.length && unique.every((value, index) => equalRat(value, ratFromDecimal(String(spec.canonicalValue[index]))));
        return { ok, code: ok ? '' : 'QTY-NATURAL' };
      }
      if (spec.kind === 'linearExpression') {
        const expected = parseLinear(spec.canonicalValue, spec.allowedVariables);
        const parsed = parseLinear(raw, spec.allowedVariables);
        const collected = !spec.formPolicy.requireCollectedTerms || isCollectedLinearForm(raw, expected, spec.allowedVariables);
        const ok = collected && !hasExplicitZeroTerm(raw) && sameLinear(parsed, expected);
        return { ok, code: ok ? '' : 'QTY-RELATION' };
      }
      if (spec.kind === 'monomialExpression') {
        const ok = sameMonomial(parseMonomial(raw, spec.allowedVariables), parseMonomial(spec.canonicalValue, spec.allowedVariables));
        return { ok, code: ok ? '' : 'QTY-RELATION' };
      }
      if (spec.kind === 'inequality') {
        const ok = sameInequality(parseInequality(raw, spec.allowedVariables), parseInequality(spec.canonicalValue, spec.allowedVariables));
        return { ok, code: ok ? '' : 'QTY-INEQ' };
      }
      if (spec.kind === 'term') {
        const normalized = raw.replace(/\s+/g, '').toLowerCase();
        const accepted = [spec.canonicalValue].concat(spec.acceptedAliases || []).map(value => String(value).replace(/\s+/g, '').toLowerCase());
        return { ok: accepted.includes(normalized), code: 'TYPE_MISIDENTIFICATION' };
      }
      return { ok: false, code: 'UNCLASSIFIED' };
    } catch (error) {
      return { ok: false, code: error.message === 'INPUT_TOO_LONG' || error.message === 'TOO_COMPLEX' ? 'FORM_ERROR' : 'UNCLASSIFIED' };
    }
  }

  return {
    COURSE_ID,
    SPEC_ID,
    RNG_VERSION,
    QUESTION_COUNT,
    PASS_THRESHOLD,
    COVERAGE_REQUIRED_GROUPS,
    FORMS,
    fnv1a,
    makeSession,
    grade,
    parseLinear,
    parseMonomial,
    parseInequality,
    sameInequality,
    toHalfWidth,
    canonical
  };
}));
