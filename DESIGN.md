---
name: Deep Space OS
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#ffb3af'
  on-tertiary: '#650911'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  surface-light: '#F8FAFC'
  surface-container-light: '#FFFFFF'
  outline-light: '#E2E8F0'
  tertiary-sky: '#0EA5E9'
  error-red: '#EF4444'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  stats-num:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 1rem
  margin-desktop: 2rem
  margin-mobile: 1rem
  card-padding: 1.5rem
  element-gap: 0.75rem
---

## Brand & Style
The design system is a high-performance "digital cockpit" engineered for personal management and data density. It follows a **Modern Minimalist** aesthetic heavily influenced by **Bento Grid** layouts, organizing complex information into glanceable, modular containers.

The emotional response is "calm control." By leveraging deep-space backgrounds and vibrant, purposeful emerald and violet accents, the UI reduces cognitive load. The visual style utilizes a **Glassmorphism-lite** approach, where information is layered on subtle containers that feel integrated into the environment. The design prioritizes clarity, technical precision, and a professional, "OS-level" reliability.

## Colors
The system operates on a dual-theme foundation. The **Dark Mode** (default) utilizes a Deep Slate base to reduce eye strain, while the **Light Mode** provides a clean, high-clarity alternative for daylight environments.

- **Primary (Emerald 500):** Symbolizes growth, completion, and positive action. Used for success states and primary interactive targets.
- **Secondary (Violet 500):** Symbolizes focus and deep work. Used for creative tasks and secondary interactive elements.
- **Tertiary (Sky):** Reserved for informational status and scheduling metadata.
- **Surface Strategy:** 
    - In **Dark Mode**, surfaces are built using layered opacities of Slate over the `#0F172A` base.
    - In **Light Mode**, the interface shifts to a Slate 50 (`#F8FAFC`) background with pure white (`#FFFFFF`) containers to establish clear elevation.

## Typography
The typography system balances the neutral, highly legible character of **Inter** with the technical, "developer-tool" aesthetic of **JetBrains Mono**.

- **Inter** handles all primary content, ensuring cross-platform readability and a professional tone.
- **JetBrains Mono** is used exclusively for `label-caps` and metadata, reinforcing the "OS" narrative.
- **Scaling:** Headlines utilize tight letter-spacing for a modern look. On mobile devices, `display-lg` automatically scales down to `display-lg-mobile` to maintain composition.

## Layout & Spacing
The layout follows a **Fluid Bento Grid** model based on an 8px rhythmic unit. Content is housed in modular containers that snap to a 12-column grid.

- **Desktop (12-column):** 1rem (16px) gutters with 2rem margins. Cards span 3, 4, 6, or 12 columns.
- **Tablet (6-column):** 1rem gutters with 1.5rem margins.
- **Mobile (Single-column):** 0.75rem gaps with 1rem side margins.
- **Padding:** Internal card padding is strictly 1.5rem to provide significant negative space, preventing the high data density from feeling cluttered.

## Elevation & Depth
Hierarchy is conveyed through **Tonal Layering** and **Low-Contrast Outlines**.

- **Level 0 (Base):** The foundation layer.
- **Level 1 (Cards):** Utilizes a 1px solid border. In Dark mode, use `Slate 700`. In Light mode, use `Slate 200`.
- **Level 2 (Overlays/Modals):** Achieves "lift" through a combination of a subtle 20% opacity black shadow and a backdrop blur (12px) to maintain the glass-on-slate aesthetic. 

Interaction is signaled by border color transitions rather than physical movement; hovering over a container should subtly shift its border to the Primary or Secondary accent color.

## Shapes
The shape language is **Softly Geometric**. 

- **Containers:** All bento cards and primary containers use a 1rem radius to contrast against the rigid grid.
- **Interactions:** Buttons, inputs, and chips use a 0.5rem (8px) radius for a more precise, technical feel.
- **Data Elements:** Progress tracks, tags, and status dots are fully rounded (pill-shaped) to distinguish dynamic data from structural framing.

## Components
- **Bento Cards:** Modular containers requiring a `label-caps` header. They should support background "glow" effects in the accent color for active states.
- **Theme Toggle:** A pill-shaped segmented control. The active state is indicated by a sliding surface that carries a subtle emerald glow in dark mode or a clean slate shadow in light mode.
- **Action Buttons:** Primary buttons are solid Emerald; secondary buttons are Ghost-style with a 1px Violet border. 
- **Habit Checkboxes:** 24px squares with a 4px radius. Checked states use a vertical gradient of Emerald and a micro-interaction scale-up effect.
- **Input Fields:** Minimalist containers with a subtle fill (Slate 800 in Dark / Slate 100 in Light). Focus is indicated by a 2px Sky Blue bottom-border.
- **Heatmaps:** 12x12px data points. Empty states match the base surface; active states scale in opacity using the Primary Emerald color.