# Enterprise-Grade Design System for Desktop Applications
## Delta SVN × Tauri + React

A comprehensive design system for building modern, compact, production-grade desktop applications inspired by **VSCode**, **Microsoft Teams**, **Figma**, and **JetBrains IDEs**.

---

## Table of Contents
1. [Color System](#color-system)
2. [Typography System](#typography-system)
3. [Spacing & Layout](#spacing--layout)
4. [Component Sizing](#component-sizing)
5. [Interactive States](#interactive-states)
6. [Elevation & Shadows](#elevation--shadows)
7. [Motion & Animation](#motion--animation)
8. [Accessibility Guidelines](#accessibility-guidelines)
9. [Component Library](#component-library)
10.[Implementation Examples](#implementation-examples)

---

## Color System

### Semantic Color Tokens

#### Light Mode
```
Primary Surface:        #FAFAF9  (Off-white background)
Secondary Surface:      #FFFFFF  (Pure white for cards/panels)
Tertiary Surface:       #F5F5F5  (Subtle gray for hover states)

Text Primary:           #1F2937  (Charcoal gray - main text)
Text Secondary:         #6B7280  (Medium gray - secondary text)
Text Tertiary:          #9CA3AF  (Light gray - disabled/hint text)

Primary Accent:         #0F766E  (Teal - primary actions)
Primary Accent Hover:   #0D9488  (Lighter teal)
Primary Accent Active:  #14B8A6  (Even lighter teal)
Primary Accent Focus:   rgba(15, 118, 110, 0.1) (Teal with 10% opacity)

Secondary Accent:       #7C3AED  (Purple - secondary actions)
Secondary Accent Hover: #8B5CF6
Secondary Accent Active: #A78BFA
Secondary Accent Focus: rgba(124, 58, 237, 0.1)

Success:                #10B981  (Green)
Success Hover:          #34D399
Success Background:     rgba(16, 185, 129, 0.1)

Warning:                #F59E0B  (Amber)
Warning Hover:          #FBBF24
Warning Background:     rgba(245, 158, 11, 0.1)

Error:                  #DC2626  (Red)
Error Hover:            #EF4444
Error Background:       rgba(220, 38, 38, 0.1)

Info:                   #3B82F6  (Blue)
Info Hover:             #60A5FA
Info Background:        rgba(59, 130, 246, 0.1)

Border:                 #E5E7EB  (Light gray border)
Border Secondary:       #D1D5DB  (Darker gray border)
Divider:                #F3F4F6  (Subtle divider)

Selection Background:   rgba(15, 118, 110, 0.15) (Teal with 15% opacity)
Selection Text:         #1F2937
Hover Background:       #F3F4F6
Active Background:      #E5E7EB
```

#### Dark Mode
```
Primary Surface:        #0F172A  (Almost black)
Secondary Surface:      #1E293B  (Dark blue-gray)
Tertiary Surface:       #334155  (Slate gray - hover)

Text Primary:           #F8FAFC  (Off-white)
Text Secondary:         #CBD5E1  (Light gray)
Text Tertiary:          #94A3B8  (Medium gray)

Primary Accent:         #20B2AA  (Teal)
Primary Accent Hover:   #40D9CD
Primary Accent Active:  #5FE3D0
Primary Accent Focus:   rgba(32, 178, 170, 0.15)

Secondary Accent:       #A78BFA  (Purple)
Secondary Accent Hover: #C4B5FD
Secondary Accent Active: #DDD6FE
Secondary Accent Focus: rgba(167, 139, 250, 0.15)

Success:                #10B981  (Green)
Success Hover:          #6EE7B7
Success Background:     rgba(16, 185, 129, 0.15)

Warning:                #FBBF24  (Amber)
Warning Hover:          #FCD34D
Warning Background:     rgba(251, 191, 36, 0.15)

Error:                  #EF4444  (Red)
Error Hover:            #F87171
Error Background:       rgba(239, 68, 68, 0.15)

Info:                   #60A5FA  (Blue)
Info Hover:             #93C5FD
Info Background:        rgba(96, 165, 250, 0.15)

Border:                 #334155  (Slate gray)
Border Secondary:       #475569  (Darker slate)
Divider:                #1E293B  (Subtle divider)

Selection Background:   rgba(32, 178, 170, 0.25)
Selection Text:         #F8FAFC
Hover Background:       #1E293B
Active Background:      #334155
```

### Usage Guidelines

| Element | Light Mode | Dark Mode |
|---------|-----------|----------|
| **Page Background** | Primary Surface | Primary Surface |
| **Cards/Panels** | Secondary Surface | Secondary Surface |
| **Body Text** | Text Primary | Text Primary |
| **Secondary Text** | Text Secondary | Text Secondary |
| **Disabled Text** | Text Tertiary | Text Tertiary |
| **Primary CTA** | Primary Accent | Primary Accent |
| **Hover CTA** | Primary Accent Hover | Primary Accent Hover |
| **Borders** | Border | Border |
| **Dividers** | Divider | Divider |
| **Selection** | Selection Background | Selection Background |

---

## Typography System

### Font Stack

```css
/* Primary Font */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
             'Helvetica Neue', sans-serif;

/* Monospace Font (for code/diffs) */
font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;

/* Fallback */
font-family: system-ui, -apple-system, sans-serif;
```

### Type Scale (Modular Scale: 1.25)

```
Level    | Size  | Weight | Line Height | Letter Spacing | Usage
---------|-------|--------|-------------|----------------|----------------------------------
Display  | 32px  | 600    | 1.2 (38px)  | -0.02em        | Page title, modal headers
Heading1 | 28px  | 600    | 1.2 (34px)  | -0.01em        | Section titles
Heading2 | 22px  | 600    | 1.3 (29px)  | -0.01em        | Subsection titles
Heading3 | 18px  | 600    | 1.4 (25px)  | 0em            | Minor headings
Heading4 | 16px  | 600    | 1.4 (22px)  | 0em            | Small headings
Body     | 14px  | 400    | 1.5 (21px)  | 0em            | Regular text content
BodySm   | 13px  | 400    | 1.5 (19px)  | 0em            | Secondary text, descriptions
Caption  | 12px  | 400    | 1.4 (17px)  | 0.01em         | Hints, meta information
Label    | 12px  | 500    | 1.4 (17px)  | 0.02em         | Form labels, tags
Button   | 14px  | 500    | 1.4 (20px)  | 0.01em         | Button text
```

### Font Weights

```
Thin:       100   (Not commonly used)
Light:      300   (Rarely used, only in display)
Regular:    400   (Body text, secondary content)
Medium:     500   (Buttons, labels, emphasis)
SemiBold:   600   (Headings, primary content)
Bold:       700   (Not common - use semibold instead)
ExtraBold:  800   (Not used)
```

### CSS Variables for Typography

```css
/* Primitive Tokens */
--font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-family-mono: 'Fira Code', monospace;

--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;

--line-height-tight: 1.2;
--line-height-normal: 1.4;
--line-height-relaxed: 1.5;

--letter-spacing-tight: -0.02em;
--letter-spacing-normal: 0em;
--letter-spacing-loose: 0.02em;

/* Composite Tokens */
--type-display: {
  font-size: 32px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
};

--type-h1: {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
};

--type-h2: {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
};

--type-h3: {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0em;
};

--type-body: {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0em;
};

--type-body-sm: {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0em;
};

--type-caption: {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: 0.01em;
};

--type-label: {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.02em;
};

--type-button: {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.01em;
};
```

---

## Spacing & Layout

### Spacing Scale (Base Unit: 4px)

```
0   → 0px       Collapse spaces
1   → 4px       Micro spacing (icons, text)
2   → 8px       Tight spacing
3   → 12px      Compact spacing
4   → 16px      Default spacing (*)
5   → 20px      Comfortable spacing
6   → 24px      Generous spacing
7   → 28px      Extra spacing
8   → 32px      Large spacing
9   → 36px      Extra large
10  → 40px      Very large
11  → 44px      Component height baseline
12  → 48px      Large component height
```

### Common Spacing Patterns

```
Padding within components:        8px (horizontal), 6px (vertical) → 8px all
Margin between elements:          16px
Margin between sections:          24px - 32px
Header height:                    48px (includes 12px padding on each side)
Footer height:                    40px
Sidebar width:                    256px - 280px (or collapsed: 64px)
Main content padding:             16px - 24px
Modal padding:                    24px
Button padding:                   8px vertical × 12px horizontal (compact)
                                  10px vertical × 16px horizontal (default)
                                  12px vertical × 20px horizontal (large)
Form field padding:               8px vertical × 12px horizontal
Tab padding:                      12px vertical × 16px horizontal
List item padding:                8px vertical × 12px horizontal
Card padding:                     16px
```

### Responsive Breakpoints

```
Mobile:   320px - 640px   (Compact: 8px base spacing)
Tablet:   641px - 1024px  (Regular: 12px base spacing)
Desktop:  1025px+         (Generous: 16px base spacing)

For compact desktop apps (like VSCode):
Use 12px base spacing consistently
```

---

## Component Sizing

### Button Sizes

```
Small:
  - Height: 28px
  - Padding: 4px vertical × 8px horizontal
  - Font: 12px, weight 500
  - Icon size: 14px
  - Corner radius: 4px

Default:
  - Height: 32px
  - Padding: 6px vertical × 12px horizontal
  - Font: 14px, weight 500
  - Icon size: 16px
  - Corner radius: 6px

Large:
  - Height: 40px
  - Padding: 8px vertical × 16px horizontal
  - Font: 16px, weight 500
  - Icon size: 20px
  - Corner radius: 6px

Icon-only Button:
  - 32px × 32px (default)
  - 28px × 28px (small)
  - 40px × 40px (large)
```

### Input Field Sizes

```
Compact (Search, inline):
  - Height: 28px
  - Padding: 4px vertical × 8px horizontal
  - Font: 12px
  - Border: 1px solid var(--border)
  - Corner radius: 4px

Default:
  - Height: 32px
  - Padding: 6px vertical × 12px horizontal
  - Font: 14px
  - Border: 1px solid var(--border)
  - Corner radius: 6px

Large:
  - Height: 40px
  - Padding: 8px vertical × 12px horizontal
  - Font: 14px
  - Border: 1px solid var(--border)
  - Corner radius: 6px
```

### Header & Footer

```
Compact Header:
  - Height: 40px
  - Padding: 0px × 12px
  - Font size: 13px
  - Divider: 1px solid var(--border)
  - Background: var(--secondary-surface)

Standard Header:
  - Height: 48px
  - Padding: 0px × 16px
  - Font size: 14px
  - Divider: 1px solid var(--border)
  - Background: var(--secondary-surface)

Tall Header (with breadcrumb):
  - Height: 56px
  - Padding: 8px × 16px
```

### Sidebar Sizes

```
Collapsed:
  - Width: 52px
  - Icon size: 20px
  - Padding: 8px

Compact:
  - Width: 224px
  - Padding: 8px
  - Item height: 28px

Standard:
  - Width: 256px (VSCode standard)
  - Padding: 8px
  - Item height: 32px

Wide:
  - Width: 280px+
  - Padding: 12px
  - Item height: 36px
```

### Modal/Dialog

```
Small Dialog:
  - Width: 384px (24rem)
  - Max height: 60vh
  - Padding: 20px
  - Corner radius: 8px

Default Dialog:
  - Width: 512px (32rem)
  - Max height: 70vh
  - Padding: 24px
  - Corner radius: 8px

Large Dialog:
  - Width: 640px (40rem)
  - Max height: 80vh
  - Padding: 24px
  - Corner radius: 8px

Full Dialog:
  - Width: 90vw
  - Max width: 1200px
  - Max height: 90vh
  - Padding: 24px
```

---

## Interactive States

### Button States

```
Default (Rest):
  - Background: var(--primary-accent)
  - Color: white
  - Border: none
  - Cursor: pointer
  - Box shadow: none

Hover:
  - Background: var(--primary-accent-hover)
  - Color: white
  - Transition: background 150ms ease
  - Cursor: pointer

Active / Pressed:
  - Background: var(--primary-accent-active)
  - Color: white
  - Transform: scale(0.98) (optional subtle press feedback)
  - Transition: background 75ms ease

Focus:
  - Outline: 2px solid var(--primary-accent)
  - Outline-offset: 2px
  - Box shadow: 0 0 0 3px var(--primary-accent-focus)

Disabled:
  - Background: var(--tertiary-surface)
  - Color: var(--text-tertiary)
  - Cursor: not-allowed
  - Opacity: 0.6

Loading:
  - Display spinner inside button
  - Disable interactions
  - Preserve button dimensions
```

### Secondary Button States

```
Default:
  - Background: var(--tertiary-surface)
  - Color: var(--text-primary)
  - Border: 1px solid var(--border)

Hover:
  - Background: var(--hover-background)
  - Color: var(--text-primary)
  - Border: 1px solid var(--border-secondary)

Active:
  - Background: var(--active-background)
  - Color: var(--text-primary)

Focus:
  - Box shadow: 0 0 0 3px var(--primary-accent-focus)
  - Border: 1px solid var(--primary-accent)
```

### Input Field States

```
Default (Empty):
  - Border: 1px solid var(--border)
  - Background: var(--secondary-surface)
  - Color: var(--text-primary)

Hover:
  - Border: 1px solid var(--border-secondary)
  - Background: var(--secondary-surface)

Focus:
  - Border: 2px solid var(--primary-accent)
  - Background: var(--secondary-surface)
  - Box shadow: 0 0 0 3px var(--primary-accent-focus)
  - Outline: none

Filled:
  - Border: 1px solid var(--border)
  - Background: var(--secondary-surface)
  - Color: var(--text-primary)

Error:
  - Border: 2px solid var(--error)
  - Background: var(--error-background)
  - Box shadow: 0 0 0 3px rgba(220, 38, 38, 0.1)

Disabled:
  - Border: 1px solid var(--border)
  - Background: var(--tertiary-surface)
  - Color: var(--text-tertiary)
  - Cursor: not-allowed
```

### List Item / Selection States

```
Default:
  - Background: transparent
  - Color: var(--text-primary)
  - Padding: 8px 12px

Hover:
  - Background: var(--hover-background)
  - Color: var(--text-primary)

Active / Selected:
  - Background: var(--selection-background)
  - Color: var(--text-primary)
  - Border-left: 3px solid var(--primary-accent)

Focus:
  - Outline: 2px solid var(--primary-accent)
  - Outline-offset: -2px
```

---

## Elevation & Shadows

### Shadow System

```
Elevation 0 (None):
  - box-shadow: none

Elevation 1 (Subtle):
  - Light mode: 0 1px 2px rgba(0, 0, 0, 0.06)
  - Dark mode:  0 1px 2px rgba(0, 0, 0, 0.3)
  - Use for: Borders, borders alternate

Elevation 2 (Card):
  - Light mode: 0 4px 6px rgba(0, 0, 0, 0.08)
  - Dark mode:  0 4px 6px rgba(0, 0, 0, 0.4)
  - Use for: Cards, panels, small popovers

Elevation 3 (Raised):
  - Light mode: 0 10px 15px rgba(0, 0, 0, 0.1)
  - Dark mode:  0 10px 15px rgba(0, 0, 0, 0.5)
  - Use for: Tooltips, dropdown menus, context menus

Elevation 4 (Floating):
  - Light mode: 0 20px 25px rgba(0, 0, 0, 0.12)
  - Dark mode:  0 20px 25px rgba(0, 0, 0, 0.6)
  - Use for: Modals, alert dialogs, floating panels

Elevation 5 (Maximum):
  - Light mode: 0 25px 50px rgba(0, 0, 0, 0.15)
  - Dark mode:  0 25px 50px rgba(0, 0, 0, 0.75)
  - Use for: Maximum prominence (rarely used)

Inset Shadow (Pressed):
  - box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1)
  - Use for: Pressed buttons, depressed states
```

### Border Radius System

```
XS:  2px  - Subtle rounding (rarely used)
SM:  4px  - Compact components, small elements
MD:  6px  - Default rounding for most elements
LG:  8px  - Cards, modals, larger panels
XL:  12px - Extra large components
Full: 50% - Pills, circles, fully rounded

Apply as:
- Buttons:        6px
- Inputs:         6px
- Cards:          8px
- Modals:         8px
- Badges/Pills:   12px
- Avatars:        4px (or 50%)
- Icons in buttons: Inherit from button
```

---

## Motion & Animation

### Transition Durations

```
Instant:      0ms   - No transition (use sparingly)
Fast:         75ms  - Micro-interactions (button press, checkbox toggle)
Quick:        150ms - Standard interactions (fade, slide)
Normal:       250ms - Medium complexity (open menu, change state)
Slow:         350ms - Important transitions (modal appear)
Slower:       500ms - Significant changes (theme switch)
```

### Easing Functions

```
Ease In:          cubic-bezier(0.4, 0, 1, 1)
Ease Out:         cubic-bezier(0, 0, 0.2, 1)
Ease In-Out:      cubic-bezier(0.4, 0, 0.2, 1)
Ease Out Quart:   cubic-bezier(0.165, 0.84, 0.44, 1)  ← Recommended for UI

Standard: cubic-bezier(0.2, 0, 0, 1) - Smooth, professional
```

### Animation Guidelines

```
Button interactions:
  - Transition: background 150ms cubic-bezier(0.165, 0.84, 0.44, 1)
  - Optional: Transform scale(0.98) on press (75ms)

Menu/Dropdown open:
  - Opacity: 0 → 1 (150ms)
  - Transform: scaleY(0.95) → 1 (150ms)
  - Transform-origin: top

Modal appearance:
  - Backdrop: opacity 0 → 0.5 (250ms)
  - Content: transform translateY(20px) → 0 (250ms)
  - Opacity: 0 → 1 (250ms)

Loading indicator:
  - Rotate: 0 → 360deg (600ms, infinite linear)

Hover effects:
  - Subtle color shift: 150ms
  - Scale: 1 → 1.02 (150ms) ← Optional for desktop

Avoid:
  - Animations longer than 500ms for common interactions
  - Multiple simultaneous animations
  - Abrupt timing (use easing always)
  - Motion on disabled elements
```

---

## Accessibility Guidelines

### Color Contrast

```
WCAG AA (Minimum):
  - 4.5:1 for normal text
  - 3:1 for large text (18px+ or 14px bold+)
  - 3:1 for graphical elements

WCAG AAA (Enhanced):
  - 7:1 for normal text
  - 4.5:1 for large text

Recommendation for desktop apps:
  - Aim for at least 5:1 contrast for all interactive elements
  - Never rely on color alone to convey information
  - Use patterns, icons, or text alongside color
```

### Focus Management

```
Focus Indicator:
  - Always visible (2px solid outline or similar)
  - Minimum 3px total width (including 1px space)
  - Use primary accent color
  - High contrast (>3:1) against background

Focus Order:
  - Left to right, top to bottom
  - Logical flow matching visual order
  - Use tabindex: 0 for custom interactive elements
  - Never use tabindex: positive values

Keyboard Navigation:
  - Tab: Move focus forward
  - Shift+Tab: Move focus backward
  - Enter: Activate button
  - Space: Toggle checkbox/radio
  - Arrow keys: Navigate menu/select options
  - Escape: Close modal/menu
```

### Text & Readability

```
Font size minimum: 12px (never below)
Line height minimum: 1.4x font size
Letter spacing: 0.02em for small text
Max line width: 80 characters
Color contrast: 4.5:1 minimum for body text

For code/monospace:
  - Font size: 12px minimum
  - Line height: 1.6x
  - Line length: 100 characters max
```

### Interactive Element Sizing

```
Minimum touch target: 44px × 44px (desktop: 32px acceptable)
Minimum click area: 32px × 32px

For buttons:
  - Minimum: 28px height (small)
  - Recommended: 32px+ height
  - Adequate padding around label

For checkboxes/radios:
  - 16px × 16px minimum
  - 20px × 20px recommended
  - Click area: 44px × 44px (includes label)
```

### Motion & Animation

```
Prefers reduced motion (@prefers-reduced-motion):
  - Disable animations for users who prefer reduced motion
  - Keep transitions very short (< 100ms)
  - Never auto-play animations
  - Provide control over animations

Implementation:
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Component Library

### Anchors / Links

```
Default (Inline):
  - Color: var(--primary-accent)
  - Text decoration: none
  - Cursor: pointer
  - Underline: On hover/focus

Hover:
  - Color: var(--primary-accent-hover)
  - Text decoration: underline

Focus:
  - Outline: 2px solid var(--primary-accent)
  - Outline-offset: 2px

Visited (Optional):
  - Color: var(--secondary-accent)
  - Text decoration: none

Disabled:
  - Color: var(--text-tertiary)
  - Cursor: not-allowed
  - Opacity: 0.6
  - Text decoration: none
```

### Modals / Dialogs

```
Structure:
  - Backdrop: Semi-transparent (typically 50% opacity black)
  - Container: Centered, max-width 512px (default)
  - Header: 24px padding, title text
  - Content: 24px padding, scrollable if needed
  - Footer: 24px padding, action buttons (right-aligned)

Backdrop:
  - Background: rgba(0, 0, 0, 0.5) - light mode
  - Background: rgba(0, 0, 0, 0.75) - dark mode
  - Animation: Fade in 250ms
  - Click-to-close: Optional

Modal Container:
  - Background: var(--secondary-surface)
  - Border radius: 8px
  - Box shadow: Elevation 4
  - Min width: 320px
  - Max width: 512px (default)
  - Max height: 90vh
  - Animation: FadeIn + Scale from 0.95

Header:
  - Font: Heading2 (22px, 600)
  - Padding: 24px
  - Border bottom: 1px solid var(--divider)
  - Optional close button (top-right)

Content:
  - Padding: 24px
  - Font: Body (14px, 400)
  - Scrollable if exceeds max-height
  - Max height: calc(90vh - 120px)

Footer:
  - Padding: 24px
  - Border top: 1px solid var(--divider)
  - Display: Flex, justify-content: flex-end, gap: 12px
  - Primary action: Right
  - Secondary action: Left or cancel
```

### Popovers / Tooltips

```
Popover (Interactive):
  - Width: 240px - 320px
  - Padding: 12px
  - Background: var(--secondary-surface)
  - Border: 1px solid var(--border)
  - Border radius: 6px
  - Box shadow: Elevation 3
  - Arrow: 8px triangle pointing to trigger
  - Animation: FadeIn + Scale 150ms

Tooltip (Read-only):
  - Width: Auto (max 200px)
  - Padding: 8px 12px
  - Background: var(--text-primary) (light mode)
  - Background: var(--text-primary) (dark mode)
  - Color: Inverse of background
  - Border radius: 4px
  - Font: Caption (12px, 400)
  - No arrow (simple tail)
  - Animation: FadeIn 100ms
  - Delay: 500ms before show

Placement:
  - Top (default)
  - Bottom
  - Left
  - Right
  - Auto (flip if would go off-screen)

Spacing from trigger: 8px
```

### Context Menus

```
Container:
  - Width: 200px - 280px
  - Background: var(--secondary-surface)
  - Border: 1px solid var(--border)
  - Border radius: 6px
  - Box shadow: Elevation 3
  - Overflow: hidden
  - Animation: FadeIn + ScaleY 150ms

Menu Item:
  - Padding: 8px 12px
  - Height: 32px (including padding)
  - Font: Body (14px, 400)
  - Display: Flex, align-items: center, gap: 8px

Menu Item (Hover):
  - Background: var(--hover-background)
  - Color: var(--text-primary)

Menu Item (Active/Selected):
  - Background: var(--selection-background)
  - Color: var(--text-primary)
  - Left border: 3px solid var(--primary-accent)

Menu Item (Disabled):
  - Color: var(--text-tertiary)
  - Cursor: not-allowed
  - Opacity: 0.6

Separator:
  - Height: 1px
  - Background: var(--divider)
  - Margin: 4px 0

Icon:
  - Size: 16px
  - Color: var(--text-primary)
  - Margin right: 8px

Keyboard Shortcut (optional):
  - Font: Caption (12px, 400)
  - Color: var(--text-secondary)
  - Position: Right-aligned
  - Margin left: 16px
```

### Badges / Tags

```
Compact Badge:
  - Height: 20px
  - Padding: 2px 8px
  - Font: Label (12px, 500)
  - Border radius: 10px (pill)
  - Border: 1px solid var(--border)
  - Background: var(--tertiary-surface)
  - Color: var(--text-primary)

Colored Badge:
  - Background: var(--primary-accent-focus) (10% opacity)
  - Border: 1px solid var(--primary-accent)
  - Color: var(--primary-accent)

Solid Badge:
  - Background: var(--primary-accent)
  - Color: white
  - Border: none

Removable Badge (Tag):
  - Additional: Close icon button (12px)
  - Padding: 4px 4px 4px 8px (right padding reduced)
  - Interactive: Can be removed on click
```

### Status Indicators

```
Dot (6-8px diameter):
  - Success: var(--success) solid green
  - Warning: var(--warning) solid amber
  - Error: var(--error) solid red
  - Info: var(--info) solid blue
  - Neutral: var(--text-secondary) solid gray

Ring (Outer glow):
  - Pulse animation: opacity 0 → 1 (1s, infinite)
  - Use for "active" or "updated" status

Icon:
  - Success: ✓ (checkmark)
  - Warning: ⚠ (warning triangle)
  - Error: ✕ (cross)
  - Info: ⓘ (info circle)
```

---

## Implementation Examples

### React Component: Button

```jsx
const Button = ({ 
  variant = 'primary',    // primary, secondary, outline
  size = 'default',       // small, default, large
  disabled = false,
  loading = false,
  icon,
  children,
  ...props 
}) => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium cursor-pointer transition-all
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-60 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-primary-accent text-white
      hover:bg-primary-accent-hover
      active:bg-primary-accent-active
      focus-visible:ring-primary-accent-focus
    `,
    secondary: `
      bg-tertiary-surface text-text-primary
      border border-border
      hover:bg-hover-background hover:border-border-secondary
      active:bg-active-background
      focus-visible:ring-primary-accent-focus
    `,
    outline: `
      bg-transparent text-text-primary
      border border-border
      hover:bg-hover-background
      active:bg-active-background
      focus-visible:ring-primary-accent-focus
    `,
  };

  const sizes = {
    small: 'h-7 px-2 text-xs rounded-sm',
    default: 'h-8 px-3 text-sm rounded-md',
    large: 'h-10 px-4 text-base rounded-md',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon && <Icon className="mr-2" />}
      {children}
    </button>
  );
};
```

### React Component: Input

```jsx
const Input = ({
  size = 'default',
  error,
  disabled,
  icon,
  ...props
}) => {
  const baseClasses = `
    w-full px-3 border rounded-md
    font-body transition-colors
    placeholder:text-text-tertiary
    disabled:bg-tertiary-surface disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-offset-2
    focus:ring-primary-accent-focus
  `;

  const sizes = {
    small: 'h-7 text-xs',
    default: 'h-8 text-sm',
    large: 'h-10 text-base',
  };

  const borders = error
    ? 'border-error focus:border-error'
    : 'border-border focus:border-primary-accent';

  return (
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
      <input
        className={`${baseClasses} ${sizes[size]} ${borders} ${icon ? 'pl-10' : ''}`}
        disabled={disabled}
        {...props}
      />
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
};
```

### CSS Variables Setup (Root)

```css
:root {
  /* Colors - Light Mode */
  --primary-surface: #FAFAF9;
  --secondary-surface: #FFFFFF;
  --tertiary-surface: #F5F5F5;
  
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;
  
  --primary-accent: #0F766E;
  --primary-accent-hover: #0D9488;
  --primary-accent-active: #14B8A6;
  --primary-accent-focus: rgba(15, 118, 110, 0.1);
  
  --border: #E5E7EB;
  --divider: #F3F4F6;
  --hover-background: #F3F4F6;
  --active-background: #E5E7EB;
  --selection-background: rgba(15, 118, 110, 0.15);
  
  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'Fira Code', monospace;
  
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Timing */
  --duration-fast: 75ms;
  --duration-normal: 150ms;
  --duration-slow: 250ms;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Colors - Dark Mode */
    --primary-surface: #0F172A;
    --secondary-surface: #1E293B;
    --tertiary-surface: #334155;
    
    --text-primary: #F8FAFC;
    --text-secondary: #CBD5E1;
    --text-tertiary: #94A3B8;
    
    --primary-accent: #20B2AA;
    --primary-accent-hover: #40D9CD;
    --primary-accent-active: #5FE3D0;
    --primary-accent-focus: rgba(32, 178, 170, 0.15);
    
    --border: #334155;
    --divider: #1E293B;
    --hover-background: #1E293B;
    --active-background: #334155;
    --selection-background: rgba(32, 178, 170, 0.25);
    
    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  }
}

/* Global Styles */
body {
  background-color: var(--primary-surface);
  color: var(--text-primary);
  font-family: var(--font-family-base);
  font-size: 14px;
  line-height: 1.5;
}

code, pre {
  font-family: var(--font-family-mono);
}
```

---

## Best Practices & Guidelines

### Do's ✅

- ✅ Use semantic color tokens consistently
- ✅ Maintain 4px spacing grid
- ✅ Always include focus states
- ✅ Test with keyboard navigation
- ✅ Keep animations under 250ms for standard interactions
- ✅ Use established button variants (primary, secondary, outline)
- ✅ Ensure 4.5:1 color contrast minimum
- ✅ Group related spacing (3-4 related items together)
- ✅ Use monospace font for diffs and code
- ✅ Provide visual feedback for all interactions

### Don'ts ❌

- ❌ Mix custom colors outside token system
- ❌ Use hardcoded px values for spacing
- ❌ Rely on color alone for information
- ❌ Create focus indicators with opacity < 3:1
- ❌ Animate for more than 500ms on common actions
- ❌ Break the 4px spacing grid
- ❌ Use multiple font sizes for body text
- ❌ Make components smaller than 32px × 32px
- ❌ Forget hover/active/disabled states
- ❌ Skip keyboard navigation testing

---

## File Structure (For Implementation)

```
src/
├── tokens/
│   ├── colors.css
│   ├── typography.css
│   ├── spacing.css
│   └── shadows.css
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.module.css
│   │   └── Button.stories.tsx
│   ├── Input/
│   ├── Modal/
│   ├── Popover/
│   ├── ContextMenu/
│   └── ...
├── styles/
│   ├── globals.css
│   ├── theme.css
│   └── accessibility.css
└── utils/
    ├── theme.ts
    ├── cn.ts (classname merger)
    └── accessibility.ts
```

---

## Migration Strategy (From Current Design)

```
Phase 1: Foundation (Week 1)
  ✓ Define and document color tokens
  ✓ Set up CSS variables in root
  ✓ Create typography scale with variables
  ✓ Establish spacing system

Phase 2: Core Components (Week 2-3)
  ✓ Button (all variants and sizes)
  ✓ Input/Form controls
  ✓ Header/Footer
  ✓ Sidebar

Phase 3: Complex Components (Week 3-4)
  ✓ Modal/Dialog
  ✓ Popover/Tooltip
  ✓ Context Menu
  ✓ Status indicators

Phase 4: Polish (Week 4-5)
  ✓ Dark mode refinement
  ✓ Accessibility audit
  ✓ Animation smoothing
  ✓ Documentation & Storybook
```

---

## Performance Considerations

```
CSS Variables:
  - Use CSS variables for dynamic theming (minimal JS overhead)
  - Avoid excessive nesting
  - Use will-change sparingly for animations

Font Loading:
  - System fonts preferred (no network request)
  - If custom fonts: Use font-display: swap
  - Preload critical fonts

Images & Icons:
  - Use SVG for icons (scalable, crisp)
  - Lazy load non-critical images
  - Use srcset for responsive images

Animation:
  - Use transform and opacity (GPU accelerated)
  - Avoid animating layout properties (height, width)
  - Use will-change: transform for animated elements
```

---

## Documentation & Team Handoff

Create a Storybook instance with:
- All components showcased
- Live code examples
- Props documentation
- Accessibility notes
- Dark mode preview
- Responsive variations

Share this guide as:
- Markdown file (version controlled)
- Figma design system (with components)
- Storybook (interactive showcase)
- Design token JSON (for automation)

---

**Last Updated:** December 2024
**Design System Version:** 1.0.0-enterprise
**Target Platforms:** Tauri (Desktop)

---

This design system combines best practices from VSCode, Microsoft Teams, Figma, and modern enterprise applications. It's production-ready, accessible, and optimized for desktop experiences.

For any questions or iterations, use this guide as the source of truth for your team.
