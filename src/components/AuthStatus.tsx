"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogIn, History } from "lucide-react";

type Me = {
  name: string;
  email: string;
  picture?: string;
  freeUsesRemaining: number;
} | null;

export default function AuthStatus() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-9" />;
  }

  if (!me) {
    return (
      <a
        href="/api/auth/google/login"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-[var(--muted)]"
      >
        <LogIn className="h-4 w-4" />
        用 Google 登入
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <History className="h-4 w-4" />
        我的紀錄
      </Link>
      <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white py-1 pl-1 pr-3 shadow-sm">
        {me.picture ? (
          <Image
            src={me.picture}
            alt={me.name}
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs">
            🐾
          </div>
        )}
        <div className="text-xs leading-tight">
          <div className="font-medium">{me.name}</div>
          <div className="text-[var(--muted-foreground)]">
            剩 {me.freeUsesRemaining} 次免費
          </div>
        </div>
      </div>
      <a
        href="/api/auth/logout"
        className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        登出
      </a>
    </div>
  );
}
