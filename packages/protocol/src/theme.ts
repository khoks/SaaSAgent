/**
 * Theme & branding tokens — W3C Design Tokens (DTCG) canonical schema (per ADR-025).
 *
 * The host registers their design tokens; the UI Composer queries them when composing
 * artifacts. Style Dictionary importers normalize incoming token sets into this shape;
 * CSS variables are accepted as a degraded fallback.
 *
 * Spec: https://design-tokens.github.io/community-group/format/
 */

/** Permitted value types per the DTCG spec (subset MVP supports). */
export type DTCGValue =
  | string
  | number
  | DTCGCompositeValue
  | { value: string };

/** Composite token values (typography, shadow, etc.). */
export interface DTCGCompositeValue {
  [key: string]: string | number | undefined;
}

/** A single design token. */
export interface DTCGToken {
  $value: DTCGValue;
  $type?:
    | 'color'
    | 'dimension'
    | 'fontFamily'
    | 'fontWeight'
    | 'duration'
    | 'cubicBezier'
    | 'number'
    | 'string'
    | 'typography'
    | 'shadow'
    | 'transition'
    | 'border'
    | 'radius'
    | 'spacing'
    | string;
  $description?: string;
  $extensions?: Readonly<Record<string, unknown>>;
}

/** A group of tokens (recursive). DTCG groups can nest. */
export interface DTCGTokenGroup {
  $description?: string;
  $type?: string;
  $extensions?: Readonly<Record<string, unknown>>;
  /** Nested tokens or sub-groups, keyed by token name. */
  [key: string]: DTCGToken | DTCGTokenGroup | string | Readonly<Record<string, unknown>> | undefined;
}

/** A complete registered theme. */
export interface ThemeRegistration {
  /** Stable name (kebab-case). */
  name: string;
  /** Semantic version. */
  version: string;
  /** Optional human-readable description (consumed by the Composer for context). */
  description?: string;
  /** The token tree. */
  tokens: DTCGTokenGroup;
}

/** Sparse overrides applied to a single LayoutNode subtree. */
export interface ThemeOverride {
  /** Token-path → override value. Path is dot-separated (e.g., "color.brand.primary"). */
  [tokenPath: string]: string | number | undefined;
}
