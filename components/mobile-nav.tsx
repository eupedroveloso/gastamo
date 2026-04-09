"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2Icon, SquareListIcon, MicrochipAiIcon, CogIcon } from "./icons";
import { AI_ENABLED } from "@/lib/config";

const navItems = [
  { href: "/", icon: "grid-2", label: "Dashboard" },
  { href: "/transactions", icon: "square-list", label: "Transações" },
  { href: "/ai", icon: "microchip-ai", label: "IA" },
  { href: "/settings", icon: "cog", label: "Config" },
];

function getIcon(name: string, active: boolean) {
  const color = active ? "#0A0A0A" : "#FFFFFF";
  const props = { size: 22, color };
  switch (name) {
    case "grid-2": return <Grid2Icon {...props} />;
    case "square-list": return <SquareListIcon {...props} />;
    case "microchip-ai": return <MicrochipAiIcon {...props} />;
    case "cog": return <CogIcon {...props} />;
    default: return null;
  }
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav-bar">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          background: "#171717",
          borderRadius: 20,
          padding: "6px 8px",
          width: "100%",
        }}
      >
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const isDisabled = item.icon === "microchip-ai" && !AI_ENABLED;

          if (isDisabled) {
            return (
              <div
                key={item.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  opacity: 0.3,
                  cursor: "not-allowed",
                  padding: "4px 12px",
                }}
              >
                <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {getIcon(item.icon, false)}
                </div>
                <span style={{ fontSize: 10, fontWeight: 500, color: "#A3A3A3", lineHeight: 1.2 }}>{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px" }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: isActive ? "#99E83A" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                }}
              >
                {getIcon(item.icon, isActive)}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isActive ? "#99E83A" : "#A3A3A3",
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
