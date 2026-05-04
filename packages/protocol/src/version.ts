/**
 * Protocol version. Bumped on breaking changes to LayoutTree / InstructionEnvelope /
 * AtomicComponent / Theme schemas. Minor on additive changes.
 *
 * Per ADR-038 + ADR-005 + ADR-021: this is the wire-format version that
 * shell ↔ runtime ↔ sub-agents all agree on. SDKs include it in their
 * federation handshake.
 */
export const PROTOCOL_VERSION = '0.1.0' as const;
export type ProtocolVersion = typeof PROTOCOL_VERSION;
