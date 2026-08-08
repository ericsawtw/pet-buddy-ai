import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("./src", import.meta.url));
const fakeBlob = fileURLToPath(new URL("./test/fake-blob.ts", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      // 測試一律走假的 Blob，不碰真實儲存空間
      "@vercel/blob": fakeBlob,
      "@": src,
    },
  },
});
