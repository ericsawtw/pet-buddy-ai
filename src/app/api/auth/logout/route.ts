import { clearSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await clearSession();
  return Response.redirect(new URL("/", req.url));
}
