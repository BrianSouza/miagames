/**
 * Confete em canvas para a tela de parabéns. Leve (~90 papeizinhos, 3 s) e
 * desligado para quem pede menos movimento (prefers-reduced-motion).
 */
(function (root) {
  'use strict';

  var COLORS = ['#FF6B6B', '#F5B700', '#4ECDC4', '#54A0FF', '#A78BFA', '#FF9FF3', '#2ED573'];
  var COUNT = 90;
  var DURATION_MS = 3000;

  var running = 0;   // partículas vivas (para os testes)

  function reducedMotion() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /** Solta o confete no `canvas`. Devolve quantos papeizinhos soltou (0 sem movimento). */
  function burst(canvas) {
    if (reducedMotion()) return 0;

    var ratio = Math.min(root.devicePixelRatio || 1, 2);
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    var ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    var pieces = [];
    for (var i = 0; i < COUNT; i++) {
      pieces.push({
        x: Math.random() * width,
        y: -20 - Math.random() * height * 0.5,
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
        color: COLORS[i % COLORS.length],
      });
    }
    running = pieces.length;

    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      var alive = 0;
      pieces.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        if (p.y > height + 20) return;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (DURATION_MS - elapsed) / 800));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      running = alive;
      if (alive > 0 && elapsed < DURATION_MS) {
        root.requestAnimationFrame(frame);
      } else {
        running = 0;
        ctx.clearRect(0, 0, width, height);
      }
    }
    root.requestAnimationFrame(frame);
    return pieces.length;
  }

  root.Confetti = {
    burst: burst,
    reducedMotion: reducedMotion,
    active: function () { return running; },
  };
})(window);
