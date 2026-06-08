# Google 會員制設計

日期:2026-06-08
狀態:已核准,進入實作

## 目標

加入會員制:使用者必須用 Google 登入才能使用 AI 分析,每個會員獲得 3 次免費分析,用完後導向付費(付費本期不實作)。登入後可查看自己的歷史分析紀錄。

## 決策摘要

- **登入方式**:Google OAuth 2.0(自己寫輕量流程,不用 NextAuth —— 規避改版 Next.js 的相容風險)
- **會員資料儲存**:Vercel Blob(沿用現有服務,不開 Postgres,$0 成本)
- **Session**:簽章式 httpOnly cookie(沿用後台 cookie 機制的同套路)
- **免費額度**:每會員 3 次,存於會員資料,分析成功時扣 1

## 第一版範圍(YAGNI)

本期實作:
- Google 登入 / 登出
- 必須登入才能用 `/api/analyze`
- 每會員 3 次免費額度,用完擋下並顯示「即將推出付費方案」
- 「我的歷史」頁:登入後看自己過去的分析

本期不做(日後):可重複使用的毛孩檔案、實際金流付費、Facebook / Line 登入。

## 會員資料模型(Blob)

路徑 `users/<googleId>.json`:

| 欄位 | 說明 |
|------|------|
| `googleId` | Google 帳號唯一 ID(sub) |
| `email` | email |
| `name` | 顯示名稱 |
| `picture` | 頭像 URL |
| `freeUsesRemaining` | 剩餘免費次數(初始 3) |
| `createdAt` | 註冊時間 |

分析紀錄沿用 `analyses/` Blob,新增 `userId` 欄位標記擁有者;歷史 = 篩出 userId 相符者。

## OAuth 流程

1. `GET /api/auth/google/login` → 導向 Google 同意畫面(帶 client_id、redirect_uri、scope=openid email profile、state)
2. 使用者在 Google 授權 → Google 導回 `GET /api/auth/google/callback?code=...&state=...`
3. callback:驗證 state → 用 code 換 token → 取得使用者 userinfo → 在 Blob upsert 會員(新會員給 3 次免費)→ 設定 session cookie → 導回首頁
4. `GET /api/auth/logout` → 清除 cookie

### Session 機制

- cookie 值 = `googleId.HMAC_SHA256(googleId, SESSION_SECRET)`,httpOnly、secure(prod)、sameSite=lax
- 每次請求驗證 HMAC,防偽造
- `SESSION_SECRET` 為隨機字串環境變數

## 分析次數控管(改 `/api/analyze`)

1. 讀 session,未登入 → 401(前端導向登入)
2. 讀會員資料,`freeUsesRemaining <= 0` → 403,訊息「免費次數已用完,付費方案即將推出」
3. 正常分析 → 成功後 `freeUsesRemaining -= 1`,寫回 Blob,並在分析紀錄帶上 `userId`

## 需要的環境變數

- `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`(使用者於 Google Cloud 申請)
- `SESSION_SECRET`(隨機產生)
- 既有:`ANTHROPIC_API_KEY`、`BLOB_READ_WRITE_TOKEN`、`ADMIN_PASSWORD`

## 需要使用者操作

於 Google Cloud Console 建立 OAuth 用戶端,授權的 redirect URI:
- `https://careyourpet.net/api/auth/google/callback`
- `https://www.careyourpet.net/api/auth/google/callback`
- `http://localhost:3000/api/auth/google/callback`(本機測試)

取得 Client ID 與 Client Secret 交給我設定。

## UI

- 首頁 / 分析頁:未登入顯示「用 Google 登入」;已登入顯示頭像 + 名字 + 剩餘次數 + 登出
- 分析頁:未登入時「開始分析」導向登入
- `/history`:登入後看自己的歷史分析(需登入)

## 隱私

開始儲存 Google 帳號的 email、姓名、頭像。應於登入處附上簡短說明。
