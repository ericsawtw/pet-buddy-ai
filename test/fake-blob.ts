// 測試用的假 Vercel Blob。vitest.config.ts 把 "@vercel/blob" 指到這裡，
// 所以測試不會碰到真的儲存空間，也不需要網路。
//
// 重點在 cdnSticky：真實的 Blob 公開網址帶 30 天 CDN 快取，同一個網址被讀過
// 之後，就算內容被覆寫，短時間內仍可能回舊內容。這裡把那個行為做成預設開啟，
// 任何「覆寫同一路徑再讀回來」的寫法都會在測試裡現形。

type Entry = { pathname: string; url: string; body: string; uploadedAt: Date };

const store = new Map<string, Entry>();
const cdnCache = new Map<string, string>();
let cdnSticky = true;

export function reset(): void {
  store.clear();
  cdnCache.clear();
  cdnSticky = true;
}

// 關掉快取模擬（想單獨測「內容確實寫進去了」時用）
export function setCdnSticky(on: boolean): void {
  cdnSticky = on;
}

export function debugPaths(): string[] {
  return [...store.keys()].sort();
}

export async function put(
  pathname: string,
  body: string | Buffer,
  opts: { allowOverwrite?: boolean; contentType?: string } = {}
) {
  if (store.has(pathname) && !opts.allowOverwrite) {
    throw new Error(`Blob 已存在且未允許覆寫: ${pathname}`);
  }
  const url = `https://fake.blob/${pathname}`;
  store.set(pathname, {
    pathname,
    url,
    body: typeof body === "string" ? body : body.toString("utf8"),
    uploadedAt: new Date(),
  });
  return { url, downloadUrl: url, pathname, contentType: opts.contentType };
}

export async function list(opts: { prefix?: string; limit?: number } = {}) {
  const { prefix = "", limit = 1000 } = opts;
  const blobs = [...store.values()]
    .filter((e) => e.pathname.startsWith(prefix))
    .sort((a, b) => (a.pathname < b.pathname ? -1 : 1))
    .slice(0, limit)
    .map((e) => ({
      pathname: e.pathname,
      url: e.url,
      downloadUrl: e.url,
      uploadedAt: e.uploadedAt,
      size: e.body.length,
    }));
  return { blobs, hasMore: false, cursor: undefined };
}

export async function del(target: string | string[]): Promise<void> {
  for (const t of Array.isArray(target) ? target : [target]) {
    for (const [pathname, entry] of store) {
      if (entry.url === t || pathname === t) store.delete(pathname);
    }
  }
}

// 取代全域 fetch：解析假網址，並套用「讀過就一直回同一份」的 CDN 行為
export const fetchImpl = async (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input);

  if (cdnSticky && cdnCache.has(url)) {
    return jsonResponse(cdnCache.get(url) as string);
  }
  const entry = [...store.values()].find((e) => e.url === url);
  if (!entry) return new Response("Not found", { status: 404 });
  if (cdnSticky) cdnCache.set(url, entry.body);
  return jsonResponse(entry.body);
};

function jsonResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
