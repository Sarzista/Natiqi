/**
 * Color Extraction Utility
 * Extracts dominant colors from logo images
 * 
 * Usage: node scripts/extract-colors.js
 * 
 * Note: This requires installing 'colorthief' or 'node-vibrant' package
 * Run: npm install --save-dev colorthief
 */

const fs = require('fs');
const path = require('path');

// Check if colorthief is available
let ColorThief;
try {
  ColorThief = require('colorthief');
} catch (e) {
  console.log('⚠️  ColorThief not installed.');
  console.log('📦 Install it with: npm install --save-dev colorthief');
  console.log('\n📋 Alternative: Use online tools to extract colors:');
  console.log('   - https://imgtocolor.com');
  console.log('   - https://huestack.dev/image-theme-extractor');
  console.log('   - https://imagecolorpro.io');
  process.exit(1);
}

const assetsDir = path.join(__dirname, '../assets');
const logoFiles = [
  'FullLogo.png',
  'FullLogo_Transparent_NoBuffer.png',
  'IconOnly_Transparent_NoBuffer.png',
  'TextOnly.png',
];

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function extractColors(imagePath) {
  try {
    const palette = ColorThief.getPalette(imagePath, 5); // Get 5 dominant colors
    const dominantColor = ColorThief.getColor(imagePath);
    
    return {
      dominant: {
        rgb: `rgb(${dominantColor.join(', ')})`,
        hex: rgbToHex(...dominantColor),
      },
      palette: palette.map(color => ({
        rgb: `rgb(${color.join(', ')})`,
        hex: rgbToHex(...color),
      })),
    };
  } catch (error) {
    console.error(`Error processing ${imagePath}:`, error.message);
    return null;
  }
}

console.log('🎨 Extracting colors from logo files...\n');

const results = {};

logoFiles.forEach(file => {
  const filePath = path.join(assetsDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`📸 Processing: ${file}`);
    const colors = extractColors(filePath);
    if (colors) {
      results[file] = colors;
      console.log(`   Dominant: ${colors.dominant.hex} (${colors.dominant.rgb})`);
      console.log(`   Palette: ${colors.palette.map(c => c.hex).join(', ')}`);
    }
    console.log('');
  } else {
    console.log(`⚠️  File not found: ${file}\n`);
  }
});

// Generate color theme suggestions
console.log('\n📊 Color Analysis Summary:\n');
console.log('='.repeat(60));

const allColors = [];
Object.values(results).forEach(result => {
  if (result) {
    allColors.push(result.dominant);
    result.palette.forEach(c => allColors.push(c));
  }
});

// Find unique colors
const uniqueColors = Array.from(
  new Map(allColors.map(c => [c.hex, c])).values()
);

console.log('\n🎯 Suggested Color Palette:\n');
uniqueColors.slice(0, 8).forEach((color, index) => {
  console.log(`  ${index + 1}. ${color.hex.padEnd(8)} ${color.rgb}`);
});

// Generate theme file snippet
console.log('\n📝 Suggested theme/colors.ts update:\n');
console.log('export const logoColors = {');
uniqueColors.slice(0, 5).forEach((color, index) => {
  const name = ['primary', 'secondary', 'accent', 'highlight', 'muted'][index] || `color${index + 1}`;
  console.log(`  ${name}: '${color.hex}', // ${color.rgb}`);
});
console.log('};');

// Save results to JSON
const outputPath = path.join(__dirname, '../logo-colors.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(results, null, 2)
);
console.log(`\n💾 Results saved to: logo-colors.json`);

