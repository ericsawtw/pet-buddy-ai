import { beforeEach } from "vitest";
import { reset, fetchImpl } from "./fake-blob";

process.env.SESSION_SECRET = "test-secret-for-unit-tests";

globalThis.fetch = fetchImpl as unknown as typeof fetch;

// 每個測試都從空的儲存空間開始，且預設模擬 CDN 快取
beforeEach(() => {
  reset();
});
