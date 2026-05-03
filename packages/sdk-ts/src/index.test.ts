import { describe, it, expect } from 'vitest';
import { VERSION, registerSubAgent } from './index.js';

describe('@saasagent/sdk (Phase 0 skeleton)', () => {
  it('exports a version', () => {
    expect(VERSION).toBe('0.0.0');
  });

  it('registerSubAgent throws (not yet implemented)', async () => {
    await expect(
      registerSubAgent(
        {
          name: 'test',
          version: '0.0.0',
          description: 'test',
          ownerTeam: 'test',
          capabilities: [],
          grpcEndpoint: 'localhost:50051',
          protocolVersion: '0.0.0',
        },
        {
          registryUrl: 'http://localhost:8080',
          clientCertPath: '/dev/null',
          clientKeyPath: '/dev/null',
          caCertPath: '/dev/null',
        },
      ),
    ).rejects.toThrow(/Not implemented/);
  });
});
