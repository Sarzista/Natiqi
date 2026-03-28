# Logo Usage Guide

## Available Logo Variants

Your logo files are organized as follows:

### Full Logo (Icon + Text)
- **Transparent**: `FullLogo_Transparent_NoBuffer.png`
- **Solid Background**: `FullLogo.png`

### Icon Only
- **Transparent**: `IconOnly_Transparent_NoBuffer.png`
- **Transparent (Alt)**: `IconOnly_Transparent.png`

### Text Only
- **Text Only**: `TextOnly.png`

### SVG Version
- **Print/Transparent**: `Print_Transparent.svg` (for web/print use)

## Usage Examples

### Basic Usage

```typescript
import { Logo } from '../components/Logo';

// Icon only, transparent (default - good for headers)
<Logo />

// Full logo, transparent (good for landing pages)
<Logo variant="full" background="transparent" />

// Icon only, solid background
<Logo variant="icon" background="solid" />

// Text only
<Logo variant="text" />
```

### With Custom Sizes

```typescript
// Small icon for compact spaces
<Logo variant="icon" size="small" />

// Large full logo for hero sections
<Logo variant="full" size="large" />

// Extra large for splash screens
<Logo variant="full" size="xlarge" />

// Custom dimensions
<Logo variant="full" width={200} height={60} />
```

### In Components

#### Landing Screen Header
```typescript
// Already configured - shows full logo, transparent
<Logo variant="full" background="transparent" size="medium" />
```

#### AppHeader Component
```typescript
// Shows icon only, transparent (compact for headers)
<AppHeader showLogo={true} logoSize="medium" />

// Or customize
<AppHeader 
  logo={<Logo variant="full" background="transparent" size="large" />}
/>
```

#### Login Screen
```typescript
// Full logo for branding
<Logo variant="full" background="transparent" size="xlarge" />
```

#### Dashboard/Other Screens
```typescript
// Icon only for compact header
<Logo variant="icon" background="transparent" size="medium" />
```

## When to Use Which Variant

### `variant="full"` (Full Logo)
- ✅ Landing pages
- ✅ Login screens
- ✅ Marketing pages
- ✅ Footer
- ✅ Email signatures
- ✅ Print materials

### `variant="icon"` (Icon Only)
- ✅ Navigation headers
- ✅ App icons
- ✅ Favicons
- ✅ Compact spaces
- ✅ Mobile navigation
- ✅ Tab bars

### `variant="text"` (Text Only)
- ✅ Text-heavy layouts
- ✅ When icon doesn't fit
- ✅ Horizontal banners
- ✅ Email headers

### `background="transparent"`
- ✅ Over gradient backgrounds
- ✅ Over images
- ✅ Dark mode
- ✅ Colored backgrounds

### `background="solid"`
- ✅ White/light backgrounds
- ✅ Print materials
- ✅ When transparency causes issues

## Size Presets

- `small`: 32x32px (icons in compact spaces)
- `medium`: 48x48px (default, headers)
- `large`: 64x64px (prominent displays)
- `xlarge`: 96x96px (hero sections, splash screens)

**Note**: Full logos automatically scale wider (2.5x) to maintain aspect ratio.

## Current Implementation

✅ **Landing Screen**: Full logo, transparent, medium size
✅ **AppHeader**: Icon only, transparent, medium size (when `showLogo={true}`)

## Quick Reference

```typescript
// Header logo (compact)
<Logo variant="icon" background="transparent" size="medium" />

// Hero/landing logo
<Logo variant="full" background="transparent" size="large" />

// Footer logo
<Logo variant="full" background="transparent" size="small" />

// Login screen logo
<Logo variant="full" background="transparent" size="xlarge" />
```

