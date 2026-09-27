import { render, fireEvent } from "@testing-library/react";
import ImageInput from "./image_input";

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.closed = false;
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  send() {}
}

class FakeFileReader {
  readAsDataURL() {
    this.result = "data:image/png;base64,fake";
    this.onloadend && this.onloadend();
  }
}

function uploadFile(container) {
  const file = new File(["fake"], "photo.png", { type: "image/png" });
  const input = container.querySelector("#file-upload");
  fireEvent.change(input, { target: { files: [file] } });
  const socket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  socket.onopen();
  return socket;
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  global.WebSocket = FakeWebSocket;
  global.FileReader = FakeFileReader;
});

test("closes the socket after receiving a detection response", () => {
  const { container } = render(<ImageInput />);
  const socket = uploadFile(container);

  socket.onmessage({ data: JSON.stringify({ imageWidth: 0, imageHeight: 0, faces: [] }) });

  expect(socket.closed).toBe(true);
});

test("closes the socket on a WebSocket error", () => {
  const { container } = render(<ImageInput />);
  const socket = uploadFile(container);

  socket.onerror(new Event("error"));

  expect(socket.closed).toBe(true);
});
