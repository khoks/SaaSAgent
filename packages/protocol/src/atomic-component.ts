/**
 * Atomic UI Components registry — the host's design-system primitives, registered
 * for the LLM Composer to consume as its UI vocabulary (per ADR-005, ADR-009).
 *
 * Three intake paths per ADR-009: manual JSON entries, Storybook auto-extract,
 * component-metadata extract. All normalize to this internal schema. The manual
 * augmentation layer adds LLM-friendly semantics on top of mechanical extraction.
 */

/** Source frameworks supported at MVP per ADR-015 (Vue/Svelte/Angular at v1.5). */
export type ComponentFramework = 'react' | 'vanilla-wc';

/** A single registered atomic UI component. */
export interface AtomicComponent {
  /** Unique name within the host's design system (PascalCase, e.g., "ProductTile"). */
  name: string;
  /** Semantic version of the component. */
  version: string;
  /** Source framework. */
  framework: ComponentFramework;
  /** One-line semantic role — what kind of thing this is. */
  semanticRole: string;
  /** Multi-sentence guidance — when the Composer should reach for this component. */
  whenToUse: string;
  /** Composition constraints — invariants the Composer must respect (e.g., "must be inside a Form"). */
  constraints?: ReadonlyArray<string>;
  /** JSON Schema describing the component's props. */
  propsSchema: Readonly<Record<string, unknown>>;
  /** Named slot identifiers (in addition to default children). */
  slots?: ReadonlyArray<string>;
  /** DOM/component event names the Composer can wire emits to. */
  emits?: ReadonlyArray<string>;
  /** Usage examples — fed to the Composer's prompt for few-shot learning. */
  examples?: ReadonlyArray<ComponentExample>;
  /** Accessibility hints. */
  accessibility?: ComponentAccessibility;
  /** Optional name of a mobile-specific variant component (per ADR-017). */
  mobileVariant?: string;
  /** Module specifier for runtime mounting (resolved at render time). */
  moduleSpecifier: string;
  /** Export name within the module. */
  exportName: string;
}

export interface ComponentExample {
  description: string;
  /** A LayoutNode-shaped fragment showing canonical use (kept loose to avoid circular import). */
  layoutFragment: Readonly<Record<string, unknown>>;
}

export interface ComponentAccessibility {
  /** ARIA role the component implements. */
  role?: string;
  /** Free-form notes for the Composer (e.g., "always pair with a Label"). */
  notes?: string;
}

/** A complete atomic-components registry — keyed by component name. */
export interface AtomicComponentRegistry {
  /** Registry version (bumped on any add/remove/change). */
  version: string;
  /** All registered components, keyed by name. */
  components: Readonly<Record<string, AtomicComponent>>;
}
