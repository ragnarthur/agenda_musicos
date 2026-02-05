#!/usr/bin/env node
// scripts/generate-icons.cjs
// Gera ícones do app com design de calendário + nota musical
// Uso: node scripts/generate-icons.cjs

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Tamanhos dos ícones
const iconSizes = [192, 512];

// Gera o SVG do ícone com calendário + nota musical
function generateIconSVG(size) {
  const centerX = size / 2;
  const centerY = size / 2;

  // Dimensões do calendário
  const calWidth = size * 0.55;
  const calHeight = size * 0.5;
  const calX = centerX - calWidth / 2;
  const calY = centerY - calHeight / 2 + size * 0.05;
  const calRadius = size * 0.04;
  const headerHeight = calHeight * 0.25;

  // Argolas do calendário
  const ringWidth = size * 0.025;
  const ringHeight = size * 0.08;
  const ringY = calY - ringHeight * 0.4;
  const ring1X = calX + calWidth * 0.25;
  const ring2X = calX + calWidth * 0.75;

  // Nota musical dentro do calendário
  const noteX = centerX;
  const noteY = calY + headerHeight + (calHeight - headerHeight) * 0.55;
  const noteHeadRx = size * 0.065;
  const noteHeadRy = size * 0.05;
  const stemHeight = size * 0.14;
  const flagWidth = size * 0.06;

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

    <!-- Sombra sutil -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.008}" stdDeviation="${size * 0.015}" flood-color="#1e1b4b" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Fundo com gradiente -->
  <rect width="${size}" height="${size}" fill="url(#bgGradient)"/>

  <!-- Brilho interno sutil -->
  <rect width="${size}" height="${size}" fill="url(#innerGlow)"/>

  <!-- Calendário -->
  <g filter="url(#shadow)">
    <!-- Argolas do calendário -->
    <rect x="${ring1X - ringWidth/2}" y="${ringY}" width="${ringWidth}" height="${ringHeight}" rx="${ringWidth/2}" fill="white" opacity="0.9"/>
    <rect x="${ring2X - ringWidth/2}" y="${ringY}" width="${ringWidth}" height="${ringHeight}" rx="${ringWidth/2}" fill="white" opacity="0.9"/>

    <!-- Corpo do calendário -->
    <rect x="${calX}" y="${calY}" width="${calWidth}" height="${calHeight}" rx="${calRadius}" fill="white" opacity="0.95"/>

    <!-- Header do calendário (faixa superior) -->
    <rect x="${calX}" y="${calY}" width="${calWidth}" height="${headerHeight}" rx="${calRadius}" fill="white" opacity="0.3"/>
    <rect x="${calX}" y="${calY + calRadius}" width="${calWidth}" height="${headerHeight - calRadius}" fill="white" opacity="0.3"/>

    <!-- Nota musical (colcheia) -->
    <g transform="translate(${noteX}, ${noteY})">
      <!-- Cabeça da nota (elipse inclinada) -->
      <ellipse cx="${-noteHeadRx * 0.3}" cy="0" rx="${noteHeadRx}" ry="${noteHeadRy}" fill="#4338ca" transform="rotate(-20)"/>

      <!-- Haste da nota -->
      <rect x="${noteHeadRx * 0.5}" y="${-stemHeight}" width="${size * 0.02}" height="${stemHeight}" fill="#4338ca"/>

      <!-- Bandeira da nota -->
      <path d="M ${noteHeadRx * 0.5 + size * 0.02} ${-stemHeight}
               Q ${noteHeadRx * 0.5 + size * 0.02 + flagWidth} ${-stemHeight + size * 0.04}
                 ${noteHeadRx * 0.5 + size * 0.02 + flagWidth * 0.8} ${-stemHeight + size * 0.09}
               Q ${noteHeadRx * 0.5 + size * 0.02 + flagWidth * 0.3} ${-stemHeight + size * 0.07}
                 ${noteHeadRx * 0.5 + size * 0.02} ${-stemHeight + size * 0.05}
               Z"
            fill="#4338ca"/>
    </g>
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
