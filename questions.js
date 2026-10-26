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
      .replace(/[＋]/g, '+').replace(/[％]/g, '%').replace(/[－ー−]/g, '-')
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

  /* ===== 採点（2026-10-23 判定の方針に合わせて作り直し） =====
   * gradeAnswer(question, raw) は DOM に触らず { status, kind, reason, message, flags } を返す。
   *   status: correct / notReduced（kind: unfinished＝途中 か notation＝書き方）/ negDenominator / wrong / unreadable / empty
   *   empty・unreadable は採点しない（消費しない・記録しない）。
   * 値は BigInt の有理数で厳密に比べる（許容誤差なし）。値が合ったときだけ、書き方・途中を点検する。
   * 空欄の判定と全角・記号のゆれのそろえ方は GraderCore（grader-core.js）を使う。 */
  function graderCore() {
    if (typeof GraderCore !== 'undefined') return GraderCore; // eslint-disable-line no-undef
    if (typeof require === 'function') return require('./grader-core.js');
    throw new Error('grader-core.js が読み込まれていません');
  }

  const STATUS = { CORRECT: 'correct', NOT_REDUCED: 'notReduced', NEG_DEN: 'negDenominator', WRONG: 'wrong', UNREADABLE: 'unreadable', EMPTY: 'empty' };
  const UNFINISHED = ['DOUBLE_NEGATIVE', 'NOT_EXPANDED', 'NOT_COLLECTED', 'UNEVALUATED_CONSTANT', 'FRACTION_NESTED', 'FRACTION_NOT_REDUCED', 'VAR_REPEATED'];
  const NOTATION = ['DOUBLE_SIGN', 'MIXED_NUMBER', 'LEADING_DOT', 'LEADING_ZERO', 'NOTATION_DIV', 'NOTATION_TIMES', 'NOTATION_ORDER', 'NOTATION_ONE', 'ZERO_COEFFICIENT_TERM', 'DUPLICATE_SOLUTION', 'DECIMAL_PLACES'];
  const MESSAGES = {
    DOUBLE_NEGATIVE: 'あと一歩：符号を整理しよう',
    NOT_EXPANDED: 'あと一歩：かっこをはずして整理しよう',
    NOT_COLLECTED: 'あと一歩：同じ文字の項・数の項をまとめよう',
    NOT_COLLECTED_NUMBER: 'あと一歩：計算を最後までしよう',
    UNEVALUATED_CONSTANT: 'あと一歩：数どうしの計算を最後までしよう',
    FRACTION_NESTED: 'あと一歩：分数の中の小数や分数をなくそう',
    FRACTION_NOT_REDUCED: 'あと一歩：約分しよう',
    VAR_REPEATED: 'あと一歩：同じ文字の積や商を整理しよう',
    DOUBLE_SIGN: '書き方：＋と－を続けて書かないよ。符号を1つにしよう',
    MIXED_NUMBER: '書き方：帯分数は使わずに書こう',
    LEADING_DOT: '書き方：.5 ではなく 0.5 のように書こう',
    LEADING_ZERO: '書き方：数の先頭に 0 を付けないよ',
    NOTATION_DIV: '書き方：わり算の記号 ÷ は使わずに、分数の形で書こう',
    NOTATION_TIMES: '書き方：かけ算の記号 × は省いて書こう',
    NOTATION_ORDER: '書き方：数は文字の前に、文字はアルファベット順に書こう',
    NOTATION_ONE: '書き方：係数の 1 は書かないよ',
    ZERO_COEFFICIENT_TERM: '書き方：0 の項は書かないよ',
    DUPLICATE_SOLUTION: '書き方：同じ数は1回だけ書こう',
    DECIMAL_PLACES: '書き方：指定された小数の位までちょうど書こう',
    NEGATIVE_DENOMINATOR: '値は合っています。マイナスは分子か分数の前に書こう',
    unit: '単位や数を確かめよう',
    badVariable: '問題で使う文字だけで表そう',
    NOT_ROUNDED: '小数第2位を四捨五入しよう',
    relation: '不等号の向きと、等号をふくむかどうかを確かめよう',
    NO_RELATION: '不等号を使って表そう',
    count: '答えの数（個数）を確かめよう',
    empty: '答えを入力してから決定しよう',
    INCOMPLETE: '書きかけのところがあるよ。最後まで書いてから決定しよう',
    SPACED_DIGITS: '数と数の間はカンマ（,）で区切ろう',
    EQUALS: '答えだけを書こう（= は使わないよ）',
    SEPARATOR: '答えは1つだけ書こう',
    SYNTAX: '式（数）として読み取れませんでした。入力を見直そう',
    INEQ_ONLY: '不等式だけを書こう（言葉や単位は付けないよ）',
    ANSWER_ONLY: '答えだけを書こう（「です」などは付けないよ）',
    UNIT_ONCE: '単位は最後に1回だけ書こう',
    PAIR_SPLIT: '分と秒に分けて、「分,秒」の順に書こう'
  };

  function ReadErr(reason) { this.reason = reason; }
  function SemErr(reason) { this.reason = reason; }

  function makeResult(status, reason, extra) {
    let kind = 'wrong';
    if (status === STATUS.CORRECT) kind = 'correct';
    else if (status === STATUS.NEG_DEN) kind = 'negDenominator';
    else if (status === STATUS.EMPTY || status === STATUS.UNREADABLE) kind = 'incomplete';
    else if (status === STATUS.NOT_REDUCED) kind = UNFINISHED.includes(reason) ? 'unfinished' : 'notation';
    const result = { status, kind, reason: reason || '', message: '' };
    if (extra) Object.assign(result, extra);
    if (!result.message) result.message = MESSAGES[result.messageKey || reason] || (status === STATUS.UNREADABLE ? MESSAGES.SYNTAX : '');
    return result;
  }

  /* ---- 入力の下ごしらえ ---- */
  const TIMES_RE = /\\times(?![A-Za-z])|\\cdot(?![A-Za-z])|\\ast(?![A-Za-z])|[×＊*·⋅・]/;
  const DIV_RE = /\\div(?![A-Za-z])|÷/;
  const TRAILING_WORD_RE = /(?:\\text\s*\{[^{}]*\}|\\mathrm\s*\{[^{}]*\}|[぀-ヿ㐀-鿿々]+)\s*$/;

  function unitVariants(units) {
    const out = [];
    for (const unit of units || []) {
      const u = toHalfWidth(unit);
      out.push(`\\text{${u}}`, `\\mathrm{${u}}`, `\\operatorname{${u}}`, `\\ ${u}`, u);
    }
    return out.sort((a, b) => b.length - a.length);
  }

  // 末尾の単位を外す。許した単位なら { s }、ほかの単位らしい語が付いていれば { s, otherUnit:true }
  function stripUnit(source, units) {
    const s = source.replace(/\s+$/, '');
    for (const candidate of unitVariants(units)) {
      if (s.length > candidate.length && s.slice(-candidate.length) === candidate) return { s: s.slice(0, -candidate.length) };
    }
    const match = s.match(TRAILING_WORD_RE);
    if (match && match.index > 0) {
      // ひらがなを含む（「です」「ではない」など）のは単位ではなく文。採点せず答えだけを書いてもらう
      return { s: s.slice(0, match.index), otherUnit: true, sentence: /[\u3040-\u309F]/.test(match[0]) };
    }
    return { s };
  }

  // raw → { s, times, div, otherUnit } または { result }（空欄・読めない）
  function prepare(raw, units) {
    const GC = graderCore();
    const text = raw == null ? '' : String(raw);
    if (GC.isBlank(text)) return { result: makeResult(STATUS.EMPTY, 'empty') };
    if (GC.hasEmptySlot(text)) return { result: makeResult(STATUS.UNREADABLE, 'INCOMPLETE') };
    if (text.length > 240) return { result: makeResult(STATUS.UNREADABLE, 'TOO_LONG') };
    const times = TIMES_RE.test(text);
    const div = DIV_RE.test(text);
    const half = toHalfWidth(text).replace(/\\%/g, '%').replace(/\{,\}/g, ',')
      .replace(/\\(d?frac)\s+([A-Za-z0-9])/g, '\\$1{$2}') // \frac x2（TeX の省略形）
      // MathLive がキー入力の cm・kg を \operatorname{\mathrm{cm}} にするので、英字の単位はほどく
      .replace(/\\operatorname\s*\{\s*\\mathrm\s*\{([A-Za-z]*)\}\s*\}/g, '$1')
      .replace(/\\(?:operatorname|mathrm|text)\s*\{([A-Za-z%]*)\}/g, '$1');
    const stripped = stripUnit(half, units);
    if (stripped.sentence) return { result: makeResult(STATUS.UNREADABLE, 'ANSWER_ONLY') };
    const japaneseUnits = (units || []).map(toHalfWidth).filter(u => /[^\x00-\x7F]/.test(u));
    if (japaneseUnits.some(u => stripped.s.includes(u))) return { result: makeResult(STATUS.UNREADABLE, 'UNIT_ONCE') };
    const normalized = GC.normalize(stripped.s);
    if (normalized.empty) return { result: makeResult(STATUS.UNREADABLE, 'INCOMPLETE') };
    if (normalized.error) {
      const reason = normalized.error === 'spacedDigits' ? 'SPACED_DIGITS' : normalized.error === 'emptySlot' ? 'INCOMPLETE' : 'SYNTAX';
      return { result: makeResult(STATUS.UNREADABLE, reason) };
    }
    return { s: normalized.s, times, div, otherUnit: !!stripped.otherUnit, trailing: !!stripped.otherUnit };
  }

  /* ---- 構文木 ---- */
  function parseTree(src, vars) {
    let pos = 0;
    let depth = 0;
    const flags = new Set();
    const peek = () => src.charAt(pos);
    const isFracAt = () => src.substr(pos, 5) === '\\frac' && !/[A-Za-z]/.test(src.charAt(pos + 5));
    function enter() { depth += 1; if (depth > 10) throw new ReadErr('SYNTAX'); }
    function numNode(textValue) {
      if (textValue.replace('.', '').length > 15) throw new ReadErr('SYNTAX');
      const [whole, decimal = ''] = textValue.split('.');
      const value = rat(BigInt(`${whole || '0'}${decimal}` || '0'), 10n ** BigInt(decimal.length));
      if (/^\./.test(textValue)) flags.add('LEADING_DOT');
      if (/^0\d/.test(textValue)) flags.add('LEADING_ZERO');
      return { t: 'num', text: textValue, isInt: !textValue.includes('.'), v: value };
    }
    function varNode(name) {
      if (vars && !vars.includes(name)) throw new SemErr('badVariable');
      return { t: 'var', name };
    }
    function startsFactor() {
      const ch = peek();
      return ch === '(' || ch === '[' || ch === '{' || isFracAt() || /[a-z0-9.]/.test(ch);
    }
    function expr() {
      let node = term();
      while (peek() === '+' || peek() === '-') {
        const op = src.charAt(pos); pos += 1;
        if (pos >= src.length) throw new ReadErr('INCOMPLETE');
        node = { t: op === '+' ? 'add' : 'sub', a: node, b: term() };
      }
      return node;
    }
    function term() {
      let node = unary();
      for (;;) {
        const ch = peek();
        if (ch === '*' || ch === '/') {
          pos += 1;
          if (pos >= src.length) throw new ReadErr('INCOMPLETE');
          node = { t: ch === '*' ? 'mul' : 'div', a: node, b: unary() };
          continue;
        }
        if (!startsFactor()) return node;
        const right = power();
        if (node.t === 'num' && right.t === 'frac' && isNumeric(right)) {
          node = { t: 'mixed', whole: node, frac: right };
          flags.add('MIXED_NUMBER');
          continue;
        }
        node = { t: 'mul', a: node, b: right, implicit: true };
      }
    }
    function unary() {
      const ch = peek();
      if (ch === '+' || ch === '-') {
        pos += 1;
        if (pos >= src.length) throw new ReadErr('INCOMPLETE');
        if (peek() === '+' || peek() === '-') flags.add('DOUBLE_SIGN');
        return { t: ch === '-' ? 'neg' : 'pos', x: unary() };
      }
      return power();
    }
    function power() {
      const base = atom();
      if (peek() !== '^') return base;
      pos += 1;
      let exponent;
      if (peek() === '{') exponent = group('{', '}');
      else if (/[0-9]/.test(peek())) { exponent = numNode(src.charAt(pos)); pos += 1; }
      else throw new ReadErr(pos >= src.length ? 'INCOMPLETE' : 'SYNTAX');
      return { t: 'pow', a: base, e: exponent };
    }
    function group(open, close) {
      pos += 1; enter();
      if (peek() === close) throw new ReadErr('INCOMPLETE');
      const inner = expr();
      if (src.charAt(pos) !== close) throw new ReadErr(pos >= src.length ? 'INCOMPLETE' : 'SYNTAX');
      pos += 1; depth -= 1;
      return { t: 'paren', x: inner, brace: open === '{' };
    }
    function fracArg() {
      if (peek() === '{') return group('{', '}');
      const ch = peek();
      if (/[0-9]/.test(ch)) { pos += 1; return numNode(ch); }
      if (/[a-z]/.test(ch)) { pos += 1; return varNode(ch); }
      throw new ReadErr(pos >= src.length ? 'INCOMPLETE' : 'SYNTAX');
    }
    function atom() {
      const ch = peek();
      if (ch === '(') return group('(', ')');
      if (ch === '[') return group('[', ']');
      if (ch === '{') return group('{', '}');
      if (isFracAt()) {
        pos += 5; enter();
        const num = fracArg();
        const den = fracArg();
        depth -= 1;
        return { t: 'frac', num, den };
      }
      const rest = src.slice(pos);
      if (/^\d+\.(?!\d)/.test(rest)) throw new ReadErr('INCOMPLETE'); // 「5.」
      const match = rest.match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
      if (match) { pos += match[0].length; return numNode(match[0]); }
      if (/[a-z]/.test(ch)) { pos += 1; return varNode(ch); }
      throw new ReadErr(ch ? 'SYNTAX' : 'INCOMPLETE');
    }
    if (src === '') throw new ReadErr('INCOMPLETE');
    const tree = expr();
    if (pos !== src.length) throw new ReadErr('SYNTAX');
    return { tree, flags };
  }

  function isNumeric(node) {
    if (!node) return true;
    if (node.t === 'var') return false;
    return [node.x, node.a, node.b, node.num, node.den, node.e, node.whole, node.frac].every(child => child === undefined || isNumeric(child));
  }

  /* ---- 値（文字の累乗の積を単位にした多項式。分母は単項式だけ） ---- */
  function polyConst(value) { return isZeroRat(value) ? new Map() : new Map([['', value]]); }
  function keyOf(powers) {
    return Object.keys(powers).filter(name => powers[name] !== 0).sort().map(name => `${name}^${powers[name]}`).join('*');
  }
  function powersOf(key) {
    const powers = {};
    if (!key) return powers;
    for (const part of key.split('*')) { const [name, power] = part.split('^'); powers[name] = Number(power); }
    return powers;
  }
  function polyAdd(left, right, sign) {
    const out = new Map(left);
    for (const [key, value] of right) {
      const sum = addRat(out.get(key) || RAT_ZERO, sign < 0 ? negRat(value) : value);
      if (isZeroRat(sum)) out.delete(key); else out.set(key, sum);
    }
    return out;
  }
  function polyMul(left, right) {
    let out = new Map();
    for (const [leftKey, leftValue] of left) {
      for (const [rightKey, rightValue] of right) {
        const powers = powersOf(leftKey);
        for (const [name, power] of Object.entries(powersOf(rightKey))) powers[name] = (powers[name] || 0) + power;
        out = polyAdd(out, new Map([[keyOf(powers), mulRat(leftValue, rightValue)]]), 1);
      }
    }
    if (out.size > 60) throw new ReadErr('SYNTAX');
    return out;
  }
  function polyDiv(left, right) {
    if (right.size === 0) throw new ReadErr('DIV_ZERO');
    if (right.size !== 1) throw new SemErr('value'); // 多項式でわる形は、この単元の答えにならない
    const [[key, value]] = [...right];
    const powers = powersOf(key);
    for (const name of Object.keys(powers)) powers[name] = -powers[name];
    return polyMul(left, new Map([[keyOf(powers), divRat(RAT_ONE, value)]]));
  }
  function polyEqual(left, right) {
    if (left.size !== right.size) return false;
    for (const [key, value] of left) if (!right.has(key) || !equalRat(right.get(key), value)) return false;
    return true;
  }
  function evaluate(node) {
    switch (node.t) {
      case 'num': return polyConst(node.v);
      case 'var': return new Map([[`${node.name}^1`, RAT_ONE]]);
      case 'paren': case 'pos': return evaluate(node.x);
      case 'neg': return polyMul(evaluate(node.x), polyConst(negRat(RAT_ONE)));
      case 'add': return polyAdd(evaluate(node.a), evaluate(node.b), 1);
      case 'sub': return polyAdd(evaluate(node.a), evaluate(node.b), -1);
      case 'mul': return polyMul(evaluate(node.a), evaluate(node.b));
      case 'div': return polyDiv(evaluate(node.a), evaluate(node.b));
      case 'frac': return polyDiv(evaluate(node.num), evaluate(node.den));
      case 'mixed': return polyAdd(evaluate(node.whole), evaluate(node.frac), 1);
      case 'pow': {
        const exponent = evaluate(node.e);
        const e = exponent.size === 0 ? RAT_ZERO : exponent.get('');
        if (!e || exponent.size > 1 || !isIntegerRat(e) || e.n < 0n || e.n > 9n) throw new SemErr('value');
        let out = polyConst(RAT_ONE);
        for (let i = 0n; i < e.n; i += 1n) out = polyMul(out, evaluate(node.a));
        return out;
      }
      default: throw new ReadErr('SYNTAX');
    }
  }

  /* ---- 書き方・途中の点検（値が合ったときだけ） ---- */
  function stripParens(node) { let n = node; while (n.t === 'paren') n = n.x; return n; }
  function stripSigns(node) {
    let n = node; let negatives = 0;
    for (;;) {
      if (n.t === 'neg') { negatives += 1; n = n.x; } else if (n.t === 'pos') n = n.x; else if (n.t === 'paren' && stripParens(n).t !== 'add' && stripParens(n).t !== 'sub') n = n.x; else break;
    }
    return { negatives, core: n };
  }
  // 先頭の因数に付いた負号の数（-2y は mul(neg 2, y) と読むので、かけ算の左端までたどる）
  function leadingNegatives(node) {
    const n = stripParens(node);
    if (n.t === 'neg') return 1 + leadingNegatives(n.x);
    if (n.t === 'pos') return leadingNegatives(n.x);
    if (n.t === 'mul') return leadingNegatives(n.a);
    return 0;
  }

  // 一番外側の項に分ける（式全体を囲むかっこは許す。項の中のかっこ付きの和は「かっこが残っている」）
  function topTerms(node, out, flags) {
    const n = node.t === 'paren' ? stripParens(node) : node;
    if (n.t === 'add' || n.t === 'sub') {
      topTerms(n.a, out, flags);
      const b = n.b;
      if (b.t === 'paren') {
        const inner = stripParens(b);
        if (inner.t === 'add' || inner.t === 'sub') flags.add('NOT_EXPANDED');
        else if (inner.t === 'pos' || leadingNegatives(inner) > 0) flags.add('DOUBLE_SIGN'); // 60a+(-50b)
      }
      out.push(b);
      return out;
    }
    out.push(n);
    return out;
  }

  // 1つの項を、かけ算の並び（数・文字・それ以外）と分子・分母の数・文字に分けて点検する
  function inspectTerm(termNode, flags) {
    const numerator = { nums: [], vars: [] };
    const denominator = { nums: [], vars: [] };
    let negatives = 0;
    let fracDepth = 0;
    let looseOne = false; // 分数の外の、かけ算の中の係数 1（1a、1\frac{x}{2}）
    function addFactor(node, inDen, chain) {
      const box = inDen ? denominator : numerator;
      const signs = stripSigns(node);
      negatives += signs.negatives;
      const n = signs.core;
      if (n.t === 'paren') { flags.add('NOT_EXPANDED'); chain.push('other'); return; }
      if (n.t === 'num') {
        box.nums.push(n); chain.push('num');
        if (fracDepth === 0 && n.text === '1') looseOne = true;
        return;
      }
      if (n.t === 'mixed') { box.nums.push({ t: 'num', isInt: false, v: RAT_ONE, mixed: true }); chain.push('num'); return; }
      if (n.t === 'var') { box.vars.push(n.name); chain.push(`var:${n.name}`); return; }
      if (n.t === 'pow') {
        const base = stripParens(n.a);
        if (base.t === 'var') { box.vars.push(base.name); chain.push(`var:${base.name}`); return; }
        flags.add('UNEVALUATED_CONSTANT'); chain.push(base.t === 'num' ? 'num' : 'other'); return;
      }
      if (n.t === 'mul') { walkChain(n.a, inDen, chain); walkChain(n.b, inDen, chain); return; }
      if (n.t === 'div' || n.t === 'frac') {
        const top = n.t === 'frac' ? n.num : n.a;
        const bottom = n.t === 'frac' ? n.den : n.b;
        if (inDen) flags.add('FRACTION_NESTED');
        const topSigns = leadingNegatives(top);
        const bottomSigns = leadingNegatives(bottom);
        if (topSigns > 0 && bottomSigns > 0) flags.add('DOUBLE_NEGATIVE');
        else if (bottomSigns > 0) flags.add('NEG_DEN');
        // 分数の中は分子・分母それぞれ別の並びとして見る。分数ごと「数」か「文字」かを外の並びへ伝える
        const innerChain = [];
        fracDepth += 1;
        walkChain(top, inDen, innerChain);
        walkChain(bottom, !inDen, []);
        fracDepth -= 1;
        chain.push(innerChain[0] === 'num' ? 'num' : 'other');
        return;
      }
      chain.push('other');
    }
    function walkChain(node, inDen, chain) {
      const n = stripSigns(node);
      if (n.core.t === 'mul') {
        negatives += n.negatives;
        const sub = [];
        walkChain(n.core.a, inDen, sub);
        walkChain(n.core.b, inDen, sub);
        checkOrder(sub);
        chain.push(...sub);
        return;
      }
      addFactor(node, inDen, chain);
    }
    function checkOrder(chain) {
      let seenNonNumber = false;
      let lastVar = '';
      for (const item of chain) {
        if (item === 'num') { if (seenNonNumber) flags.add('NOTATION_ORDER'); }
        else {
          seenNonNumber = true;
          if (item.startsWith('var:')) {
            const name = item.slice(4);
            if (lastVar && name < lastVar) flags.add('NOTATION_ORDER');
            lastVar = name;
          }
        }
      }
    }
    const chain = [];
    walkChain(termNode, false, chain);
    checkOrder(chain);
    if (looseOne && chain.length > 1) flags.add('NOTATION_ONE');
    if (negatives >= 2) flags.add('DOUBLE_SIGN');

    if (numerator.nums.length > 1 || denominator.nums.length > 1) flags.add('UNEVALUATED_CONSTANT');
    const p = numerator.nums[0];
    const q = denominator.nums[0];
    if (q) {
      if (!q.isInt || (p && !p.isInt)) flags.add('FRACTION_NESTED');
      else if (q.v.n === 1n) flags.add(q.text === '1' && denominator.vars.length ? 'NOTATION_ONE' : 'FRACTION_NOT_REDUCED');
      else if (p && gcd(p.v.n, q.v.n) !== 1n) flags.add('FRACTION_NOT_REDUCED');
    }
    if (p && !q && p.isInt && !p.mixed && p.v.n === 1n && numerator.vars.length && numerator.nums.length === 1) flags.add('NOTATION_ONE');
    if (p && isZeroRat(p.v) && (numerator.vars.length || denominator.vars.length)) flags.add('ZERO_COEFFICIENT_TERM');
    const seen = new Set();
    for (const name of numerator.vars) { if (seen.has(name)) flags.add('VAR_REPEATED'); seen.add(name); }
    const seenDen = new Set();
    for (const name of denominator.vars) {
      if (seen.has(name)) flags.add('FRACTION_NOT_REDUCED');
      if (seenDen.has(name)) flags.add('VAR_REPEATED');
      seenDen.add(name);
    }
  }

  // 式（1辺）の点検。flags に理由を足す
  function inspectExpression(tree, flags) {
    const terms = topTerms(tree, [], flags);
    const keys = new Map();
    for (const termNode of terms) {
      inspectTerm(termNode, flags);
      let value;
      try { value = evaluate(termNode); } catch (_) { continue; }
      if (value.size === 0) { if (terms.length > 1) flags.add('ZERO_COEFFICIENT_TERM'); continue; }
      if (value.size > 1) { flags.add('NOT_EXPANDED'); continue; }
      const key = [...value.keys()][0];
      if (keys.has(key)) flags.add('NOT_COLLECTED');
      keys.set(key, true);
    }
  }

  function verdict(flags, options) {
    const opts = options || {};
    for (const reason of UNFINISHED) {
      if (flags.has(reason)) {
        const messageKey = reason === 'NOT_COLLECTED' && opts.numberAnswer ? 'NOT_COLLECTED_NUMBER' : reason;
        return makeResult(STATUS.NOT_REDUCED, reason, { flags: [...flags], messageKey });
      }
    }
    for (const reason of NOTATION) if (flags.has(reason)) return makeResult(STATUS.NOT_REDUCED, reason, { flags: [...flags] });
    if (flags.has('NEG_DEN')) return makeResult(STATUS.NEG_DEN, 'NEGATIVE_DENOMINATOR', { flags: [...flags] });
    return makeResult(STATUS.CORRECT, '', { flags: [...flags] });
  }

  // 1つの式を読んで、値と点検の flags を返す
  function readExpression(src, vars, prepared) {
    const parsed = parseTree(src, vars);
    const flags = parsed.flags;
    if (prepared && prepared.times) flags.add('NOTATION_TIMES');
    if (prepared && prepared.div) flags.add('NOTATION_DIV');
    return { tree: parsed.tree, value: evaluate(parsed.tree), flags };
  }

  function guarded(fn) {
    try { return fn(); } catch (error) {
      if (error instanceof ReadErr) return makeResult(STATUS.UNREADABLE, error.reason);
      if (error instanceof SemErr) return makeResult(STATUS.WRONG, error.reason);
      return makeResult(STATUS.UNREADABLE, 'SYNTAX');
    }
  }

  const answerCache = new Map();
  function expectedValue(text, vars) {
    const key = `${text}|${(vars || []).join(',')}`;
    if (!answerCache.has(key)) {
      const s = graderCore().normalize(String(text)).s;
      if (!s) throw new Error(`模範解答が読めません: ${text}`);
      answerCache.set(key, evaluate(parseTree(s, vars).tree));
    }
    return answerCache.get(key);
  }

  // 「1,920」の3桁区切りを外す
  function stripThousands(s) {
    return /^[+]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s;
  }

  function decimalPlacesOf(src) {
    const s = src.replace(/^[+]/, '');
    const match = s.match(/^\d+(?:\.(\d+))?$/);
    return match ? (match[1] || '').length : null;
  }

  function unitsFor(spec) {
    const table = { g: ['g', 'グラム'], cm: ['cm', 'センチメートル', 'センチ'], '%': ['%', 'パーセント'], 円: ['円'], 人: ['人'], 時間: ['時間'] };
    return table[spec.unit] || (spec.unit ? [spec.unit] : []);
  }

  function gradeNumberAnswer(question, raw) {
    const spec = question.answerSpec;
    const prepared = prepare(raw, unitsFor(spec));
    if (prepared.result) return prepared.result;
    let s = stripThousands(prepared.s);
    if (/^[a-z]=/.test(s) || s.includes('=')) return makeResult(STATUS.UNREADABLE, 'EQUALS');
    if (/[,<>≤≥]/.test(s)) return makeResult(STATUS.UNREADABLE, 'SEPARATOR');
    return guarded(() => {
      let read;
      try { read = readExpression(s, [], prepared); } catch (error) {
        if (error instanceof SemErr && error.reason === 'badVariable') throw new SemErr('unit');
        throw error;
      }
      const expected = polyConst(ratFromDecimal(String(spec.canonicalValue)));
      if (!polyEqual(read.value, expected)) {
        if (spec.decimals !== null && spec.decimals !== undefined && question.generatedParams && question.generatedParams.part !== undefined) {
          const exact = rat(BigInt(question.generatedParams.part) * 100n, BigInt(question.generatedParams.total));
          const scale = 10n ** BigInt(spec.decimals);
          const truncated = rat((exact.n * scale) / exact.d, scale);
          if (polyEqual(read.value, polyConst(exact)) || polyEqual(read.value, polyConst(truncated))) return makeResult(STATUS.WRONG, 'NOT_ROUNDED');
        }
        return makeResult(STATUS.WRONG, read.value.size && [...read.value.keys()].some(Boolean) ? 'unit' : 'value');
      }
      if (prepared.otherUnit) return makeResult(STATUS.WRONG, 'unit');
      inspectExpression(read.tree, read.flags);
      const result = verdict(read.flags, { numberAnswer: true });
      if (result.status === STATUS.CORRECT && spec.decimals !== null && spec.decimals !== undefined && decimalPlacesOf(s) !== spec.decimals) {
        return makeResult(STATUS.NOT_REDUCED, 'DECIMAL_PLACES', { message: `書き方：小数第${spec.decimals}位まで書こう` });
      }
      return result;
    });
  }

  // 「12,34」「12分34秒」「12分,34秒」
  function gradePairAnswer(question, raw) {
    const spec = question.answerSpec;
    const text = raw == null ? '' : String(raw);
    const GC = graderCore();
    if (GC.isBlank(text)) return makeResult(STATUS.EMPTY, 'empty');
    let source = toHalfWidth(text).replace(/\\(?:text|mathrm)\s*\{([^{}]*)\}/g, '$1').replace(/\\ /g, '');
    source = source.replace(/\s*秒\s*$/, '').replace(/分\s*,?\s*/g, ',');
    const prepared = prepare(source, []);
    if (prepared.result) return prepared.result;
    const chunks = prepared.s.split(',');
    if (chunks.some(chunk => chunk === '')) return makeResult(STATUS.UNREADABLE, 'INCOMPLETE');
    if (chunks.length === 1) return makeResult(STATUS.UNREADABLE, 'PAIR_SPLIT');
    if (chunks.length !== 2) return makeResult(STATUS.WRONG, 'count');
    return guarded(() => {
      const flags = new Set();
      let allMatch = true;
      chunks.forEach((chunk, index) => {
        const read = readExpression(chunk, [], prepared);
        if (!polyEqual(read.value, polyConst(ratFromDecimal(String(spec.canonicalValue[index]))))) allMatch = false;
        inspectExpression(read.tree, read.flags);
        read.flags.forEach(flag => flags.add(flag));
      });
      if (!allMatch) return makeResult(STATUS.WRONG, 'value');
      if (prepared.otherUnit) return makeResult(STATUS.WRONG, 'unit');
      return verdict(flags, { numberAnswer: true });
    });
  }

  // 自然数をすべて答える（順不同。n= は付けてもよい）
  function gradeSetAnswer(question, raw) {
    const spec = question.answerSpec;
    const prepared = prepare(raw, []);
    if (prepared.result) return prepared.result;
    const s = prepared.s.replace(/^n=/, '');
    const chunks = s.split(',').map(chunk => chunk.replace(/^n=/, ''));
    if (chunks.some(chunk => chunk === '')) return makeResult(STATUS.UNREADABLE, 'INCOMPLETE');
    if (chunks.some(chunk => /[=<>≤≥]/.test(chunk))) return makeResult(STATUS.UNREADABLE, 'SYNTAX');
    return guarded(() => {
      const flags = new Set();
      const values = chunks.map(chunk => {
        const read = readExpression(chunk, [], prepared);
        inspectExpression(read.tree, read.flags);
        read.flags.forEach(flag => flags.add(flag));
        if (read.value.size > 1 || [...read.value.keys()].some(Boolean)) throw new SemErr('value');
        return read.value.get('') || RAT_ZERO;
      });
      const keyOfValue = value => `${value.n}/${value.d}`;
      const expected = new Set(spec.canonicalValue.map(value => keyOfValue(ratFromDecimal(String(value)))));
      const given = new Set(values.map(keyOfValue));
      if (given.size !== expected.size || [...given].some(key => !expected.has(key))) {
        return makeResult(STATUS.WRONG, given.size < expected.size ? 'missing' : 'value', { messageKey: 'count' });
      }
      if (values.length !== given.size) flags.add('DUPLICATE_SOLUTION');
      if (prepared.otherUnit) return makeResult(STATUS.WRONG, 'unit');
      return verdict(flags, { numberAnswer: true });
    });
  }

  // 文字式（合計金額・時間）
  function gradeExpressionAnswer(question, raw) {
    const spec = question.answerSpec;
    const prepared = prepare(raw, unitsFor(spec));
    if (prepared.result) return prepared.result;
    if (prepared.s.includes('=')) return makeResult(STATUS.UNREADABLE, 'EQUALS');
    if (/[,<>≤≥]/.test(prepared.s)) return makeResult(STATUS.UNREADABLE, 'SEPARATOR');
    return guarded(() => {
      const read = readExpression(prepared.s, spec.allowedVariables, prepared);
      if (!polyEqual(read.value, expectedValue(spec.canonicalValue, spec.allowedVariables))) return makeResult(STATUS.WRONG, 'value');
      if (prepared.otherUnit) return makeResult(STATUS.WRONG, 'unit');
      inspectExpression(read.tree, read.flags);
      return verdict(read.flags);
    });
  }

  // 不等式。左右の入れ替え・移項・両辺の正の数倍（負の数倍は向きを変えたもの）を同じとみる
  function linearVector(value) {
    const vector = { constant: RAT_ZERO, coefficients: {} };
    for (const [key, coefficient] of value) {
      if (key === '') vector.constant = coefficient;
      else if (/^[a-z]\^1$/.test(key)) vector.coefficients[key[0]] = coefficient;
      else throw new SemErr('value');
    }
    return vector;
  }
  function inequalityOf(left, right, relation) {
    let vector = linearVector(polyAdd(left, right, -1));
    let normalized = relation;
    if (relation === '>' || relation === '≥') {
      vector = scaleLinear(vector, negRat(RAT_ONE));
      normalized = relation === '>' ? '<' : '≤';
    }
    if (!hasVariables(vector)) throw new SemErr('value');
    return { relation: normalized, vector };
  }
  function gradeInequalityAnswer(question, raw) {
    const spec = question.answerSpec;
    const prepared = prepare(raw, []);
    if (prepared.result) {
      return prepared.result.reason === 'ANSWER_ONLY' ? makeResult(STATUS.UNREADABLE, 'INEQ_ONLY') : prepared.result;
    }
    if (prepared.otherUnit) return makeResult(STATUS.UNREADABLE, 'INEQ_ONLY');
    const s = prepared.s;
    if (s.includes(',')) return makeResult(STATUS.UNREADABLE, 'SEPARATOR');
    const relations = [...s.matchAll(/[<>≤≥=]/g)];
    if (!relations.length) {
      const read = guarded(() => { readExpression(s, spec.allowedVariables, prepared); return null; });
      return read && read.status === STATUS.UNREADABLE ? read : makeResult(STATUS.WRONG, 'NO_RELATION');
    }
    if (relations.length > 1) return makeResult(STATUS.WRONG, 'relation');
    const relation = relations[0][0];
    const leftSource = s.slice(0, relations[0].index);
    const rightSource = s.slice(relations[0].index + 1);
    if (!leftSource || !rightSource) return makeResult(STATUS.UNREADABLE, 'INCOMPLETE');
    return guarded(() => {
      const left = readExpression(leftSource, spec.allowedVariables, prepared);
      const right = readExpression(rightSource, spec.allowedVariables, prepared);
      if (relation === '=') return makeResult(STATUS.WRONG, 'relation');
      const expectedSource = graderCore().normalize(spec.canonicalValue).s;
      const expectedMatch = expectedSource.match(/[<>≤≥]/);
      const expected = inequalityOf(
        evaluate(parseTree(expectedSource.slice(0, expectedMatch.index), spec.allowedVariables).tree),
        evaluate(parseTree(expectedSource.slice(expectedMatch.index + 1), spec.allowedVariables).tree),
        expectedMatch[0]);
      const actual = inequalityOf(left.value, right.value, relation);
      if (!sameInequality(actual, expected)) {
        const flipped = { relation: actual.relation === '<' ? '≤' : '<', vector: actual.vector };
        return makeResult(STATUS.WRONG, sameInequality(flipped, expected) ? 'relation' : 'value');
      }
      const flags = new Set();
      inspectExpression(left.tree, left.flags);
      inspectExpression(right.tree, right.flags);
      left.flags.forEach(flag => flags.add(flag));
      right.flags.forEach(flag => flags.add(flag));
      return verdict(flags);
    });
  }

  function gradeAnswer(question, raw) {
    const kind = question && question.answerSpec && question.answerSpec.kind;
    if (kind === 'number') return gradeNumberAnswer(question, raw);
    if (kind === 'integerPair') return gradePairAnswer(question, raw);
    if (kind === 'naturalSet') return gradeSetAnswer(question, raw);
    if (kind === 'linearExpression' || kind === 'monomialExpression') return gradeExpressionAnswer(question, raw);
    if (kind === 'inequality') return gradeInequalityAnswer(question, raw);
    throw new Error(`知らない答えの種類: ${kind}`);
  }

  // 誤答のときに画面へ出す「確認ポイント」のコード（従来の誤答分類）
  const WRONG_CODES = { number: 'QTY-BASE', integerPair: 'QTY-UNIT', naturalSet: 'QTY-NATURAL', linearExpression: 'QTY-RELATION', monomialExpression: 'QTY-RELATION', inequality: 'QTY-INEQ' };

  // 従来の呼び方（tests.mjs など）。ok は ○ のときだけ true
  function grade(question, input) {
    const result = gradeAnswer(question, input);
    let code = '';
    if (result.status === STATUS.EMPTY || result.status === STATUS.UNREADABLE) code = 'INCOMPLETE_ANSWER';
    else if (result.reason === 'DECIMAL_PLACES') code = 'UNIT_FORMAT';
    else if (result.status !== STATUS.CORRECT) code = WRONG_CODES[question.answerSpec.kind] || 'UNCLASSIFIED';
    return Object.assign({ ok: result.status === STATUS.CORRECT, code }, result);
  }

  // 採点して消費する（記録・ロックする）結果か。空欄・書きかけは false
  function consumes(result) {
    return !!result && result.status !== STATUS.EMPTY && result.status !== STATUS.UNREADABLE;
  }
  function mark(result) {
    const status = result && result.status;
    return status === STATUS.CORRECT ? '○' : status === STATUS.NEG_DEN ? '△' : '×';
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
    gradeAnswer,
    consumes,
    mark,
    MESSAGES,
    parseLinear,
    parseMonomial,
    parseInequality,
    sameInequality,
    toHalfWidth,
    canonical
  };
}));

// DOM に触らない採点関数（回帰テストと main.js が使う）。{ status, kind, reason, message, flags } を返す
function gradeAnswer(question, raw) { // eslint-disable-line no-unused-vars
  return QuantityRelationsQuestions.gradeAnswer(question, raw); // eslint-disable-line no-undef
}
