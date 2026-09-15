# Security

This is an early prototype. The default Compose deployment is local-only.
Before exposing it beyond loopback, configure TLS, an exact allowed origin,
authentication, upstream network restrictions, and deployment resource limits.

The bridge does not authorize individual RPC methods. Enforce application
authorization in the gRPC service. Browser Origin filtering does not authenticate
native clients. Do not put sensitive production data into the demo service.

For potential vulnerabilities, avoid posting credentials, exploit targets, or
private data in public issues. Use GitHub's private vulnerability reporting
facility if enabled on this repository. If it is unavailable, open a public issue
requesting a private contact channel without disclosing the vulnerability.

No production support or response-time commitment is currently offered.
