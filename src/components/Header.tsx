"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site";

export function Header() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="site-header">
      <Link href="/" className="site-logo">
        {siteConfig.name}
      </Link>

      <nav className="site-nav" aria-label="Primary">
        {siteConfig.nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "nav-link is-active" : "nav-link"}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
