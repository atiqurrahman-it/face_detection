import { render, fireEvent, screen, act } from "@testing-library/react";
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

test("result cards are numbered in reading order (top-left face is Face 1)", () => {
  const { container } = render(<ImageInput />);
  const socket = uploadFile(container);
  const preds = { Happy: 0.9, Angry: 0.1 };

  act(() => {
    socket.onmessage({
      data: JSON.stringify({
        imageWidth: 0,
        imageHeight: 0,
        faces: [
          { box: { x: 300, y: 10, w: 100, h: 100 }, emotion: "Angry", predictions: preds },
          { box: { x: 10, y: 10, w: 100, h: 100 }, emotion: "Happy", predictions: preds },
        ],
      }),
    });
  });

  const face1 = screen.getByText("Face 1").parentElement;
  const face2 = screen.getByText("Face 2").parentElement;
  expect(face1).toHaveTextContent("Happy");
  expect(face2).toHaveTextContent("Angry");
});
