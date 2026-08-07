import type { AnalysisRecord } from "@/lib/store";
import { historyListUrl, historyRecordUrl } from "@/lib/history-link";

const SEVERITY: Record<string, { dot: string; label: string; color: string }> = {
  green: { dot: "🟢", label: "狀況穩定", color: "#2E9E5B" },
  yellow: { dot: "🟡", label: "建議觀察", color: "#C98A00" },
  red: { dot: "🔴", label: "建議就醫", color: "#D64545" },
};

// 台灣時間的「08/07 15:30」
export function formatTaipei(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function severityOf(rec: AnalysisRecord) {
  const fromResult = (rec.result as { severityLabel?: string } | null)?.severityLabel;
  const base = SEVERITY[rec.severity] ?? {
    dot: "⚪️",
    label: rec.severity,
    color: "#666666",
  };
  return { ...base, label: fromResult || base.label };
}

function truncate(s: string, n: number): string {
  const t = (s || "").trim();
  return t.length > n ? t.slice(0, n) + "…" : t || "（未填症狀）";
}

function bubbleFor(rec: AnalysisRecord, key: string) {
  const sev = severityOf(rec);
  const contents: unknown[] = [
    {
      type: "text",
      text: `${sev.dot} ${sev.label}`,
      size: "sm",
      weight: "bold",
      color: sev.color,
    },
    {
      type: "text",
      text: `${formatTaipei(rec.createdAt)} · ${rec.petType === "cat" ? "🐱 貓咪" : "🐶 狗狗"}`,
      size: "xxs",
      color: "#999999",
      margin: "sm",
    },
    {
      type: "text",
      text: truncate(rec.symptoms, 40),
      size: "sm",
      wrap: true,
      maxLines: 3,
      margin: "md",
    },
  ];

  const bubble: Record<string, unknown> = {
    type: "bubble",
    size: "kilo",
    body: { type: "box", layout: "vertical", contents },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: "#2E7D64",
          action: {
            type: "uri",
            label: "看完整報告",
            uri: historyRecordUrl(key, rec.id),
          },
        },
      ],
    },
  };

  // 照片是選填的，沒有就不放 hero（Flex 的 hero 圖片網址不能是空的）
  if (rec.imageUrl) {
    bubble.hero = {
      type: "image",
      url: rec.imageUrl,
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
    };
  }
  return bubble;
}

// 最後一張卡片：導去完整列表
function moreBubble(key: string, total: number) {
  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      justifyContent: "center",
      contents: [
        { type: "text", text: "📖", size: "xxl", align: "center" },
        {
          type: "text",
          text: `你共有 ${total} 筆紀錄`,
          size: "sm",
          align: "center",
          wrap: true,
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: "#2E7D64",
          action: { type: "uri", label: "查看全部紀錄", uri: historyListUrl(key) },
        },
      ],
    },
  };
}

// 組出「歷史紀錄」要回的訊息。沒有紀錄時回一段引導文字。
export function buildHistoryMessages(
  records: AnalysisRecord[],
  total: number,
  key: string
): unknown[] {
  if (records.length === 0) {
    return [
      {
        type: "text",
        text:
          "📖 你還沒有健檢紀錄喔 🐾\n\n" +
          "點下方「開始健檢」傳一張毛孩的照片，做完就會出現在這裡。",
      },
    ];
  }

  const bubbles: unknown[] = records.map((r) => bubbleFor(r, key));
  if (total > records.length) bubbles.push(moreBubble(key, total));

  return [
    {
      type: "flex",
      altText: `📖 你的健檢紀錄（共 ${total} 筆）`,
      contents: { type: "carousel", contents: bubbles },
    },
  ];
}
