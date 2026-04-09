"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2Icon, SquareListIcon, MicrochipAiIcon, CogIcon, BellIcon } from "./icons";
import { NotificationsPanel } from "./notifications-panel";
import { AI_ENABLED } from "@/lib/config";
import { getNotifications } from "@/lib/actions/notifications";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
}

function SidebarItem({ href, icon, active, disabled, tooltip }: SidebarItemProps) {
  if (disabled) {
    return (
      <div
        className="ds-icon-button"
        data-selected="false"
        data-disabled="true"
        title={tooltip}
        aria-disabled
      >
        {icon}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="ds-icon-button"
      data-selected={active ? "true" : "false"}
      aria-current={active ? "page" : undefined}
      title={tooltip}
    >
      {icon}
    </Link>
  );
}

const navItems = [
  { href: "/", icon: "grid-2", label: "Dashboard" },
  { href: "/transactions", icon: "square-list", label: "Transações" },
  { href: "/ai", icon: "microchip-ai", label: "Assistente IA" },
  { href: "/settings", icon: "cog", label: "Configurações" },
];

function getIcon(name: string) {
  const props = { size: 24, color: "currentColor" as const };
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const list = await getNotifications();
      setUnreadCount(list.length);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    refreshUnread();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notificationsOpen) refreshUnread();
  }, [notificationsOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <aside
        style={{
          width: 80,
          minHeight: "100vh",
          background: "var(--color-bg-inverse)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "var(--space-16)",
          paddingBottom: "var(--space-16)",
          flexShrink: 0,
        }}
      >
        {/* Figma 225:560 — Notification no topo; badge posição ~x:23 y:9 no frame 40×40 */}
        <button
          type="button"
          title="Notificações"
          onClick={() => setNotificationsOpen(true)}
          className="ds-icon-button"
          data-selected={notificationsOpen ? "true" : "false"}
          style={{ position: "relative", flexShrink: 0 }}
        >
          <BellIcon size={24} color="currentColor" />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 9,
                right: 9,
                boxSizing: "border-box",
                minWidth: 8,
                minHeight: 8,
                padding: "2px 3px",
                borderRadius: 40,
                border: "1px solid var(--color-bg-inverse)",
                background: "#EF4444",
                color: "#000000",
                fontSize: unreadCount > 9 ? 5 : 6,
                fontWeight: 800,
                lineHeight: 1,
                fontFamily: "var(--font-albert-sans), Inter, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div style={{ flex: 1, minHeight: "var(--space-16)" }} />

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
                icon={getIcon(item.icon)}
                active={isActive}
                disabled={isDisabled}
                tooltip={isDisabled ? "Em breve" : item.label}
              />
            );
          })}
        </nav>

        <div style={{ flex: 1, minHeight: "var(--space-16)" }} />
      </aside>

      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onUpdate={refreshUnread}
      />
    </>
  );
}
