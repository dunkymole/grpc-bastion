import { test } from "node:test";
import assert from "node:assert/strict";
import { frame, unframe, validateStatus, MAX_MESSAGE } from "../src/framing.js";
import { Code, ConnectError } from "@connectrpc/connect";
const body = (parts: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of parts) c.enqueue(p);
      c.close();
    },
  });
test("record header and body fragmented at every byte, including empty messages", async () => {
  const bytes = new Uint8Array([
    ...frame(new Uint8Array([1, 2, 3])),
    ...frame(new Uint8Array()),
    ...frame(new Uint8Array([4])),
  ]);
  const records = [];
  for await (const record of unframe(
    body([...bytes].map((b) => new Uint8Array([b]))),
  ))
    records.push([...record]);
  assert.deepEqual(records, [[1, 2, 3], [], [4]]);
});
test("rejects truncated, compressed and oversized records", async () => {
  for (const bytes of [
    new Uint8Array([0, 0]),
    new Uint8Array([1, 0, 0, 0, 0]),
    new Uint8Array([0, 0, 32, 0, 0]),
    new Uint8Array([0, 0, 0, 0, 2, 1]),
  ]) {
    await assert.rejects(async () => {
      for await (const record of unframe(body([bytes]))) void record;
    });
  }
  assert.throws(() => frame(new Uint8Array(MAX_MESSAGE + 1)));
});
test("missing status never succeeds; real error codes preserved", () => {
  assert.throws(
    () => validateStatus({}, undefined),
    (e: unknown) => e instanceof ConnectError && e.code === Code.Unknown,
  );
  assert.throws(
    () =>
      validateStatus({}, { "grpc-status": "3", "grpc-message": "bad%20input" }),
    (e: unknown) =>
      e instanceof ConnectError &&
      e.code === Code.InvalidArgument &&
      e.rawMessage === "bad input",
  );
  validateStatus({}, { "grpc-status": "0" });
});
