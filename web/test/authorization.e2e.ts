import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@connectrpc/connect";
import { openChannel } from "../src/channel.js";
import { createTunnelTransport } from "../src/transport.js";
import { DemoService } from "../src/gen/demo_pb.js";
import { runChecks } from "../src/verify.js";

test(
  "optional bearer metadata covers every RPC shape without overriding per-call authorization",
  { timeout: 30000 },
  async () => {
    const connection = await openChannel(
      process.env.TUNNEL_URL ?? "ws://localhost:8080/tunnel",
      process.env.TUNNEL_TOKEN ?? "",
    );
    const originalRequest = connection.request.bind(connection);
    const observed: Array<string | undefined> = [];
    connection.request = (request) => {
      observed.push(
        (request.headers as Record<string, string> | undefined)?.authorization,
      );
      return originalRequest(request);
    };
    try {
      const defaults = createClient(
        DemoService,
        createTunnelTransport(connection),
      );
      await defaults.echo({ text: "no implicit credential" });
      assert.equal(observed.pop(), undefined);
      const client = createClient(
        DemoService,
        createTunnelTransport(connection, { bearerToken: "test-only-token" }),
      );
      await runChecks(client, () => {});
      assert.ok(observed.length >= 4);
      assert.ok(observed.every((value) => value === "Bearer test-only-token"));
      await client.echo(
        {},
        { headers: { Authorization: "Bearer per-call-token" } },
      );
      assert.equal(observed.pop(), "Bearer per-call-token");
      const empty = createClient(
        DemoService,
        createTunnelTransport(connection, { bearerToken: "" }),
      );
      await empty.echo({});
      assert.equal(observed.pop(), undefined);
    } finally {
      connection.close();
    }
  },
);
