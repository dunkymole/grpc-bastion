# Prototype validation

Observed on 14–15 September 2026, Linux containers under Docker Desktop/WSL2,
with Go 1.27.1, Python 3.12, grpcio 1.84.0, Node 24.19.0, and Chrome.

## Executed checks

- Both Compose containers built and became healthy.
- Go unit/integration tests, Linux race detection, and `go vet` passed.
- A three-second parser fuzz run completed 122,421 executions without a failure.
  This is a smoke test, not sustained fuzzing or conformance certification.
- TypeScript strict compilation and gRPC framing/status unit tests passed.
- The Python interoperability suite passed through the containerized bastion.
- The same nine interoperability checks passed in Chrome's actual WebSocket and
  browser HTTP/2 client; the page displayed `ALL CHECKS PASSED`.
- The connection-loss test rejected an in-flight call and successfully created a
  fresh session without replaying the old operation.
- A separate token-authenticated bastion passed the same suite and rejected an
  incorrect token before upgrading the connection.

The interoperability checks cover all four RPC patterns, responses before bidi
request completion, native trailers, 16 concurrent RPCs on one connection, a
180 KB message across flow-control windows, native error status, deadline, and
stream cancellation while preserving the shared connection.

## Memory sample

Linux `/proc/1/status` of the bastion process reported:

| Situation | Resident memory (RSS) | Threads |
| --- | ---: | ---: |
| Warm process before connection sample | 8,896 KiB (8.69 MiB) | 8 |
| 100 open HTTP/2 tunnels, each after a completed echo | 13,640 KiB (13.32 MiB) | 12 |

The observed RSS increase was 4,744 KiB, approximately 47 KiB per additional
tunnel in this particular small-message sample. This is not a per-connection
maximum or throughput benchmark. TLS, slow peers, concurrent traffic, Go GC,
kernel socket memory, and a different platform change the result. RSS excludes
some kernel memory. Docker's older statistics endpoint returned zeros on this
host, so the measurement used the process's own Linux status file instead.

The scratch image with the demo assets and license notices was 7,867,236 bytes.
Later rebuilds can change that slightly. The Go binary has
no third-party modules and is built with `CGO_ENABLED=0`.

To reproduce the connection sample, start the stack with project name
`grpc-bastion`, then run from `web/`:

```sh
node_modules/.bin/tsx scripts/measure-memory.ts
```

The script opens 100 real HTTP/2 channels, exercises each against Python, reads
RSS from the target container's PID namespace, and closes the channels. It uses
the existing Python image only as a temporary inspection tool.

## Not yet claimed

No Autobahn conformance run, comprehensive HTTP/2 audit, long-duration memory
stress, production load benchmark, multi-browser support certification, or
external security review has been completed. Optional WSS/upstream TLS modes
still need deployment-level interoperability coverage. See the roadmap.
