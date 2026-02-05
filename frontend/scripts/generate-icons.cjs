#!/usr/bin/env node
// scripts/generate-icons.cjs
// Gera ícones do app com design de barras de equalização (símbolo musical)
// Uso: node scripts/generate-icons.cjs

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Tamanhos dos ícones
const iconSizes = [192, 512];

// Gera o SVG do ícone com barras de equalização
function generateIconSVG(size) {
  const padding = size * 0.1; // 10% padding
  const safeArea = size * 0.8; // 80% safe zone para maskable
  const centerX = size / 2;
  const centerY = size / 2;

  // Configuração das barras de equalização
  const barCount = 5;
  const barWidth = safeArea * 0.1;
  const barGap = safeArea * 0.05;
  const totalBarsWidth = (barCount * barWidth) + ((barCount - 1) * barGap);
  const startX = centerX - totalBarsWidth / 2 + barWidth / 2;

  // Alturas das barras (padrão de equalização)
  const barHeights = [0.4, 0.7, 1.0, 0.6, 0.35]; // Proporções relativas
  const maxBarHeight = safeArea * 0.5;

  // Gera as barras
  const bars = barHeights.map((heightRatio, i) => {
    const x = startX + (i * (barWidth + barGap));
    const barHeight = maxBarHeight * heightRatio;
    const y = centerY - barHeight / 2;
    const rx = barWidth / 2; // Cantos arredondados

    return `<rect x="${x - barWidth/2}" y="${y}" width="${barWidth}" height="${barHeight}" rx="${rx}" fill="white" opacity="0.95"/>`;
  }).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradiente de fundo diagonal -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4338ca"/>
      <stop offset="50%" style="stop-color:#5046e5"/>
      <stop offset="100%" style="stop-color:#6366f1"/>
    </linearGradient>

    <!-- Gradiente radial sutil para profundidade -->
    <radialGradient id="innerGlow" cx="50%" cy="40%" r="60%" fx="50%" fy="30%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#4338ca;stop-opacity:0"/>
    </radialGradient>

    <!-- Sombra sutil nas barras -->
    <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.005}" stdDeviation="${size * 0.01}" flood-color="#1e1b4b" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Fundo com gradiente -->
  <rect width="${size}" height="${size}" fill="url(#bgGradient)"/>

  <!-- Brilho interno sutil -->
  <rect width="${size}" height="${size}" fill="url(#innerGlow)"/>

  <!-- Barras de equalização com sombra -->
  <g filter="url(#barShadow)">
    ${bars}
  </g>
</svg>`;
}

// Verifica se sharp está disponível
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Sharp não encontrado. Instale com: npm install -D sharp');
  process.exit(1);
}

async function generateIcons() {
  console.log('Gerando ícones do app com design de equalização...\n');

  for (const size of iconSizes) {
    const svgContent = generateIconSVG(size);
    const pngPath = path.join(publicDir, `icon-${size}.png`);

    await sharp(Buffer.from(svgContent))
      .png()
      .toFile(pngPath);

    console.log(`✓ icon-${size}.png (${size}x${size})`);
  }

  // Gera favicon.ico a partir do ícone 192
  const faviconSizes = [16, 32, 48];
  const svgContent = generateIconSVG(512); // Usa maior resolução para qualidade

  // Gera PNG para favicon (32x32 é o mais comum)
  const favicon32Path = path.join(publicDir, 'favicon-32.png');
  await sharp(Buffer.from(svgContent))
    .resize(32, 32)
    .png()
    .toFile(favicon32Path);

  // Copia como favicon.ico (navegadores modernos aceitam PNG)
  const faviconPath = path.join(publicDir, 'favicon.ico');
  await sharp(Buffer.from(svgContent))
    .resize(32, 32)
    .png()
    .toFile(faviconPath);

  console.log(`✓ favicon.ico (32x32)`);

  // Remove arquivo temporário
  fs.unlinkSync(favicon32Path);

  console.log('\n✓ Ícones gerados com sucesso!');
}

generateIcons().catch(err => {
  console.error('Erro ao gerar ícones:', err.message);
  process.exit(1);
});
