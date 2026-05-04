# Runtime smoke scripts

Live-API smoke tests for layered diagnosis of the composer pipeline.
Run from `packages/runtime/` after `pnpm build`. Requires `ANTHROPIC_API_KEY`.

| Script | What it tests | Bypass-by-bypass |
|---|---|---|
| `smoke-sdk.mjs` | Anthropic SDK directly with our system-prompt shape (`SystemBlock[]` + `cache_control`). Confirms credits + API + prompt format. | All our wrapping. |
| `smoke-composer.mjs` | `HaikuComposer.compose("welcome", …)` standalone. Confirms parse + cache + provider. | HTTP server, SSE, WS. |
| `smoke-server.mjs` | Full `RuntimeServer` + `eventsource`-pkg client. Confirms SSE delivery of a real Haiku layout. | Nothing — full runtime path. |

Use the most-bypass script first, then layer in. **Do NOT use PowerShell's `HttpWebRequest.GetResponse()` to read SSE** — it buffers chunked responses unpredictably and will hang even when the server is fine. Use the `eventsource` Node package as in `smoke-server.mjs`, or curl with `-N`.
