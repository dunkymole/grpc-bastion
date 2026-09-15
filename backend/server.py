"""An ordinary gRPC service; it knows nothing about browsers or tunnels."""
import asyncio
import os
import signal
import grpc
import demo_pb2 as pb
import demo_pb2_grpc as rpc


class Demo(rpc.DemoServiceServicer):
    async def Echo(self, request, context):
        if request.text == "error":
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "requested demo error")
        await asyncio.sleep(min(max(request.delay_ms, 0), 10000) / 1000)
        context.set_trailing_metadata((("demo-trailer", "echo-complete"),))
        return request

    async def Count(self, request, context):
        for number in range(1, min(max(request.number, 1), 1000) + 1):
            await asyncio.sleep(min(max(request.delay_ms, 10), 10000) / 1000)
            yield pb.Message(text=f"tick {number}", number=number)
        context.set_trailing_metadata((("demo-trailer", "count-complete"),))

    async def Collect(self, request_iterator, context):
        total, count = 0, 0
        async for request in request_iterator:
            total += request.number
            count += 1
        if not -(2**31) <= total < 2**31:
            await context.abort(grpc.StatusCode.OUT_OF_RANGE, "sum exceeds int32")
        return pb.Message(text=f"collected {count} messages", number=total)

    async def Chat(self, request_iterator, context):
        await context.send_initial_metadata((("demo-header", "chat-open"),))
        async for request in request_iterator:
            yield pb.Message(text=f"Python received: {request.text}", number=request.number)
        context.set_trailing_metadata((("demo-trailer", "chat-complete"),))


async def main():
    server = grpc.aio.server(options=[
        ("grpc.max_receive_message_length", 1024 * 1024),
        ("grpc.max_send_message_length", 1024 * 1024),
        ("grpc.max_concurrent_streams", 64),
    ])
    rpc.add_DemoServiceServicer_to_server(Demo(), server)
    address = os.environ.get("GRPC_LISTEN", "127.0.0.1:50051")
    server.add_insecure_port(address)
    await server.start()
    print(f"Python gRPC backend listening on {address}", flush=True)
    try:
        await server.wait_for_termination()
    finally:
        await server.stop(3)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
