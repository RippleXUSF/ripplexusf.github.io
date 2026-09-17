"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconShieldCheck } from "./Icons";
import { useRole, AppRole } from "./RoleContext";

const NAV_LINKS: Record<AppRole, { href: string; label: string }[]> = {
  manufacturer: [
    { href: "/",            label: "Dashboard"  },
    { href: "/manufacture", label: "Mint batch" },
    { href: "/verify",      label: "Verify"     },
  ],
  distributor: [
    { href: "/",       label: "Dashboard"       },
    { href: "/verify", label: "Confirm receipt" },
  ],
  pharmacy: [
    { href: "/",       label: "Dashboard"    },
    { href: "/verify", label: "Confirm & QR" },
  ],
};

export default function Nav() {
  const pathname       = usePathname();
  const { role }       = useRole();
  const links          = NAV_LINKS[role];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav style={{
      height: 52,
      borderBottom: "0.5px solid #272B29",
      backgroundColor: "#161918",
      position: "sticky",
      top: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{ width: 28, height: 28, backgroundColor: "#17906A", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IconShieldCheck size={15} color="#E8E6E0" strokeWidth={2.5} />
        </div>
        <span style={{ fontFamily: "var(--font-fraunces)", fontSize: 17, fontWeight: 600, color: "#E8E6E0", letterSpacing: "-0.3px" }}>
          MedVerify
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", letterSpacing: "0.5px" }}>
          on XRPL
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {links.map(link => (
          <Link key={link.label} href={link.href}
            style={{
              fontSize: 13, padding: "6px 12px", borderRadius: 8,
              color: isActive(link.href) ? "#E8E6E0" : "#6E6C66",
              backgroundColor: isActive(link.href) ? "#1E2120" : "transparent",
              textDecoration: "none", transition: "background-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => {
              if (!isActive(link.href)) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#1E2120";
                (e.currentTarget as HTMLElement).style.color = "#E8E6E0";
              }
            }}
            onMouseLeave={e => {
              if (!isActive(link.href)) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#6E6C66";
              }
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Current role indicator — click to go back to dashboard to change */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "#6E6C66" }}>acting as</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "0.5px solid #17906A", backgroundColor: "#0A2820", color: "#1FA87A" }}>
          {role}
        </span>
      </Link>
    </nav>
  );
}
