# Contributing

Issues and pull requests are welcome. Start with the README and architecture.

Documentation must be self-contained and describe the project's behavior,
architecture, and operation for readers with no prior context.

Keep the bridge standard-library-only and application-blind. It must not parse
HTTP/2, gRPC, or protobuf, or allocate a full buffer based on an untrusted frame
length. New RPC semantics belong in the browser transport or backend.

Run `go test ./...`, `go vet ./...`, and the web build/unit suite. For transport
changes also run the Compose interoperability suite and the browser's checks.
Use `gofmt` for Go. Keep generated code synchronized with `proto/demo.proto`.
Include a focused regression test for a protocol bug and explain what changed.

No changes should automatically replay user operations after a disconnect.
Discuss wire-profile changes before implementation; incompatible changes require
a new profile name. Contributions are made under the repository's MIT license.

Be respectful, specific, and constructive. Critique code and ideas, not people.
