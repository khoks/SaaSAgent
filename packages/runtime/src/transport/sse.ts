/**
 * SSE (Server-Sent Events) wire-format helpers.
 *
 * Per ADR-038: SSE is the runtime → shell channel that streams ComposedLayouts
 * and other server-pushed messages (status, narration, errors).
 *
 * Wire format (text/event-stream):
 *   event: <event-name>\n
 *   data: <utf-8 payload>\n
 *   \n
 *
 * Multi-line payloads are split into multiple `data:` lines per the SSE spec.
 */

export type SSEEventName = 'layout' | 'status' | 'narration' | 'error';

export interface SSEMessage {
  event: SSEEventName;
  data: unknown;
  /** Optional event id for Last-Event-ID resumption. */
  id?: string;
}

export function formatSSEMessage(msg: SSEMessage): string {
  const json = JSON.stringify(msg.data);
  // SSE requires multi-line payloads to be split per the spec; JSON.stringify never
  // produces literal newlines so we emit a single `data:` line.
  let out = '';
  if (msg.id) out += `id: ${msg.id}\n`;
  out += `event: ${msg.event}\n`;
  out += `data: ${json}\n\n`;
  return out;
}

/** SSE preamble — sent immediately on connection accept. */
export const SSE_PREAMBLE = ': saasagent runtime SSE channel — open\n\n';

/** Standard headers for an SSE response. */
export const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Phase 1.2 dev convenience; production hosts will scope this to the host origin.
  'Access-Control-Allow-Origin': '*',
};
