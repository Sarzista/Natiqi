# Gradient Animation Implementation Guide

This document explains in detail how the gradient animation was implemented in this codebase.

## Overview

The gradient animation creates a smooth, moving gradient effect on text and buttons using CSS keyframes and Tailwind CSS classes. The animation moves the gradient background position to create a flowing effect.

## Key Components

### 1. CSS Keyframes Definition

The animation is defined in `app/globals.css` (lines 1165-1172):

```css
@keyframes gradient-move {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}

.animate-gradient-move {
  background-size: 200% 200%;
  animation: gradient-move 3s linear infinite alternate;
}
```

**Important Details:**
- The keyframe animates `background-position` from `0% 50%` to `100% 50%`
- `background-size: 200% 200%` makes the gradient larger than the element, allowing it to move
- `animation: gradient-move 3s linear infinite alternate` creates a smooth, repeating animation that alternates direction
- Duration: 3 seconds
- Timing: `linear` for constant speed
- Direction: `alternate` makes it bounce back and forth

### 2. Additional Animation Variants

There's also a faster variant for hover states (lines 1200-1207):

```css
@keyframes gradient-fast {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}

.animate-gradient-fast {
  animation: gradient-fast 1s linear infinite alternate;
}
```

This runs faster (1 second) for more dynamic hover effects.

### 3. Implementation for Text (Gradient Text Effect)

**Example from `app/create/page.tsx` (line 1109):**

```tsx
<h1 className="text-xl font-bold bg-gradient-to-r from-[#00A651] via-[#1B365D] to-[#00A651] bg-clip-text text-transparent animate-gradient-move">
  {t('Create New Contract')}
</h1>
```

**Key Classes Breakdown:**
- `bg-gradient-to-r` - Creates a horizontal gradient (left to right)
- `from-[#00A651]` - Start color (green)
- `via-[#1B365D]` - Middle color (blue)
- `to-[#00A651]` - End color (green) - creates a repeating pattern
- `bg-clip-text` - Clips the background to the text shape
- `text-transparent` - Makes the text transparent so gradient shows through
- `animate-gradient-move` - Applies the animation

**Critical:** For text gradients, you DON'T need `bg-[length:200%_100%]` because the `animate-gradient-move` class already sets `background-size: 200% 200%`.

### 4. Implementation for Buttons (Solid Gradient Background)

**Example from `app/contracts/[id]/edit/page.tsx` (line 4813):**

```tsx
<Button
  className="text-sm text-white bg-gradient-to-r from-[#00A651] via-[#1B365D] to-[#00A651] bg-[length:200%_100%] animate-gradient-move hover:animate-gradient-fast shadow-lg"
>
  {currentLanguage === 'ar' ? 'معاينة A4' : 'A4 Preview'}
</Button>
```

**Key Classes Breakdown:**
- `bg-gradient-to-r` - Horizontal gradient
- `from-[#00A651] via-[#1B365D] to-[#00A651]` - Gradient colors
- `bg-[length:200%_100%]` - **REQUIRED** for buttons to make gradient larger than button
- `animate-gradient-move` - Base animation
- `hover:animate-gradient-fast` - Faster animation on hover
- `text-white` - White text on colored background

**Critical Difference:** Buttons need `bg-[length:200%_100%]` explicitly because they have a solid background, while text gradients get it automatically from the `.animate-gradient-move` class.

### 5. Inline Style Implementation (Alternative Method)

Some components use inline styles for more control:

**Example from `app/contracts/[id]/edit/page.tsx` (lines 4379-4384):**

```tsx
<Button
  style={{
    background: 'linear-gradient(135deg, rgba(0, 166, 81, 0.9) 0%, rgba(27, 54, 93, 0.9) 50%, rgba(0, 166, 81, 0.9) 100%)',
    backgroundSize: '200% 200%',
    animation: 'gradient-move 3s ease-in-out infinite'
  }}
>
  Button Text
</Button>
```

**Key Properties:**
- `background`: Linear gradient with 3 color stops (creates repeating pattern)
- `backgroundSize: '200% 200%'` - Makes gradient larger
- `animation: 'gradient-move 3s ease-in-out infinite'` - Applies animation

### 6. Component-Level Keyframes (Alternative)

Some components define the keyframes locally in a `<style>` tag:

**Example from `app/create/page.tsx` (lines 1705-1721):**

```tsx
<style jsx>{`
  @keyframes gradient-move {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  
  .animate-gradient-move {
    background-size: 200% 200%;
    animation: gradient-move 3s ease infinite;
  }
`}</style>
```

This is useful when you need component-specific animations or want to ensure the keyframes are scoped.

## Common Mistakes to Avoid

### ❌ Missing `bg-[length:200%_100%]` on buttons
**Wrong:**
```tsx
<Button className="bg-gradient-to-r from-[#00A651] to-[#1B365D] animate-gradient-move">
```

**Correct:**
```tsx
<Button className="bg-gradient-to-r from-[#00A651] to-[#1B365D] bg-[length:200%_100%] animate-gradient-move">
```

### ❌ Using wrong gradient direction
The gradient should go `from-[#00A651] via-[#1B365D] to-[#00A651]` (green → blue → green) to create a seamless loop.

### ❌ Forgetting `bg-clip-text text-transparent` for text
**Wrong:**
```tsx
<h1 className="bg-gradient-to-r from-[#00A651] to-[#1B365D] animate-gradient-move">
```

**Correct:**
```tsx
<h1 className="bg-gradient-to-r from-[#00A651] to-[#1B365D] bg-clip-text text-transparent animate-gradient-move">
```

### ❌ Not making gradient larger than element
The gradient MUST be larger (200%) than the element for the animation to work. Without this, the gradient won't move.

## Complete Working Examples

### Text Gradient Animation
```tsx
<h1 className="text-xl font-bold bg-gradient-to-r from-[#00A651] via-[#1B365D] to-[#00A651] bg-clip-text text-transparent animate-gradient-move">
  Animated Text
</h1>
```

### Button Gradient Animation
```tsx
<Button className="bg-gradient-to-r from-[#00A651] via-[#1B365D] to-[#00A651] bg-[length:200%_100%] animate-gradient-move hover:animate-gradient-fast text-white">
  Animated Button
</Button>
```

### Inline Style Button
```tsx
<Button
  style={{
    background: 'linear-gradient(90deg, #00A651 0%, #1B365D 50%, #00A651 100%)',
    backgroundSize: '200% 100%',
    animation: 'gradient-move 3s ease-in-out infinite'
  }}
  className="text-white"
>
  Animated Button
</Button>
```

## Color Values Used

- `#00A651` - Aramco Green
- `#1B365D` - Aramco Blue

These create the brand-consistent gradient effect.

## Animation Timing

- **Normal speed**: 3 seconds (`gradient-move`)
- **Fast speed**: 1 second (`gradient-fast`) - used on hover
- **Easing**: `linear` or `ease-in-out` for smooth transitions
- **Direction**: `alternate` makes it bounce back and forth smoothly

## Browser Compatibility

This implementation works in all modern browsers that support:
- CSS `@keyframes`
- `background-clip: text` (for text gradients)
- CSS animations

For older browsers, you may need vendor prefixes (`-webkit-`, `-moz-`).

