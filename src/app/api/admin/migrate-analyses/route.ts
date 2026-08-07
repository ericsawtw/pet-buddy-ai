import { isAdmin } from "@/lib/admin-auth";
import { migrateFlatAnalyses } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

// 一次性搬遷：把舊的平放分析紀錄移進各使用者的資料夾。
// 僅限管理員；可重複執行，已搬過的會跳過。
export async function POST() {
  if (!(await isAdmin())) {
    return Response.json({ error: "需要管理員權限" }, { status: 403 });
  }
  const result = await migrateFlatAnalyses();
  return Response.json(result);
}
