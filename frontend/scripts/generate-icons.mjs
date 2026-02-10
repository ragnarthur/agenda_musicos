import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

// ─── Modern GigFlow Icon SVG ───────────────────────────────────────────────────
// Calendar + musical note with modern gradients and glass-morphism effects
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background gradient: deep indigo to violet -->
    <radialGradient id="bg" cx="30%" cy="25%" r="85%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="50%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#3b0f8a"/>
    </radialGradient>

    <!-- Subtle highlight in top-left corner -->
    <radialGradient id="highlight" cx="20%" cy="15%" r="50%">
      <stop offset="0%" stop-color="white" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>

    <!-- Note glow effect -->
    <radialGradient id="noteGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="white" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>

    <!-- Calendar body gradient (glass effect) -->
    <linearGradient id="calBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.08"/>
    </linearGradient>

    <!-- Calendar header gradient -->
    <linearGradient id="calHeader" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.15"/>
    </linearGradient>

    <!-- Drop shadow for the note -->
    <filter id="noteShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#1e1b4b" flood-opacity="0.5"/>
    </filter>

    <!-- Subtle shadow for calendar -->
    <filter id="calShadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#1e1b4b" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background fill -->
  <rect width="512" height="512" fill="url(#bg)" rx="0" ry="0"/>

  <!-- Top-left highlight -->
  <rect width="512" height="512" fill="url(#highlight)"/>

  <!-- Calendar body with glass effect -->
  <g filter="url(#calShadow)">
    <!-- Main calendar shape -->
    <rect x="96" y="120" width="320" height="296" rx="32" ry="32"
          fill="url(#calBody)" stroke="white" stroke-opacity="0.2" stroke-width="1.5"/>

    <!-- Calendar header band -->
    <rect x="96" y="120" width="320" height="72" rx="32" ry="32"
          fill="url(#calHeader)"/>
    <!-- Square off bottom corners of header -->
    <rect x="96" y="160" width="320" height="32"
          fill="url(#calHeader)"/>
  </g>

  <!-- Calendar clips (top binding rings) -->
  <g>
    <!-- Left clip -->
    <rect x="176" y="96" width="16" height="56" rx="8" ry="8"
          fill="white" opacity="0.85"/>
    <!-- Right clip -->
    <rect x="320" y="96" width="16" height="56" rx="8" ry="8"
          fill="white" opacity="0.85"/>
  </g>

  <!-- Glow behind the note -->
  <ellipse cx="268" cy="310" rx="80" ry="80" fill="url(#noteGlow)"/>

  <!-- Musical note (eighth note) - larger and centered -->
  <g filter="url(#noteShadow)">
    <!-- Note head (ellipse) -->
    <ellipse cx="240" cy="348" rx="40" ry="30"
             fill="white" transform="rotate(-15, 240, 348)"/>
    <!-- Note stem -->
    <rect x="272" y="220" width="12" height="130" rx="6" ry="6"
          fill="white"/>
    <!-- Note flag -->
    <path d="M284 220 C284 220, 320 240, 316 280 C316 280, 310 258, 284 250"
          fill="white"/>
  </g>

  <!-- Subtle bottom-right shimmer -->
  <radialGradient id="shimmer" cx="80%" cy="80%" r="35%">
    <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
  </radialGradient>
  <rect width="512" height="512" fill="url(#shimmer)"/>
</svg>
`;

// ─── Splash Screen SVG Generator ────────────────────────────────────────────────
function createSplashSvg(width, height) {
  const iconSize = Math.round(width * 0.22);
  const iconX = Math.round((width - iconSize) / 2);
  const iconY = Math.round(height * 0.38);
  const titleY = iconY + iconSize + Math.round(height * 0.04);
  const subtitleY = titleY + Math.round(height * 0.035);
  const titleSize = Math.round(width * 0.065);
  const subtitleSize = Math.round(width * 0.030);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <radialGradient id="splashBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
    <radialGradient id="sBg" cx="30%" cy="25%" r="85%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="50%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#3b0f8a"/>
    </radialGradient>
    <radialGradient id="sHighlight" cx="20%" cy="15%" r="50%">
      <stop offset="0%" stop-color="white" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sNoteGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="white" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sCalBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="sCalHeader" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.15"/>
    </linearGradient>
    <filter id="sNoteShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#1e1b4b" flood-opacity="0.5"/>
    </filter>
    <filter id="sCalShadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1e1b4b" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Dark background with subtle radial -->
  <rect width="${width}" height="${height}" fill="#0f172a"/>
  <rect width="${width}" height="${height}" fill="url(#splashBg)"/>

  <!-- Icon (scaled version of the main icon) -->
  <g transform="translate(${iconX}, ${iconY})">
    <svg viewBox="0 0 512 512" width="${iconSize}" height="${iconSize}">
      <!-- Background rounded square -->
      <rect width="512" height="512" fill="url(#sBg)" rx="96" ry="96"/>
      <rect width="512" height="512" fill="url(#sHighlight)" rx="96" ry="96"/>

      <!-- Calendar body -->
      <g filter="url(#sCalShadow)">
        <rect x="96" y="120" width="320" height="296" rx="32" ry="32"
              fill="url(#sCalBody)" stroke="white" stroke-opacity="0.2" stroke-width="1.5"/>
        <rect x="96" y="120" width="320" height="72" rx="32" ry="32"
              fill="url(#sCalHeader)"/>
        <rect x="96" y="160" width="320" height="32"
              fill="url(#sCalHeader)"/>
      </g>

      <!-- Clips -->
      <rect x="176" y="96" width="16" height="56" rx="8" ry="8" fill="white" opacity="0.85"/>
      <rect x="320" y="96" width="16" height="56" rx="8" ry="8" fill="white" opacity="0.85"/>

      <!-- Note glow -->
      <ellipse cx="268" cy="310" rx="80" ry="80" fill="url(#sNoteGlow)"/>

      <!-- Musical note -->
      <g filter="url(#sNoteShadow)">
        <ellipse cx="240" cy="348" rx="40" ry="30" fill="white" transform="rotate(-15, 240, 348)"/>
        <rect x="272" y="220" width="12" height="130" rx="6" ry="6" fill="white"/>
        <path d="M284 220 C284 220, 320 240, 316 280 C316 280, 310 258, 284 250" fill="white"/>
      </g>
    </svg>
  </g>

  <!-- App name -->
  <text x="${width / 2}" y="${titleY}" text-anchor="middle"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="${titleSize}" font-weight="700" fill="white">
    GigFlow
  </text>

  <!-- Subtitle -->
  <text x="${width / 2}" y="${subtitleY}" text-anchor="middle"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="${subtitleSize}" font-weight="400" fill="#94a3b8">
    Agenda para M\u00fasicos
  </text>
</svg>
`;
}

// ─── Generate All Icons ─────────────────────────────────────────────────────────
async function generateIcons() {
  console.log('Generating app icons...');

  const svgBuffer = Buffer.from(iconSvg);

  await Promise.all([
    sharp(svgBuffer).resize(512, 512).png().toFile(join(PUBLIC, 'icon-512.png')),
    sharp(svgBuffer).resize(192, 192).png().toFile(join(PUBLIC, 'icon-192.png')),
    sharp(svgBuffer).resize(180, 180).png().toFile(join(PUBLIC, 'apple-touch-icon.png')),
    sharp(svgBuffer).resize(32, 32).png().toFile(join(PUBLIC, 'favicon-32.png')),
    sharp(svgBuffer).resize(64, 64).png().toFile(join(PUBLIC, 'favicon.ico')),
  ]);

  console.log('  icon-512.png (512x512)');
  console.log('  icon-192.png (192x192)');
  console.log('  apple-touch-icon.png (180x180)');
  console.log('  favicon-32.png (32x32)');
  console.log('  favicon.ico (64x64)');
}

// ─── Generate All Splash Screens ────────────────────────────────────────────────
async function generateSplashScreens() {
  console.log('\nGenerating splash screens...');

  const sizes = [
    [750, 1334],
    [828, 1792],
    [1125, 2436],
    [1170, 2532],
    [1179, 2556],
    [1242, 2208],
    [1242, 2688],
    [1284, 2778],
    [1290, 2796],
    [1536, 2048],
    [1668, 2388],
    [2048, 2732],
  ];

  for (const [w, h] of sizes) {
    const splashSvg = createSplashSvg(w, h);
    const filename = `splash-${w}x${h}.png`;
    await sharp(Buffer.from(splashSvg)).png().toFile(join(PUBLIC, 'splash', filename));
    console.log(`  ${filename}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────────
try {
  await generateIcons();
  await generateSplashScreens();
  console.log('\nAll icons and splash screens generated successfully!');
} catch (error) {
  console.error('Error generating icons:', error);
  process.exit(1);
}
