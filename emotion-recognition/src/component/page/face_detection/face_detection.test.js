import { render } from "@testing-library/react";
import RealFaceDetection from "./face_detection";

jest.mock("react-webcam", () => () => <div>webcam-stub</div>);

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.OPEN;
    this.closed = false;
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
  }

  send() {}
}
FakeWebSocket.OPEN = 1;
FakeWebSocket.CLOSED = 3;

beforeEach(() => {
  FakeWebSocket.instances = [];
  global.WebSocket = FakeWebSocket;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("does not open an orphaned reconnect socket after unmount", () => {
  const { unmount } = render(<RealFaceDetection />);
  expect(FakeWebSocket.instances).toHaveLength(1);

  // The server drops the connection, which schedules a reconnect 1s out.
  FakeWebSocket.instances[0].onclose();

  // The component unmounts before that reconnect timer fires.
  unmount();
  jest.advanceTimersByTime(1000);

  expect(FakeWebSocket.instances).toHaveLength(1);
});
