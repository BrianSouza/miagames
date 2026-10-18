(function () {
  'use strict';

  // Camada de apresentação do "Colorir": canvas, pincel, paleta e ponte com o Flutter.
  // As regras ficam em paint-logic.js (testado com `node --test`).
  //
  // Camadas (empilhadas): #base (forma clara) · #paint (tinta recortada pela máscara) · #outline (contorno).
  // A tinta é desenhada sem recorte numa camada interna e só aparece onde a máscara (#mask, a forma da
  // letra) deixa: é assim que ela nunca sai do contorno.
  var Logic = window.PaintLogic;
  var Utils = window.GameUtils;
  var Sounds = window.GameSounds;
  var Bridge = window.GameBridge;
  var GameResult = window.GameResult;

  var FONT = "'Andika', 'Trebuchet MS', 'Verdana', sans-serif";
  var OUTLINE_COLOR = '#1565C0';
  var BASE_COLOR = '#EEF3F8';
  var MOVES_PER_CHECK = 10;     // a cobertura é conferida a cada tantos movimentos do dedo
  var HINT_AFTER_EXITS = 3;
  var LINE_GAP = 1.12;          // a altura de uma linha, em vezes a altura das letras
  var SWATCH_GAP = 12;
  var MAX_SWATCH = 72;

  // ── Estado ────────────────────────────────────────────────────────────────────
  var state = null;
  var best = null;
  var advanceTimer = null;
  var color = Logic.COLORS[0];
  var geo = null;               // medidas e dados da forma atual
  var drawing = null;           // { last, wasInside, moves } enquanto o dedo está na tela
  var hinted = false;

  // ── DOM ───────────────────────────────────────────────────────────────────────
  var areaEl = document.getElementById('canvas-area');
  var wrapEl = document.getElementById('canvas-wrap');
  var pictureEl = document.getElementById('picture');
  var statusEl = document.getElementById('status');
  var miaEl = document.getElementById('mia');
  var askerEl = document.getElementById('asker');
  var paletteEl = document.getElementById('palette');
  var paletteAreaEl = document.getElementById('palette-area');
  var maskCanvas = document.getElementById('mask');
  var baseCanvas = document.getElementById('base');
  var paintCanvas = document.getElementById('paint');
  var outlineCanvas = document.getElementById('outline');
  var layer = document.createElement('canvas');   // a tinta, sem recorte
  var tolCanvas = document.createElement('canvas'); // a forma "engordada" pela tolerância

  var ctx = {
    mask: maskCanvas.getContext('2d', { willReadFrequently: true }),
    base: baseCanvas.getContext('2d'),
    paint: paintCanvas.getContext('2d', { willReadFrequently: true }),
    outline: outlineCanvas.getContext('2d'),
    layer: layer.getContext('2d'),
    tol: tolCanvas.getContext('2d', { willReadFrequently: true }),
  };

  // ── Ponte com o Flutter ───────────────────────────────────────────────────────
  Bridge.onInit(function (data) {
    Sounds.setEnabled(data.sound !== false);
    best = data.best || null;
    startGame(data.level);
  });

  var speak = Bridge.speak;
  var header = window.GameKit.createHeader({ onReset: resetGame, onListen: listen });
  GameResult.init({ onAgain: resetGame, onHome: Bridge.back });
  askerEl.addEventListener('click', listen);

  // ── Ciclo de vida ─────────────────────────────────────────────────────────────
  function startGame(level) {
    clearTimeout(advanceTimer);   // uma pausa pendente não pode atingir o jogo novo
    advanceTimer = null;
    var previousRound = state ? state.round : 0;
    state = Logic.createGame(level || (state && state.level), { previousRound: previousRound });
    GameResult.hide();
    header.setTotal(state.total);
    header.setDone(0);
    renderPalette();
    showItem();
  }

  function resetGame() {
    startGame(state ? state.level : 1);
  }

  function prompt() {
    return Logic.promptFor(Logic.currentItem(state));
  }

  function listen() {
    if (state) speak(prompt());
  }

  function setMia(pose) {
    miaEl.src = '../_shared/img/mia_' + pose + '.svg';
  }

  // ── Paleta ────────────────────────────────────────────────────────────────────
  function renderPalette() {
    paletteEl.innerHTML = '';
    Logic.COLORS.forEach(function (c) {
      var el = document.createElement('button');
      el.className = 'swatch' + (c === color ? ' selected' : '');
      el.style.setProperty('--c', c.value);
      el.setAttribute('data-color', c.id);
      el.setAttribute('role', 'radio');
      el.setAttribute('aria-checked', c === color ? 'true' : 'false');
      el.setAttribute('aria-label', c.name);
      el.addEventListener('click', function () { pickColor(c); });
      paletteEl.appendChild(el);
    });
    layoutPalette();
  }

  function pickColor(c) {
    color = c;
    Array.prototype.forEach.call(paletteEl.children, function (el) {
      var on = el.getAttribute('data-color') === c.id;
      el.classList.toggle('selected', on);
      el.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    Sounds.play('flip');
    speak(c.name);
  }

  function layoutPalette() {
    var style = getComputedStyle(paletteAreaEl);
    var width = paletteAreaEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var height = paletteAreaEl.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    var grid = Utils.bestGrid(paletteEl.children.length, width, height, SWATCH_GAP);
    var size = Math.min(grid.size, MAX_SWATCH);
    paletteEl.style.gridTemplateColumns = 'repeat(' + grid.cols + ', ' + size + 'px)';
    paletteEl.style.gap = SWATCH_GAP + 'px';
    paletteEl.style.setProperty('--opt-size', size + 'px');
  }

  // ── A forma ───────────────────────────────────────────────────────────────────
  /** Desenha a forma atual: mede a área, ajusta a letra ao espaço e prepara máscara, camadas e contorno */
  function showItem() {
    var item = Logic.currentItem(state);
    hinted = false;
    drawing = null;
    wrapEl.removeAttribute('data-ready');
    setMia('happy');
    statusEl.textContent = 'Forma ' + (state.index + 1) + ' de ' + state.total + '. ' + prompt();

    var isWord = item.kind === 'word';
    pictureEl.classList.toggle('hidden', !isWord);
    if (isWord) pictureEl.src = '../missing-syllable/img/' + item.id + '.svg';

    // A fonte precisa estar carregada antes de medir e desenhar o texto
    document.fonts.load('700 100px Andika', item.text).then(function () {
      if (state && Logic.currentItem(state) === item) setupShape(item);
    });
  }

  function setupShape(item) {
    var style = getComputedStyle(areaEl);
    var areaW = areaEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var areaH = areaEl.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

    var pictureSize = 0;
    if (item.kind === 'word') {
      pictureSize = Math.max(0, Math.floor(Math.min(areaH * 0.34, areaW * 0.6, 170)));
      areaEl.style.setProperty('--pic-size', pictureSize + 'px');
    }
    var cssW = Math.max(1, Math.floor(areaW));
    var cssH = Math.max(1, Math.floor(areaH - (pictureSize ? pictureSize + 8 : 0)));
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var cw = Math.round(cssW * ratio);
    var ch = Math.round(cssH * ratio);

    wrapEl.style.setProperty('--cw', cssW + 'px');
    wrapEl.style.setProperty('--ch', cssH + 'px');
    [maskCanvas, baseCanvas, paintCanvas, outlineCanvas, layer, tolCanvas].forEach(function (c) {
      c.width = cw;
      c.height = ch;
    });

    // O maior tamanho de letra que cabe. Palavras longas podem quebrar em duas linhas (entre sílabas)
    // quando isso deixa as letras maiores: numa tela estreita, "banana" numa linha só fica minúscula.
    var probe = ctx.mask;
    probe.font = '700 100px ' + FONT;
    var best = null;
    Logic.layoutsFor(item).forEach(function (lines) {
      var widest = 0;
      var tall = 0;
      lines.forEach(function (line) {
        var m = probe.measureText(line);
        widest = Math.max(widest, m.width);
        tall = Math.max(tall, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
      });
      var lineHeight = tall * LINE_GAP;
      var size = Math.floor(Math.min(
        (cw * 0.94) / (widest / 100),
        (ch * 0.88) / ((lineHeight * lines.length) / 100),
      ));
      // só quebra em duas linhas se a letra ficar bem maior (15% ou mais)
      if (!best || size > best.size * 1.15) best = { lines: lines, size: size };
    });
    var fontSize = best.size;
    var font = '700 ' + fontSize + 'px ' + FONT;
    probe.font = font;
    var ascent = 0;
    var descent = 0;
    best.lines.forEach(function (line) {
      var m = probe.measureText(line);
      ascent = Math.max(ascent, m.actualBoundingBoxAscent);
      descent = Math.max(descent, m.actualBoundingBoxDescent);
    });
    var lineHeight = (ascent + descent) * LINE_GAP;
    var blockHeight = lineHeight * best.lines.length;
    var x = cw / 2;
    // a linha de base de cada linha: o bloco todo fica centralizado na área
    var baselines = best.lines.map(function (line, i) {
      return (ch - blockHeight) / 2 + i * lineHeight + (lineHeight - (ascent + descent)) / 2 + ascent;
    });

    var sizes = Logic.sizesFor(state.level, fontSize / ratio);

    function text(c, how) {
      c.font = font;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.lineJoin = 'round';
      best.lines.forEach(function (line, i) {
        if (how.fill) { c.fillStyle = how.fill; c.fillText(line, x, baselines[i]); }
        if (how.stroke) { c.lineWidth = how.width; c.strokeStyle = how.stroke; c.strokeText(line, x, baselines[i]); }
      });
    }

    // a máscara: a forma da letra (e só ela)
    text(ctx.mask, { fill: '#000' });
    // a tolerância: a forma engordada, para o dedo poder passar um pouco do contorno
    text(ctx.tol, { fill: '#000', stroke: '#000', width: 2 * sizes.tolerance * ratio });
    // a forma clara, por baixo da tinta, e o contorno por cima
    text(ctx.base, { fill: BASE_COLOR });
    text(ctx.outline, { stroke: OUTLINE_COLOR, width: Math.max(3, fontSize * 0.035) });

    geo = {
      cw: cw, ch: ch, ratio: ratio, fontSize: fontSize,
      brush: sizes.brush * ratio,
      maskCount: countAlpha(ctx.mask.getImageData(0, 0, cw, ch).data),
      tolData: ctx.tol.getImageData(0, 0, cw, ch).data,
    };
    ctx.layer.clearRect(0, 0, cw, ch);
    ctx.paint.clearRect(0, 0, cw, ch);
    wrapEl.setAttribute('data-ready', 'true');
    wrapEl.setAttribute('data-item', item.text);
    wrapEl.setAttribute('data-lines', String(best.lines.length));
    wrapEl.setAttribute('data-brush', String(sizes.brush));   // px de tela (para os testes pintarem de verdade)
    speak(prompt());
  }

  function countAlpha(data) {
    var n = 0;
    for (var i = 3; i < data.length; i += 4) if (data[i] > 127) n++;
    return n;
  }

  /** A tinta aparece só onde a máscara deixa */
  function composite() {
    var c = ctx.paint;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, geo.cw, geo.ch);
    c.drawImage(layer, 0, 0);
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(maskCanvas, 0, 0);
    c.globalCompositeOperation = 'source-over';
  }

  /** O ponto (em px do canvas) está dentro da forma ou perto o bastante do contorno? */
  function insideTolerance(p) {
    var x = Math.round(p.x);
    var y = Math.round(p.y);
    if (x < 0 || y < 0 || x >= geo.cw || y >= geo.ch) return false;
    return geo.tolData[(y * geo.cw + x) * 4 + 3] > 127;
  }

  function position(e) {
    var rect = outlineCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (geo.cw / rect.width),
      y: (e.clientY - rect.top) * (geo.ch / rect.height),
    };
  }

  // ── Pintar ────────────────────────────────────────────────────────────────────
  function stroke(from, to) {
    var c = ctx.layer;
    c.strokeStyle = color.value;
    c.fillStyle = color.value;
    c.lineWidth = geo.brush;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.stroke();
    // um ponto: o toque sem arrastar também pinta
    c.beginPath();
    c.arc(to.x, to.y, geo.brush / 2, 0, Math.PI * 2);
    c.fill();
  }

  outlineCanvas.addEventListener('pointerdown', function (e) {
    if (!geo || !state || state.phase !== 'painting' || !wrapEl.hasAttribute('data-ready')) return;
    e.preventDefault();
    // sem a captura o dedo que escapa da tela deixa de pintar; se ela não existir, pintar continua
    try { outlineCanvas.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro sem captura */ }
    state = Logic.start(state, Date.now());
    var p = position(e);
    drawing = { last: p, wasInside: insideTolerance(p), moves: 0 };
    stroke(p, p);
    composite();
  });

  outlineCanvas.addEventListener('pointermove', function (e) {
    if (!drawing || state.phase !== 'painting') return;
    var p = position(e);
    stroke(drawing.last, p);
    composite();

    var inside = insideTolerance(p);
    if (drawing.wasInside && !inside) onExit();
    drawing.wasInside = inside;
    drawing.last = p;

    if (++drawing.moves % MOVES_PER_CHECK === 0) checkCoverage();
  });

  function endStroke() {
    if (!drawing) return;
    drawing = null;
    if (state.phase === 'painting') checkCoverage();
  }
  outlineCanvas.addEventListener('pointerup', endStroke);
  outlineCanvas.addEventListener('pointercancel', endStroke);

  /** O dedo saiu do contorno: a forma balança de leve (a tinta não sai, então não há "estrago") */
  function onExit() {
    state = Logic.recordExit(state);
    wrapEl.classList.remove('wobble');
    void wrapEl.offsetWidth;   // reinicia a animação
    wrapEl.classList.add('wobble');
    setTimeout(function () { wrapEl.classList.remove('wobble'); }, 350);
    if (state.itemExits === HINT_AFTER_EXITS && !hinted) {
      hinted = true;
      speak('Devagarinho, dentro da letra.');
    }
  }

  function checkCoverage() {
    if (state.phase !== 'painting') return;
    var painted = countAlpha(ctx.paint.getImageData(0, 0, geo.cw, geo.ch).data);
    if (!Logic.isComplete(state, painted, geo.maskCount)) return;
    completeItem();
  }

  /** A forma está pintada: o que faltava se completa, a Mia comemora e vem a próxima */
  function completeItem() {
    var item = Logic.currentItem(state);
    state = Logic.finishItem(state);
    drawing = null;

    ctx.layer.fillStyle = color.value;
    ctx.layer.fillRect(0, 0, geo.cw, geo.ch);   // o recorte da máscara deixa só a forma
    composite();

    wrapEl.classList.remove('pop');
    void wrapEl.offsetWidth;
    wrapEl.classList.add('pop');
    setMia('cheer');
    Sounds.play('match');
    speak(Logic.correctSpeechFor(item));
    header.setDone(state.solved);

    var token = state.round;
    advanceTimer = setTimeout(function () { onAdvance(token); }, Logic.ADVANCE_DELAY_MS);
  }

  function onAdvance(token) {
    var out = Logic.next(state, token, Date.now());
    if (!out.result) return;
    state = out.state;
    advanceTimer = null;
    if (out.result === 'next') showItem();
    else endGame();
  }

  function endGame() {
    var elapsed = Logic.elapsedMs(state, Date.now());
    var stars = Logic.calcStars(state);
    var newRecord = Logic.isNewRecord(best, stars, state.exits);

    GameResult.show(stars, newRecord);
    Sounds.play('win');
    speak(Utils.resultSpeech(stars, newRecord));

    if (!best || newRecord) best = { stars: stars, moves: state.exits };

    Bridge.complete({
      gameId:      'paint',
      level:       state.level,
      moves:       state.exits,      // saídas do contorno: quanto menos, melhor
      matches:     state.solved,
      timeSeconds: Math.floor(elapsed / 1000),
      stars:       stars,
    });
  }

  window.addEventListener('resize', function () {
    if (!state || state.phase === 'completed') return;
    layoutPalette();
    // a forma se refaz no novo tamanho (a tinta recomeça: girar o aparelho é raro no meio da pintura)
    var item = Logic.currentItem(state);
    if (item && geo && (geo.cw !== Math.round(areaEl.clientWidth * geo.ratio))) setupShape(item);
  });
})();
