// Run from web/: node_modules/.bin/tsx scripts/measure-memory.ts
// Measures Linux RSS of the actual bridge PID, not the inspection process.
import { spawnSync } from "node:child_process";
import { openChannel } from "../src/channel.js";
import { createTunnelTransport } from "../src/transport.js";
import { createClient } from "@connectrpc/connect";
import { DemoService } from "../src/gen/demo_pb.js";
const connections = [];
function measure(label: string) {
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--pid=container:grpc-bridge-bridge-1",
      "--entrypoint",
      "python",
      "grpc-bridge_backend",
      "-c",
      "print(''.join(l for l in open('/proc/1/status') if l.startswith(('VmRSS:', 'Threads:'))))",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  console.log(label + "\n" + result.stdout);
}
measure("Before connections");
try {
  for (let i = 0; i < 100; i++) {
    const channel = await openChannel(
      "ws://localhost:8080/tunnel",
      process.env.TUNNEL_TOKEN ?? "",
    );
    connections.push(channel);
    await createClient(DemoService, createTunnelTransport(channel)).echo({
      text: "memory sample",
    });
  }
  measure("100 open, exercised HTTP/2 connections");
} finally {
  for (const channel of connections) channel.close();
}
