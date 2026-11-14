"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PHONE_LINE } from "./floor-copy";

const PAGES = [
  { href: "/", label: "Floor" },
  { href: "/apps", label: "Apps" },
  { href: "/rules", label: "Rules" },
];

/** The frame every page shares: live mark, page links, and the number to call. */
export function Shell({ error, children }: { error: string | null; children: React.ReactNode }) {
  const path = usePathname();
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.dataset.theme === "light"), []);

  function switchTheme() {
    const next = light ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setLight(!light);
  }

  return (
    <main className="flex h-screen flex-col gap-7 overflow-hidden bg-ink px-14 pt-8 pb-8 text-fg">
      <header className="flex items-center gap-6">
        <p className="inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] ring-1 ring-fg/30">
          <span className="live-dot h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="text-accent">Live</span>
          <span className="text-fg/40">|</span>
          <span>Phone-a-factory</span>
        </p>
        <nav className="flex gap-1 rounded-full bg-fg/[0.06] p-1" aria-label="Pages">
          {PAGES.map((page) => {
            const here = page.href === "/" ? path === "/" || path.startsWith("/asks") : path.startsWith(page.href);
            return (
              <Link
                key={page.href}
                href={page.href}
                aria-current={here ? "page" : undefined}
                className={`rounded-full px-5 py-1.5 text-[14px] font-semibold transition-colors ${here ? "bg-fg text-ink" : "text-fg/60 hover:text-fg"}`}
              >
                {page.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={switchTheme}
          className="ml-auto rounded-full px-4 py-1.5 text-[14px] font-semibold text-fg/60 ring-1 ring-fg/20 transition-colors hover:text-fg"
        >
          {light ? "Dark theme" : "Light theme"}
        </button>
        <p className="shrink-0 rounded-2xl bg-accent px-6 py-3 font-[family-name:var(--font-display)] text-[28px] font-medium leading-none tracking-tight text-white">
          {PHONE_LINE}
        </p>
      </header>
      {error ? <p className="text-[15px] text-accent">{error}</p> : null}
      {children}
    </main>
  );
}
