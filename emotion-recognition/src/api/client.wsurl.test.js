import { toWebSocketUrl } from "./client";

test("converts http and https API URLs to ws and wss", () => {
  expect(toWebSocketUrl("http://localhost:8000")).toBe("ws://localhost:8000");
  expect(toWebSocketUrl("https://crime-track.hf.space")).toBe("wss://crime-track.hf.space");
});
