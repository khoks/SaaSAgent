/**
 * InstructionEnvelope — the typed-JSON message emitted from the shell back to the
 * runtime on every user interaction with a composed UI artifact (per ADR-005, ADR-013).
 *
 * Wire format per ADR-038: shell ── InstructionEnvelope (over WebSocket) ──→ runtime.
 */

/** A single user-driven instruction sent from shell to runtime. */
export interface InstructionEnvelope {
  /** Causality token — must match the {@link ComposedLayout.composeCycleId} that produced the source node. */
  composeCycleId: string;
  /** id of the {@link LayoutNode} that emitted this. */
  sourceNodeId: string;
  /** Wall-clock time of emit (ISO-8601). */
  emittedAt: string;
  /** Semantic action label (matches an {@link EmitSpec.type}). */
  type: string;
  /** Combined payload: EmitSpec.payload + DOM event data. */
  payload?: Readonly<Record<string, unknown>>;
  /** Sequence number within this composeCycleId (for ordering when multiple emits race). */
  sequence: number;
}

/** Server-side acknowledgement that an instruction was received and accepted for planning. */
export interface InstructionAck {
  composeCycleId: string;
  sourceNodeId: string;
  sequence: number;
  /** Server timestamp at acceptance. */
  acceptedAt: string;
  /** Optional: estimated time to next layout. */
  estimatedNextLayoutMs?: number;
}

/**
 * Strategy for shipping {@link InstructionEnvelope}s back to the runtime.
 * Implemented by the shell's RuntimeClient (over WebSocket per ADR-038);
 * implemented by mocks in unit tests.
 */
export interface EmitTransport {
  send(envelope: InstructionEnvelope): void | Promise<void>;
}
