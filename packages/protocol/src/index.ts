/**
 * @saasagent/protocol — typed-JSON wire formats and shared interfaces.
 *
 * Imported by:
 *   - @saasagent/runtime (composer + planner consume LayoutTree, AtomicComponentRegistry, etc.)
 *   - @saasagent/web-shell (renderer consumes LayoutTree; emits InstructionEnvelope)
 *   - @saasagent/sdk (sub-agents reference these types in their federation contract)
 *
 * Versioned per {@link PROTOCOL_VERSION}.
 */

export { PROTOCOL_VERSION, type ProtocolVersion } from './version.js';
export type {
  LayoutNode,
  ComposedLayout,
  ComposedLayoutMetadata,
  DataSource,
  MemoryQuery,
  EmitSpec,
} from './layout.js';
export type { InstructionEnvelope, InstructionAck, EmitTransport } from './instruction.js';
export {
  ERROR_CATEGORIES,
  type ErrorCategory,
  type ErrorEnvelope,
} from './error.js';
export type {
  DTCGValue,
  DTCGCompositeValue,
  DTCGToken,
  DTCGTokenGroup,
  ThemeRegistration,
  ThemeOverride,
} from './theme.js';
export type {
  ComponentFramework,
  AtomicComponent,
  ComponentExample,
  ComponentAccessibility,
  AtomicComponentRegistry,
} from './atomic-component.js';
export type {
  SkillExecutionKind,
  SkillDescriptor,
  SkillRegistry,
} from './skill.js';
export type {
  ToolHttpMethod,
  ToolAuthKind,
  ToolDescriptor,
  ToolRegistry,
} from './tool.js';
export type {
  FeatureDescriptor,
  FeatureRegistry,
} from './feature.js';
export type {
  UIComposer,
  ComposeContext,
  ComposedToolInvocation,
  ConversationContext,
  ConversationTurn,
  MemoryRecall,
  MobileContext,
} from './composer.js';
