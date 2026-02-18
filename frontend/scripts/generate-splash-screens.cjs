#!/usr/bin/env node
// scripts/generate-splash-screens.cjs
// Gera splash screens com logo + nome para iOS PWA
// Uso: node scripts/generate-splash-screens.cjs

const fs = require('fs');
const path = require('path');

// Tamanhos de splash screen para iOS
const splashSizes = [
  { width: 750, height: 1334, name: 'splash-750x1334.png' }, // iPhone SE, 8, 7, 6s, 6
  { width: 1242, height: 2208, name: 'splash-1242x2208.png' }, // iPhone 8 Plus, 7 Plus
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' }, // iPhone X, XS, 11 Pro
  { width: 828, height: 1792, name: 'splash-828x1792.png' }, // iPhone XR, 11
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' }, // iPhone XS Max, 11 Pro Max
  { width: 1170, height: 2532, name: 'splash-1170x2532.png' }, // iPhone 12, 12 Pro, 13, 14
  { width: 1284, height: 2778, name: 'splash-1284x2778.png' }, // iPhone 12 Pro Max, 13 Pro Max
  { width: 1179, height: 2556, name: 'splash-1179x2556.png' }, // iPhone 14 Pro
  { width: 1290, height: 2796, name: 'splash-1290x2796.png' }, // iPhone 14 Pro Max, 15 Plus
  { width: 1536, height: 2048, name: 'splash-1536x2048.png' }, // iPad Mini, Air
  { width: 1668, height: 2388, name: 'splash-1668x2388.png' }, // iPad Pro 11"
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' }, // iPad Pro 12.9"
];

const splashDir = path.join(__dirname, '..', 'public', 'splash');
const logoPath = path.join(__dirname, '..', 'public', 'icon-512.png');

// Garante que o diretório existe
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

console.log('Gerando splash screens para iOS com logo...\n');

// Verifica se sharp está disponível
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp não encontrado.');
  console.log('Para gerar splash screens, instale sharp: npm install -D sharp\n');
  console.log(
    'Ou use pwa-asset-generator: npx pwa-asset-generator public/icon-512.png public/splash --splash-only'
  );
  process.exit(1);
}

// Verifica se o logo existe
if (!fs.existsSync(logoPath)) {
  console.error('Logo não encontrado:', logoPath);
  process.exit(1);
}

// Gera splash screens com logo + texto
async function generateSplashScreens() {
  const logo = await sharp(logoPath).toBuffer();

  for (const { width, height, name } of splashSizes) {
    // Calcula tamanhos proporcionais
    const logoSize = Math.min(width, height) * 0.25;
    const fontSize = Math.min(width, height) * 0.06;
    const subFontSize = fontSize * 0.4;
    const centerX = width / 2;
    const centerY = height / 2;
    const logoY = centerY - logoSize * 0.6;
    const textY = centerY + logoSize * 0.5;
    const subTextY = textY + fontSize * 1.2;

    // Cria o background com gradiente
    const svgBackground = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a"/>
            <stop offset="50%" style="stop-color:#1e293b"/>
            <stop offset="100%" style="stop-color:#334155"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <text x="${centerX}" y="${textY}"
              font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
              font-size="${fontSize}"
              fill="white"
              text-anchor="middle"
              font-weight="bold">GigFlow</text>
        <text x="${centerX}" y="${subTextY}"
              font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
              font-size="${subFontSize}"
              fill="#94a3b8"
              text-anchor="middle">Agenda para Músicos</text>
      </svg>
    `;

    // Redimensiona o logo
    const resizedLogo = await sharp(logo)
      .resize(Math.round(logoSize), Math.round(logoSize), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Compõe a imagem final
    const pngPath = path.join(splashDir, name);
    await sharp(Buffer.from(svgBackground))
      .composite([
        {
          input: resizedLogo,
          left: Math.round(centerX - logoSize / 2),
          top: Math.round(logoY - logoSize / 2),
        },
      ])
      .png()
      .toFile(pngPath);

    console.log(`✓ ${name} (${width}x${height})`);
  }

  console.log('\n✓ Splash screens gerados com sucesso!');
}

generateSplashScreens().catch(err => {
  console.error('Erro ao gerar splash screens:', err.message);
  process.exit(1);
});
