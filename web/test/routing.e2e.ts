import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@connectrpc/connect";
import { openChannel } from "../src/channel.js";
import { createTunnelTransport } from "../src/transport.js";
import { DemoService } from "../src/gen/demo_pb.js";

const docker = (...args: string[]) =>
  execFileSync("docker", args, { encoding: "utf8", timeout: 20000 }).trim();
test(
  "onboard a new backend without restarting the bridge",
  { timeout: 60000 },
  async () => {
    const root = new URL("../../", import.meta.url);
    const compose = (...args: string[]) =>
      execFileSync("docker", ["compose", ...args], {
        cwd: root,
        encoding: "utf8",
        timeout: 20000,
      }).trim();
    const bridge = compose("ps", "-q", "bridge");
    const backend = compose("ps", "-q", "backend");
    const network = Object.keys(
      JSON.parse(
        docker(
          "inspect",
          bridge,
          "--format",
          "{{json .NetworkSettings.Networks}}",
        ),
      ),
    )[0];
    const image = docker("inspect", backend, "--format", "{{.Image}}");
    const name = `grpc-bridge-onboarding-${process.pid}`;
    const target = `${name}:50051`;
    const policyFile = new URL("config/targets.json", root);
    const original = await readFile(policyFile, "utf8");
    const url = process.env.TUNNEL_URL ?? "ws://localhost:8080/tunnel";
    const token = process.env.TUNNEL_TOKEN ?? "";
    const existing = await openChannel(url, token);
    let selected: Awaited<ReturnType<typeof openChannel>> | undefined;
    let created = false;
    try {
      docker("run", "-d", "--name", name, "--network", network, image);
      created = true;
      docker(
        "exec",
        name,
        "python",
        "-c",
        "import grpc; grpc.channel_ready_future(grpc.insecure_channel('localhost:50051')).result(timeout=10)",
      );
      await assert.rejects(openChannel(url, token, { target }));
      const policy = JSON.parse(original);
      policy.targets[target] = { tls: false };
      await writeFile(policyFile, JSON.stringify(policy));
      selected = await openChannel(url, token, { target });
      const client = createClient(DemoService, createTunnelTransport(selected));
      assert.equal(
        (await client.echo({ text: "new backend" })).text,
        "new backend",
      );
      assert.equal(
        compose("ps", "-q", "bridge"),
        bridge,
        "bridge was restarted",
      );
      await writeFile(policyFile, original);
      await assert.rejects(openChannel(url, token, { target }));
      assert.equal(
        (await client.echo({ text: "existing target connection" })).text,
        "existing target connection",
      );
      assert.equal(
        (
          await createClient(DemoService, createTunnelTransport(existing)).echo(
            { text: "original connection" },
          )
        ).text,
        "original connection",
      );
    } finally {
      selected?.close();
      existing.close();
      await writeFile(policyFile, original);
      if (created) docker("rm", "-f", name);
    }
  },
);
