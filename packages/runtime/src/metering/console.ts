/**
 * ConsoleMeteringProvider — emits each event as a structured log line.
 * Dev / debugging only.
 */

import type { MeteringEvent, MeteringProvider } from './types.js';

export class ConsoleMeteringProvider implements MeteringProvider {
  readonly name = 'console';
  record(event: MeteringEvent): void {
    const out = JSON.stringify({
      _kind: 'metering',
      ...event,
      at: event.at ?? new Date().toISOString(),
    });
    // eslint-disable-next-line no-console
    console.log(out);
  }
}
