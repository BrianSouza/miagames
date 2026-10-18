// Rasteriza a Mia para o ícone do app e o splash, usando o Chromium do Playwright
// (o ImageMagick não desenha SVG de forma confiável).
//
//   python3 tool/generate_illustrations.py   # gera os SVGs
//   node tool/render_brand.js                # gera os PNGs em assets/icon e assets/splash
//
// Depois: dart run flutter_launcher_icons && dart run flutter_native_splash:create
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const TEAL = '#4ECDC4';
const CREAM = '#FFF9F0';

// Centro do desenho da Mia no quadro de 200x200 (cabeça e laço) e do corpo inteiro
const HEAD_CENTER = [100, 86];
const BODY_CENTER = [113, 108];

const IMAGES = [
  // ícone cheio (iOS e Android antigo): fundo turquesa, a cabeça bem grande
  { out: 'assets/icon/icon.png', svg: 'tool/brand/mia_head.svg', size: 1024, bg: TEAL, center: HEAD_CENTER, scale: 4.3 },
  // camada da frente do ícone adaptativo. O flutter_launcher_icons recua 16% de cada lado,
  // então a arte ocupa quase o quadro todo: depois do recuo, fica dentro dos 66% centrais
  { out: 'assets/icon/icon_foreground.png', svg: 'tool/brand/mia_head.svg', size: 1024, bg: null, center: HEAD_CENTER, scale: 5.3 },
  // ícone temático do Android 13: só a transparência importa
  { out: 'assets/icon/icon_mono.png', svg: 'tool/brand/mia_mono.svg', size: 1024, bg: null, center: HEAD_CENTER, scale: 5.3 },
  // splash: a Mia de corpo inteiro sobre transparente (o fundo creme vem do splash nativo)
  { out: 'assets/splash/splash_mia.png', svg: 'assets/images/mia/mia_happy.svg', size: 1152, bg: null, center: BODY_CENTER, scale: 4.4 },
  // splash do Android 12: só a cabeça, dentro do círculo central
  { out: 'assets/splash/splash_android12.png', svg: 'tool/brand/mia_head.svg', size: 1152, bg: null, center: HEAD_CENTER, scale: 4.1 },
];

(async () => {
  const browser = await chromium.launch();
  for (const img of IMAGES) {
    const svg = fs.readFileSync(path.join(ROOT, img.svg));
    const left = img.size / 2 - img.center[0] * img.scale;
    const top = img.size / 2 - img.center[1] * img.scale;
    const page = await browser.newPage({ viewport: { width: img.size, height: img.size } });
    await page.setContent(
      `<body style="margin:0;background:${img.bg || 'transparent'}">` +
        `<img src="data:image/svg+xml;base64,${svg.toString('base64')}" ` +
        `style="position:absolute;left:${left}px;top:${top}px;width:${200 * img.scale}px;height:${200 * img.scale}px">`,
    );
    const file = path.join(ROOT, img.out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, omitBackground: !img.bg });
    await page.close();
    console.log('gerado:', img.out);
  }
  await browser.close();
})();
