import { NextRequest } from "next/server";
import { recordLinePayment, PLANS } from "@/lib/line-payments";
import { getOwnerIds } from "@/lib/line-owners";
import { linePush } from "@/lib/line";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: {
    u?: string;
    plan?: string;
    last5?: string;
    transferAt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "格式錯誤" }, { status: 400 });
  }

  const { u, plan, last5, transferAt } = body;
  if (!u) return Response.json({ error: "缺少使用者資訊，請從 LINE 進入" }, { status: 400 });
  if (!plan || !PLANS[plan]) return Response.json({ error: "請選擇方案" }, { status: 400 });
  if (!last5 || !/^\d{5}$/.test(last5)) {
    return Response.json({ error: "請填寫正確的匯款帳號後五碼（5 位數字）" }, { status: 400 });
  }

  const rec = await recordLinePayment({
    lineUserId: u,
    planKey: plan,
    last5,
    transferAt: transferAt || new Date().toISOString(),
  });

  // 通知管理員（已綁定者）
  const owners = await getOwnerIds();
  const msg =
    "🔔 有人回報匯款\n" +
    `方案：${rec.planLabel}（NT$${rec.amount}）\n` +
    `末五碼：${rec.last5}\n` +
    `時間：${rec.transferAt}\n\n` +
    `查帳確認後，回「開通 ${rec.last5}」即可幫對方加值 ${rec.credits} 次。`;
  await Promise.allSettled(owners.map((o) => linePush(o, msg)));

  return Response.json({ ok: true });
}
