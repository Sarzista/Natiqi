# Logo Color Extraction Guide

## 🎨 Extract Colors from Your Logo

You have several options to extract colors from your logo files:

### Option 1: Web-Based Tool (Easiest) ⭐

I've created a web-based color extractor for you:

1. **Open the HTML file**:
   ```bash
   # Open scripts/extract-colors-web.html in your browser
   # Or drag and drop the file into your browser
   ```

2. **Upload your logo**:
   - Drag and drop logo files onto the upload area
   - Or click to browse and select files
   - Supports: PNG, JPG, SVG

3. **Get results**:
   - See dominant colors and palette
   - Copy color codes (HEX, RGB)
   - Get suggested theme code snippet

### Option 2: Online Tools (No Installation)

Use these free online tools:

1. **ImgToColor** - https://imgtocolor.com
   - Upload logo → Get HEX, RGB, HSL codes
   - Supports PNG, JPG, WEBP

2. **HueStack** - https://huestack.dev/image-theme-extractor
   - Extracts up to 8 prominent colors
   - Provides harmonious palette

3. **ImageColorPro** - https://imagecolorpro.io
   - Click anywhere on image to pick colors
   - Get HEX, RGB, HSL, CMYK values

### Option 3: Node.js Script (For Developers)

1. **Install ColorThief**:
   ```bash
   npm install --save-dev colorthief
   ```

2. **Run the extraction script**:
   ```bash
   node scripts/extract-colors.js
   ```

3. **Results**:
   - Colors extracted from all logo files
   - Saved to `logo-colors.json`
   - Suggested theme colors displayed

## 📋 Your Logo Files

Available logo files in `assets/`:
- `FullLogo.png` - Full logo with solid background
- `FullLogo_Transparent_NoBuffer.png` - Full logo transparent
- `IconOnly_Transparent_NoBuffer.png` - Icon only, transparent
- `IconOnly_Transparent.png` - Icon only, transparent (alt)
- `TextOnly.png` - Text only
- `Print_Transparent.svg` - SVG version

## 🎯 After Extracting Colors

Once you have the colors, you can:

1. **Update theme colors** (`src/theme/colors.ts`):
   ```typescript
   export const logoColors = {
     primary: '#YOUR_HEX_COLOR',
     secondary: '#YOUR_HEX_COLOR',
     accent: '#YOUR_HEX_COLOR',
   };
   ```

2. **Use in components**:
   ```typescript
   import { logoColors } from '../theme/colors';
   
   <View style={{ backgroundColor: logoColors.primary }}>
   ```

3. **Update gradient backgrounds**:
   ```typescript
   <AnimatedGradient colors={[
     logoColors.primary,
     logoColors.secondary,
     logoColors.accent,
   ]} />
   ```

## 💡 Tips

- **Extract from transparent versions** for accurate brand colors
- **Use full logo** to get complete color palette
- **Check both light and dark areas** of the logo
- **Consider contrast** for text readability
- **Save extracted colors** to a file for reference

## 🔄 Current Theme Colors

Your current theme uses these green medical colors:
- `#3E5F44` - Dark green (primary)
- `#5E936C` - Medium green
- `#93DA97` - Light green
- `#E8FFD7` - Very light green/cream

After extracting logo colors, you can:
- Replace these with your brand colors
- Or blend them with your brand colors
- Or keep both for different contexts

