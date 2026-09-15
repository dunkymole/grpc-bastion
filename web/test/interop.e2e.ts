import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, Code, ConnectError } from "@connectrpc/connect";
import { openChannel } from "../src/channel.js";
import { createTunnelTransport } from "../src/transport.js";
import { DemoService } from "../src/gen/demo_pb.js";
import { runChecks } from "../src/verify.js";
const url = process.env.TUNNEL_URL ?? "ws://localhost:8080/tunnel";
test(
  "invalid tunnel token is rejected",
  { skip: !process.env.TUNNEL_TOKEN, timeout: 10000 },
  async () => {
    await assert.rejects(openChannel(url, "wrong-token"));
  },
);
test(
  "Python interoperability through a single bastion tunnel",
  { timeout: 30000 },
  async () => {
    const channel = await openChannel(url, process.env.TUNNEL_TOKEN ?? "");
    try {
      await runChecks(
        createClient(DemoService, createTunnelTransport(channel)),
        console.log,
      );
    } finally {
      channel.close();
    }
  },
);
test(
  "connection loss fails in-flight RPCs and reconnect creates a fresh session",
  { timeout: 10000 },
  async () => {
    const channel = await openChannel(url, process.env.TUNNEL_TOKEN ?? "");
    const client = createClient(DemoService, createTunnelTransport(channel));
    const pending = client.echo({ delayMs: 2000 });
    setTimeout(() => channel.close(), 50);
    await assert.rejects(
      pending,
      (e: unknown) => e instanceof ConnectError && e.code === Code.Unavailable,
    );
    const fresh = await openChannel(url, process.env.TUNNEL_TOKEN ?? "");
    try {
      assert.equal(
        (
          await createClient(DemoService, createTunnelTransport(fresh)).echo({
            text: "fresh",
          })
        ).text,
        "fresh",
      );
    } finally {
      fresh.close();
    }
  },
);
