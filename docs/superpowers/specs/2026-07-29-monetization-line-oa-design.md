# 毛孩管家 — 收費模式 + LINE 官方帳號 設計文件

- 日期:2026-07-29
- 專案:pet-buddy-ai(careyourpet.net)
- 狀態:設計中(待 Jason 審閱)

---

## 1. 目標

把毛孩管家(既有的 AI 寵物照片健康分析)從「只有成本、沒有收入」發展成能賺錢的副業。做法:

- **B2C**:向飼主直接收費(買「完整深度健檢報告」次數),參考塔羅博士(drtarot.net)的「無痕轉帳 + 待核帳」收款流程。
- **B2B**:把品牌化健檢當加值服務賣給寵物店/美容/診所(店家品牌 QR / 連結給店飼主用)。
- **兩條線共用同一套後台 + 同一個 Claude 分析核心**,不做兩份。

規模定位:副業 / 穩定小收入,低成本、快點有收入、不過度工程。

---

## 2. 通路(兩個入口,共用大腦)

| 通路 | 對象 | 主打 |
|---|---|---|
| **LINE 官方帳號** | B2C 飼主 | 最方便:加好友 → 傳照片 → 得到分析。累積粉絲名單可再行銷。 |
| **網頁 careyourpet.net** | B2B 店家 | 店家品牌版健檢(QR/連結),做法 A(共用網站 + 店家品牌參數)。 |

兩者背後是**同一個後端 + 同一個 `analyze-core.ts`(Claude 分析)**。

---

## 3. 定價與免費額度(B2C)

### 付費次數包(定案:B 低門檻組)

| 方案 | 價格 | 平均每次 |
|---|---|---|
| 單次 | NT$59 | 59 |
| 3 次 | NT$149 | ≈50 |
| 10 次 | NT$399 | ≈40 |

- 「一次」= **一份完整深度健檢報告**(紅黃綠燈 + 可能原因 + 居家照護 + 就醫建議 + 飲食建議)。
- 成本參考:每次 Claude API 成本 <NT$1,毛利 >98%。定價重點是飼主付費意願,不是成本。

### 免費額度(待 Jason 最終定,先採此預設)

- **快速紅黃綠燈**:免費、無限次(只給嚴重程度分級,不含完整深度內容)。
- **首次完整報告**:免費 1 次(體驗完整價值)。
- 之後完整報告 → 用付費次數。
- (現有 pet-buddy-ai 網頁是「每人 3 次免費」;LINE 端採上述「1 次完整免費 + 快速無限」。兩者可各自設定。)

---

## 4. 使用者流程

### 4.1 B2C 飼主(LINE 官方帳號)

1. 飼主加毛孩管家 LINE 官方帳號。
2. 傳一張毛孩照片 + 打字描述症狀。
3. Webhook 收到 → 下載照片 → 呼叫 Claude(`analyze-core.ts`)→ 以 Flex Message 回「紅黃綠燈 + 建議」。
4. 免費額度用完 → bot 回覆引導購買(顯示方案 + 收款帳戶 + 回報方式)。
5. 飼主銀行轉帳後,回報匯款資訊(見 4.3)。
6. 店主確認入帳 → 系統對該 LINE 用戶加次數 → bot 通知飼主「已開通 N 次」。

### 4.2 B2B 店家(網頁)

- 沿用既有做法 A:每家店一筆設定(slug / 店名 / logo / 主色 / CTA),專屬連結 `careyourpet.net/s/<slug>` + QR。
- 店飼主掃碼進品牌化健檢頁,分析核心相同。
- 店家走月費訂閱(**B2B 訂閱價之後單獨定,本文件不含**)。

### 4.3 付款回報 + 待核帳(無痕轉帳,B2C 與 B2B 共用)

1. 顯示**收款帳戶**(銀行 / 代號 / 帳號)。
2. 飼主轉帳後填**回報表單**:登入識別(LINE userId 或 Email)、購買方案、匯款金額、帳號後五碼、轉帳時間。
3. 送出 → 進**待核帳佇列**(狀態 `pending`),**不自動加次數**(防詐)。
4. 店主收到**即時通知**(見第 8 節)。
5. 店主查銀行帳戶,確認入帳。
6. 店主在 **admin 後台一鍵「確認入帳」**→ 系統自動對該用戶加對應次數,狀態轉 `confirmed`,並通知該飼主。

---

## 5. 系統架構

```
                        ┌─────────────────────────────┐
   LINE 官方帳號 ──────▶ │  後端 (Next.js API on Vercel) │
   (飼主傳照片)          │                              │
                        │  • LINE webhook              │
   網頁 careyourpet.net ─▶│  • analyze-core.ts (共用)    │──▶ Claude API
   (B2B 店家品牌頁)       │  • 次數/待核帳 邏輯 (共用)     │
                        │  • admin 後台                 │
   admin (店主) ────────▶ │  • 通知 (Telegram / LINE)     │
                        └──────────────┬──────────────┘
                                       │
                            Vercel Blob (照片/用量/待核帳 資料)
```

- **共用核心**:`src/lib/analyze-core.ts`(現成,直接沿用)、次數/用量邏輯(沿用並擴充 per-LINE-user 維度)。
- **LINE webhook**:新增 API route,驗證 LINE 簽章 → 處理 image/text 事件 → 下載照片 → 分析 → 回 Flex Message。
- **儲存**:沿用 Vercel Blob(現有 usage.ts / freeuse.ts 模式),新增「LINE 用戶次數」「待核帳案件」「店家設定」。
- **admin**:擴充現有 `/admin`,新增「待核帳確認」「店家管理」。

---

## 6. 資料模型(概念,實際格式實作時定)

- **line_user**:`lineUserId`、`displayName`、`freeUsed`(免費完整報告用量)、`paidCredits`(剩餘付費次數)、`createdAt`。
- **pending_payment(待核帳)**:`id`、`channel`(line/web)、`userRef`(lineUserId 或 email)、`plan`、`amount`、`bankLast5`、`transferAt`、`status`(pending/confirmed/rejected)、`submittedAt`、`confirmedAt`。
- **shop(B2B 店家,沿用做法 A)**:`slug`、`name`、`logoUrl`、`themeColor`、`ctaText`、`ctaUrl`、`plan`、`monthlyQuota`、`active`。
- **分析紀錄**:沿用現有(admin 已顯示上傳者 / token 用量)。

---

## 7. 通知機制

- 觸發點:有人送出待核帳案件時。
- 內容:方案、金額、帳號後五碼、轉帳時間、用戶識別。
- **通路(待 Jason 定)**:
  - **選項 A(推薦,最簡單)**:Telegram 通知 bot。網頁/webhook 呼叫 Telegram API 推播給店主。免費、不限量、Jason 已重度使用 Telegram。需另開一隻「通知 bot」(跟 Apex/文文 分開)。
  - **選項 B**:LINE Messaging API push 給店主(既然已有 LINE 官方帳號,可直接推給自己)。省一個工具,但受每月推播免費額度影響。
- **⚠️ 重要限制**:Claude 不是 24/7 常駐伺服器。無法做到「網頁通知 Claude → Claude 主動跳出來告訴 Jason」。正解是**網頁直接通知 Jason 本人(Telegram/LINE)+ admin 後台一鍵確認**,不依賴 Claude 在線。

---

## 8. 沿用現有 pet-buddy-ai 的部分(避免重造輪子)

- ✅ `analyze-core.ts`(Claude 照片健康分析)—— 直接沿用。
- ✅ Vercel Blob 儲存 + usage.ts / freeuse.ts 的計量模式 —— 擴充沿用。
- ✅ `/admin` 後台(已有上傳者、token 用量顯示)—— 擴充。
- ✅ Google 會員登入 —— 網頁端沿用;LINE 端改用 LINE userId 辨識。
- ✅ 照片壓縮上傳。

---

## 9. 誠實的限制與注意事項

1. **LINE 裡的「AI」= 伺服器自動呼叫 Claude API**,不是「Claude 在聊天室」。跟 Jason 現在跟 Claude 對話是兩回事;這樣才能 24/7 自動回客人。
2. **付款是人工**:無痕轉帳 + 人工查帳確認。LINE Pay / 信用卡自動收款不在本期範圍(串接重)。
3. **LINE 官方帳號 + Messaging API 頻道要 Jason 自己申請**(免費,manager.line.biz + LINE Developers),把 token/secret 給 Claude 才能接。
4. **LINE 訊息額度**:回覆客人訊息免費不限量;主動「群發行銷」有每月免費上限。分析回覆屬「回覆」,不受影響。
5. **醫療免責**:維持「非獸醫診斷、僅供參考、嚴重症狀立即就醫」聲明(analyze-core 已有)。
6. **Claude 模型**:核心維持 Claude API(醫療安全性/繁中/視覺);必要時可降 Haiku 4.5 省成本。

---

## 10. 範圍界定

### 本期範圍(In scope)
- LINE 官方帳號:加好友 → 傳照片 → Claude 分析 → Flex 回覆 → 免費/付費次數控管。
- 無痕轉帳收款 + 回報表單 + 待核帳佇列 + admin 一鍵確認加次數。
- 待核帳的即時通知(Telegram 或 LINE)。
- B2C 定價(59/149/399)落地。
- 網頁 B2B 做法 A(店家品牌 QR)可同期或次期,共用核心。

### 不在本期範圍(Out of scope / YAGNI)
- 信用卡 / LINE Pay 自動收款。
- 完整多租戶店家自助後台(做法 B)。
- AI 生成寫實影片 / 圖片。
- B2B 店家訂閱定價(另議)。
- 把「Telegram 上叫 Apex 幫忙按確認」接進後台(進階,先做基本 admin 確認)。

---

## 11. 待決定事項(Open questions)

1. **免費額度**:LINE 端「首次完整免費 + 快速無限」是否 OK?還是沿用「3 次免費」?
2. **通知通路**:Telegram 通知 bot(推薦)還是 LINE push 給自己?
3. **主通路優先序**:LINE 為 B2C 主力、網頁為 B2B —— 確認這個分工?
4. **收款帳戶**:要放哪個銀行帳號(實作時提供,不寫進版本控管)。
5. **B2B 店家月費**:之後另開文件定價。

---

## 12. 建議實作階段(給後續 writing-plans 參考)

- **Phase 1 — LINE 分析 MVP**:LINE OA 接上 → 收照片 → Claude 分析 → Flex 回覆 → 免費額度控管(先不收費,驗證體驗)。
- **Phase 2 — 收款閉環**:方案顯示 + 收款帳戶 + 回報表單 + 待核帳 + admin 確認加次數 + 通知。
- **Phase 3 — B2B 網頁品牌版**:做法 A 店家品牌 QR(共用核心)。
- **Phase 4 — 打磨/行銷**:Flex 卡片美化、群發行銷、優惠碼、數據看板。
