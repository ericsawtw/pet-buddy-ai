<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 資料儲存的鐵則

資料存在 Vercel Blob。**Blob 的公開網址帶 30 天 CDN 快取，覆寫同一個路徑之後，
讀回來的可能還是舊內容（實測讀到 61 秒前的資料）。`fetch(url, { cache: "no-store" })`
擋不掉這層快取。**

所以會變動的資料一律「寫新檔案」，不要覆寫：

- `line-users/<雜湊>/<時間>_<uuid>.json` —— 每次存檔寫新版本，讀取取最新一份，只留 3 份
- `line-payments-confirmed/<id>.json` —— 用標記檔表示「已開通」，不去改原紀錄的 status
- `analyses/u/<雜湊>/<時間>_<id>.json` —— 紀錄本來就不會被改，一人一資料夾是為了查詢速度

寫新檔案時，檔名的時間戳要確保**嚴格遞增**（見 `line-users.ts` 的 `nextStamp`）。
同一毫秒內存兩次會產生排序分不出先後的檔名，讀取時就可能挑到舊的那份。

# 測試

`npm test`。測試用 `test/fake-blob.ts` 取代真正的 Blob，**預設模擬上述的 CDN 快取行為**，
所以任何「覆寫再讀回來」的寫法都會在測試裡失敗。測試不會碰到正式資料。
