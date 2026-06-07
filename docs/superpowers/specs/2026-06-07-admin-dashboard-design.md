# 後台儀表板設計

日期:2026-06-07
狀態:已核准,進入實作

## 目標

讓管理者(專案擁有者)能看到所有使用者提交的分析紀錄 —— 寵物資訊、症狀描述、AI 分析結果、上傳的照片。目前 app 完全沒有儲存任何資料,需從零建立記錄與後台。

## 決策摘要

- **資料庫**:Vercel Postgres(Neon)
- **照片儲存**:Vercel Blob,後台可顯示
- **後台保護**:單一密碼(環境變數 `ADMIN_PASSWORD`)+ httpOnly cookie
- **後台型式**:`/admin` 網頁

## 資料模型

資料表 `analyses`:

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | serial / bigint PK | 流水號 |
| `created_at` | timestamptz, default now() | 提交時間 |
| `pet_type` | text | `dog` / `cat` |
| `pet_name` | text, nullable | 名字(選填) |
| `pet_age` | text, nullable | 年齡(選填) |
| `symptoms` | text | 症狀描述 |
| `severity` | text | `green` / `yellow` / `red`(從結果拆出,方便篩選) |
| `result` | jsonb | 完整 AI 分析結果 |
| `image_url` | text, nullable | Vercel Blob 照片網址 |

## 資料流

改寫 `src/app/api/analyze/route.ts`:

1. 若有照片 → 上傳壓縮後的圖到 Vercel Blob,取得 `image_url`
2. 呼叫 Anthropic(現有流程不變)
3. 將該筆寫入 Postgres(寵物資訊、症狀、severity、result、image_url)
4. 回傳結果給使用者(**前端 UX 完全不變**)

**關鍵原則**:持久化(Blob 上傳 + DB 寫入)失敗時,**不得影響使用者拿到分析結果**。以 try/catch 包住,失敗只記 log,使用者照常收到結果。分析功能優先於記錄。

## 後台頁面 `/admin`

- 進入需輸入密碼(比對 `ADMIN_PASSWORD`)
- 驗證成功 → 設 httpOnly、signed cookie
- 通過後顯示紀錄列表:最新在最上面,每筆顯示寵物資訊、症狀、紅綠燈標籤、AI 結果摘要、照片縮圖
- 點縮圖可放大

### 認證機制

- 密碼存於環境變數 `ADMIN_PASSWORD`
- 登入路由驗證密碼 → 設定 httpOnly cookie(值為由密碼/密鑰衍生的 token,JS 無法讀取)
- `/admin` 相關頁面於 server 端檢查 cookie,無效則導向登入

## 新增相依套件

- `@vercel/postgres` —— 資料庫存取
- `@vercel/blob` —— 照片儲存

## 需要使用者操作的前置作業

1. 在 Vercel 後台開通 Postgres 資料庫並連結到 `pet-buddy-ai` 專案(環境變數自動注入)
2. 在 Vercel 後台開通 Blob 儲存並連結專案
3. 設定環境變數 `ADMIN_PASSWORD`

## 範圍與限制(YAGNI)

- 本期**不做**:搜尋/篩選 UI、分頁、刪除紀錄、多管理者帳號、統計圖表。先把「記錄 + 觀看」做穩,日後再加。
- 上線**之前**的歷史使用紀錄無法回溯,從部署後才開始累積。

## 隱私註記

此功能開始收集使用者照片與症狀。目前 app 無登入、資料匿名。若日後對真實用戶開放,應在表單附近加註「資料將被記錄」說明。
