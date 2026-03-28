# Logo Setup Guide

## Where to Upload Your Logo

Place your logo files in the **`assets/`** folder at the root of your project:

```
M2M/
├── assets/
│   ├── logo.png          ← Upload your logo here
│   ├── logo-dark.png     ← Optional: dark variant
│   ├── logo-light.png    ← Optional: light variant
│   └── ...
```

## Supported Formats

- **PNG** (recommended - supports transparency)
- **JPG/JPEG**
- **SVG** (for web - requires `react-native-svg` package)
- **WebP** (for web)

## How to Use Your Logo

### Option 1: Update the Default Logo Path

1. Upload your logo file to `assets/logo.png` (or your preferred filename)
2. Open `src/components/Logo/Logo.tsx`
3. Update line 48 to point to your logo:

```typescript
const defaultSource = require('../../../assets/logo.png');
```

### Option 2: Use Logo Component Directly

The logo is already integrated in:
- **Landing Screen** header (automatically shows)
- **AppHeader** component (use `showLogo={true}` prop)

#### Example Usage:

```typescript
import { Logo } from '../components/Logo';

// Basic usage
<Logo />

// Custom size
<Logo size="large" />

// Custom dimensions
<Logo width={100} height={50} />

// Custom source
<Logo source={require('../../assets/logo.png')} />

// With tint color (for monochrome logos)
<Logo tintColor="#3E5F44" />
```

### Option 3: Use in AppHeader

```typescript
import { AppHeader } from '../components/AppHeader';

// Show default logo
<AppHeader showLogo={true} logoSize="large" />

// Or use custom logo
<AppHeader 
  logo={<Logo source={require('../../assets/logo.png')} size="large" />}
/>
```

## Size Presets

- `small`: 32x32px
- `medium`: 48x48px (default)
- `large`: 64x64px
- `xlarge`: 96x96px

Or use custom dimensions: `<Logo width={120} height={40} />`

## Current Logo Usage

✅ **Landing Screen** - Logo appears in header (small/medium based on screen size)
✅ **AppHeader Component** - Ready to show logo (set `showLogo={true}`)

## Next Steps

1. Upload your logo file(s) to `assets/` folder
2. Update `src/components/Logo/Logo.tsx` line 48 with your logo filename
3. The logo will automatically appear in the Landing Screen header
4. Use `<AppHeader showLogo={true} />` in other screens to show the logo

