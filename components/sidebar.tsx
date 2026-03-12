"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2Icon, SquareListIcon, MicrochipAiIcon, CogIcon } from "./icons";
import { AI_ENABLED } from "@/lib/config";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
}

function SidebarItem({ href, icon, activeIcon, active, disabled, tooltip }: SidebarItemProps) {
  const content = (
    <div
      title={tooltip}
      style={{
        width: 40,
        height: 40,
        borderRadius: "var(--radius-lg)",
        background: active ? "var(--color-bg-brand-accent)" : "var(--color-bg-inverse)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background 0.2s",
      }}
    >
      {active ? activeIcon : icon}
    </div>
  );

  if (disabled) return content;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}

const navItems = [
  { href: "/", icon: "grid-2", label: "Dashboard" },
  { href: "/transactions", icon: "square-list", label: "Transações" },
  { href: "/ai", icon: "microchip-ai", label: "Assistente IA" },
  { href: "/settings", icon: "cog", label: "Configurações" },
];

function getIcon(name: string, color: string) {
  const props = { size: 24, color };
  switch (name) {
    case "grid-2": return <Grid2Icon {...props} />;
    case "square-list": return <SquareListIcon {...props} />;
    case "microchip-ai": return <MicrochipAiIcon {...props} />;
    case "cog": return <CogIcon {...props} />;
    default: return null;
  }
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 80,
        height: "100vh",
        background: "var(--color-bg-inverse)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: "var(--space-16)",
        paddingBottom: "var(--space-16)",
        flexShrink: 0,
      }}
    >
      <div />

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-8)",
          padding: "var(--space-12)",
          borderRadius: "var(--radius-2xl)",
        }}
      >
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const isDisabled = item.icon === "microchip-ai" && !AI_ENABLED;

          return (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={getIcon(item.icon, "var(--color-fg-inverse)")}
              activeIcon={getIcon(item.icon, "var(--color-fg-default)")}
              active={isActive}
              disabled={isDisabled}
              tooltip={isDisabled ? "Em breve" : item.label}
            />
          );
        })}
      </nav>

      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-2xl)",
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--color-bg-brand-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-fg-inverse)",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          U
        </div>
      </div>
    </aside>
  );
}
