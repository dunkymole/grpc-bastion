import { runExamples } from "./client.js";

// Host-side address of the gateway. Python's backend:50051 address is resolved
// by the gateway inside Docker, not by this process or a browser.
await runExamples(
  process.env.TUNNEL_URL ?? "ws://localhost:8080/tunnel",
  process.env.TUNNEL_TOKEN ?? "",
  console.log,
  process.env.BACKEND_TARGET ?? "python-demo:50051",
);
