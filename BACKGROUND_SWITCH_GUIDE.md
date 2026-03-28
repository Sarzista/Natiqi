# Background Options - Quick Switch Guide

## How to Switch Between Background Options

All screens currently use **Option 1: Static Gradient**. To try different options, change the `variant` prop in these files:

### Files to Update:
1. `src/screens/LandingScreen/LandingScreen.tsx` (line ~292)
2. `src/screens/LoginScreen/LoginScreen.tsx` (line ~86)
3. `src/screens/DashboardScreen/DashboardScreen.tsx` (line ~51)

### Current Setting (Option 1):
```tsx
<AnimatedGradient variant="static-gradient" />
```

---

## Available Options:

### Option 1: Static Gradient ⭐ (Current)
```tsx
<AnimatedGradient variant="static-gradient" />
```
- Clean static gradient using all logo colors
- Blue → Teal → Green flow
- Professional, non-distracting

### Option 2: Light Solid
```tsx
<AnimatedGradient variant="light-solid" />
```
- Ultra clean light background (#dcf0e8 - Swans Down)
- Minimal, focuses on content
- Very professional medical look

### Option 3: Radial Gradient
```tsx
<AnimatedGradient variant="radial-gradient" />
```
- Soft radial gradient from center
- Subtle, calming effect
- Creates depth without distraction

### Option 4: Two-Tone Static
```tsx
<AnimatedGradient variant="two-tone" />
```
- Simple two-color gradient
- Ocean Green → Emerald
- Clean and minimal

### Option 5: Very Slow Animation
```tsx
<AnimatedGradient variant="slow-animation" />
```
- Same gradient but very slow movement (25 seconds)
- Barely noticeable animation
- Adds subtle life to the background

---

## Quick Test:

To test all options quickly, change the variant in all 3 screen files:
- LandingScreen.tsx
- LoginScreen.tsx  
- DashboardScreen.tsx

Then refresh your browser to see the change!

