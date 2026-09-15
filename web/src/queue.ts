/** Awaitable single-slot producer. Await send() before producing the next item. */
export function inputQueue<T>() {
  const stream = new TransformStream<T, T>();
  const writer = stream.writable.getWriter();
  const messages = (async function* () {
    const reader = stream.readable.getReader();
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) return;
        yield next.value;
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  })();
  return {
    messages,
    send: (item: T) => writer.write(item),
    complete: () => writer.close(),
    cancel: (reason?: unknown) => writer.abort(reason),
  };
}
