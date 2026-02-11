/**
 * Semantic Design Tokens Type Definitions
 *
 * Semantic tokens map primitive tokens to usage-specific names.
 * They provide meaning-based access to design values.
 */

import type { PrimitiveColorTokens } from "./primitives";

export type SemanticColorPath =
  | "bg.base"
  | "bg.surface"
  | "bg.elevated"
  | "text.primary"
  | "text.secondary"
  | "text.muted"
  | "border.default"
  | "border.subtle";

export interface ThemeConfig {
  dark: {
    bg: string;
    text: string;
  };
  light: {
    bg: string;
    text: string;
  };
}

export interface SemanticTokens {
  colors: {
    bg: {
      base: string;
      surface: string;
      elevated: string;
      gradient: {
        start: string;
        end: string;
      };
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
    };
    border: {
      default: string;
      subtle: string;
      hover: string;
    };
    accent: {
      primary: string;
      secondary: string;
      danger: string;
      info: string;
      warning: string;
      success: string;
    };
    neon: {
      green: string;
      cyan: string;
      purple: string;
      pink: string;
      lime: string;
      magenta: string;
      yellow: string;
      gold: string;
    };
    category: {
      orange: string;
      blue: string;
      amber: string;
      red: string;
      gray: string;
      indigo: string;
      yellow: string;
    };
    light: {
      surface: string;
      border: string;
      text: string;
      textMuted: string;
    };
  };
  font: {
    family: {
      sans: string;
      serif: string;
      mono: string;
    };
    weight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    size: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      "2xl": string;
      "3xl": string;
      "4xl": string;
    };
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadow: Record<string, string>;
  zIndex: Record<string, string | number>;
}

export function createSemanticTokens(primitives: {
  colors: PrimitiveColorTokens;
}): SemanticTokens {
  const { colors } = primitives;

  return {
    colors: {
      bg: {
        base: colors.core.black.$value,
        surface: colors.neutral[900].$value,
        elevated: colors.neutral[800].$value,
        gradient: {
          start: "#0a0f0d",
          end: "#152821",
        },
      },
      text: {
        primary: colors.neutral[0].$value,
        secondary: colors.neutral[400].$value,
        muted: colors.neutral[600].$value,
        inverse: colors.core.black.$value,
      },
      border: {
        default: colors.neutral[800].$value,
        subtle: colors.neutral[900].$value,
        hover: colors.accent.primary.$value,
      },
      accent: {
        primary: colors.accent.primary.$value,
        secondary: colors.accent.secondary.$value,
        danger: colors.accent.danger.$value,
        info: colors.accent.info.$value,
        warning: colors.accent.warning.$value,
        success: colors.accent.success.$value,
      },
      neon: {
        green: colors.neon.green.$value,
        cyan: colors.neon.cyan.$value,
        purple: colors.neon.purple.$value,
        pink: colors.neon.pink.$value,
        lime: colors.neon.lime.$value,
        magenta: colors.neon.magenta.$value,
        yellow: colors.neon.yellow.$value,
        gold: colors.neon.gold.$value,
      },
      category: {
        orange: colors.category.orange.$value,
        blue: colors.category.blue.$value,
        amber: colors.category.amber.$value,
        red: colors.category.red.$value,
        gray: colors.category.gray.$value,
        indigo: colors.category.indigo.$value,
        yellow: colors.category.yellow.$value,
      },
      light: {
        surface: colors.light.surface.$value,
        border: colors.light.border.$value,
        text: colors.light.text.$value,
        textMuted: colors.light.textMuted.$value,
      },
    },
    font: {
      family: {
        sans: "Inter",
        serif: "Merriweather",
        mono: "JetBrains Mono",
      },
      weight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      size: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "30px",
        "4xl": "36px",
      },
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
    spacing: {
      "0": "0px",
      "1": "4px",
      "2": "8px",
      "3": "12px",
      "4": "16px",
      "5": "20px",
      "6": "24px",
      "8": "32px",
      "10": "40px",
      "12": "48px",
      "16": "64px",
    },
    borderRadius: {
      none: "0px",
      sm: "4px",
      DEFAULT: "6px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      "2xl": "1rem",
      "3xl": "1.5rem",
      full: "9999px",
    },
    shadow: {
      soft: "0 4px 20px rgba(0, 0, 0, 0.3)",
      accent: "0 4px 20px rgba(0, 255, 148, 0.15)",
      glow: "0 0 40px rgba(0, 255, 148, 0.1)",
      card: "0 8px 32px rgba(0, 0, 0, 0.4)",
      float: "0 20px 60px rgba(0, 0, 0, 0.5)",
    },
    zIndex: {
      auto: "auto",
      dropdown: 1000,
      sticky: 1100,
      modal: 1200,
      popover: 1300,
      tooltip: 1400,
      toast: 1500,
    },
  };
}
