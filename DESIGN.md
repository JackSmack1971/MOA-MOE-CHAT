---
name: MoA-MoE Chatbot
description: High-precision interface for Symbolic Mixture-of-Experts
colors:
  primary: "#00F2FF"
  secondary: "#FF00E5"
  neutral-bg: "#0A0A0B"
  surface: "rgba(30, 41, 59, 0.4)"
  border: "rgba(255, 255, 255, 0.1)"
typography:
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  message-user:
    backgroundColor: "rgba(0, 242, 255, 0.1)"
    rounded: "{rounded.md}"
    borderLeft: "4px solid {colors.primary}"
  message-assistant:
    backgroundColor: "rgba(255, 0, 229, 0.1)"
    rounded: "{rounded.md}"
    borderLeft: "4px solid {colors.secondary}"
---

# Design System: MoA-MoE Chatbot

## 1. Overview

**Creative North Star: "The Orchestrator's Console"**

The MoA-MoE interface is a technical instrument designed for the transparent oversight of complex AI reasoning. It rejects the soft, "friendly" aesthetics of consumer AI in favor of a high-precision, authoritative environment that emphasizes logic and performance.

**Key Characteristics:**
- **Zero-Gravity Depth**: Surfaces appear as semi-transparent glass panes floating over a deep void.
- **Neon Logic**: Use of high-chroma cyan and magenta to distinguish between human input and machine reasoning.
- **High-Density Data**: Information is compact and legible, prioritizing data over decoration.

## 2. Colors

The palette uses a "Void" background to allow neon logic accents to vibrate with maximum contrast.

### Primary
- **Command Cyan** (#00F2FF): The color of human agency. Used for user messages, active inputs, and primary action buttons.

### Secondary
- **Logic Magenta** (#FF00E5): The color of agent reasoning. Used for assistant responses, expert node highlights, and reasoning status.

### Neutral
- **The Void** (#0A0A0B): The foundational canvas.
- **Glass Slate** (rgba(30, 41, 59, 0.4)): Used for UI surfaces to create a layered, technical depth.
- **Ether Border** (rgba(255, 255, 255, 0.1)): Subtle 1px dividers.

## 3. Typography

**Body Font:** Inter (with system fallback)
**Label Font:** Inter (uppercase for labels)

### Hierarchy
- **Headline** (700, 24px, 1.2): Main header titles.
- **Body** (400, 16px, 1.5): Standard chat text and descriptions.
- **Label** (600, 12px, 1.1, uppercase): Status bars, telemetry labels, and expert node names.

## 4. Elevation

The system rejects drop shadows. Depth is achieved entirely through **Backdrop Filtering** and **Tonal Layering**.

**The Glass Rule.** Surfaces must use `backdrop-filter: blur(12px)` and a semi-transparent background to maintain the "Orchestrator" aesthetic.

## 5. Components

### Buttons
- **Shape:** Sharp (4px radius)
- **Primary:** Command Cyan background with black text.
- **Interaction:** Instant state changes; no bounce or elastic motion.

### Message Bubbles
- **User:** Subtle Cyan tint with a 4px solid left border.
- **Agent:** Subtle Magenta tint with a 4px solid left border.

### Expert Graph
- **Nodes:** Pulse Magenta when active.
- **Edges:** Variable opacity Cyan based on adjacency weights.

## 6. Do's and Don'ts

### Do:
- **Do** use 1px borders for all container dividers.
- **Do** maintain a strict dark theme.
- **Do** use uppercase labels for technical status indicators.

### Don't:
- **Don't** use drop shadows. Depth must be glassmorphic.
- **Don't** use generic SaaS cream or white backgrounds.
- **Don't** use border-left greater than 4px on message cards.
- **Don't** use rounded corners larger than 12px.
