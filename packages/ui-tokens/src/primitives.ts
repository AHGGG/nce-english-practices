/**
 * Primitive Design Tokens Type Definitions
 *
 * These types represent the raw design tokens before any transforms.
 * Generated from DTCG-format JSON files.
 */

export interface ColorToken {
  $value: string;
  $type: "color";
  $description?: string;
}

export interface DimensionToken {
  $value: string;
  $type: "dimension";
  $description?: string;
}

export interface FontFamilyToken {
  $value: string;
  $type: "fontFamily";
  $description?: string;
}

export interface FontWeightToken {
  $value: number;
  $type: "fontWeight";
}

export interface ShadowToken {
  $value: string;
  $type: "shadow";
  $description?: string;
}

export interface NumberToken {
  $value: number;
  $type: "number";
}

export type DesignToken =
  | ColorToken
  | DimensionToken
  | FontFamilyToken
  | FontWeightToken
  | ShadowToken
  | NumberToken;

export interface PrimitiveColorTokens {
  core: Record<string, ColorToken>;
  neutral: Record<string, ColorToken>;
  accent: Record<string, ColorToken>;
  neon: Record<string, ColorToken>;
  category: Record<string, ColorToken>;
  light: Record<string, ColorToken>;
}

export interface PrimitiveTypographyTokens {
  font: {
    family: Record<string, FontFamilyToken>;
    weight: Record<string, FontWeightToken>;
    size: Record<string, DimensionToken>;
  };
  lineHeight: Record<string, NumberToken>;
  letterSpacing: Record<string, NumberToken>;
}

export interface PrimitiveSpacingTokens {
  spacing: Record<string, DimensionToken>;
  borderRadius: Record<string, DimensionToken>;
}

export interface PrimitiveShadowTokens {
  shadow: Record<string, ShadowToken>;
  opacity: Record<string, NumberToken>;
  zIndex: Record<string, NumberToken | { $value: string; $type: "number" }>;
}

export interface SemanticColorTokens {
  bg: {
    base: ColorToken;
    surface: ColorToken;
    elevated: ColorToken;
    gradient: {
      start: ColorToken;
      end: ColorToken;
    };
  };
  text: {
    primary: ColorToken;
    secondary: ColorToken;
    muted: ColorToken;
    inverse: ColorToken;
  };
  border: {
    default: ColorToken;
    subtle: ColorToken;
    hover: ColorToken;
  };
}

export type AllTokens = {
  color: PrimitiveColorTokens;
  font: PrimitiveTypographyTokens["font"];
  lineHeight: PrimitiveTypographyTokens["lineHeight"];
  letterSpacing: PrimitiveTypographyTokens["letterSpacing"];
  spacing: PrimitiveSpacingTokens["spacing"];
  borderRadius: PrimitiveSpacingTokens["borderRadius"];
  shadow: PrimitiveShadowTokens["shadow"];
  opacity: PrimitiveShadowTokens["opacity"];
  zIndex: PrimitiveShadowTokens["zIndex"];
  semantic: {
    color: SemanticColorTokens;
  };
};

export type TokenValue<T extends DesignToken> = T["$value"];
export type TokenType<T extends DesignToken> = T["$type"];
