"use client";

import { useEffect, useState, useTransition } from "react";
import { CloseIcon, BellIcon, TrashCanIcon } from "./icons";
import { getNotifications, type Notification } from "@/lib/actions/notifications";

const DISMISSED_KEY = "gastamo_dismissed_notifications";

interface Props {
  open: boolean;
  onClose: () => void;
}

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  return `${days}d atrás`;
}

function Avatar({ name, avatar }: { name?: string; avatar?: string | null }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  const initials = name
    ? name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div
      style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "var(--color-bg-brand-accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 600, color: "var(--color-fg-inverse)", flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function AlertDot({ type }: { type: Notification["type"] }) {
  const bg = type === "category_alert" ? "#f97316" : "var(--color-bg-brand-default)";
  return (
    <div
      style={{
        width: 32, height: 32, borderRadius: "50%",
        background: `${bg}20`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: bg }} />
    </div>
  );
}

export function NotificationsPanel({ open, onClose }: Props) {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setDismissed(getDismissed());
      startTransition(async () => {
        const data = await getNotifications();
        setAllNotifications(data);
      });
    }
  }, [open]);

  const visible = allNotifications.filter((n) => !dismissed.has(n.id));

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const dismissAll = () => {
    const next = new Set(allNotifications.map((n) => n.id));
    setDismissed(next);
    saveDismissed(next);
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 80,
          bottom: 0,
          width: 360,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-default)",
          borderRight: "var(--border-sm) solid var(--color-border-muted)",
          borderRadius: "0 var(--radius-4xl) var(--radius-4xl) 0",
          animation: "slideInLeft 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "var(--space-32) var(--space-24) var(--space-16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "var(--border-sm) solid var(--color-border-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
            <BellIcon size={18} color="var(--color-fg-default)" />
            <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
              Notificações
            </span>
            {visible.length > 0 && (
              <span style={{
                background: "var(--color-bg-brand-default)",
                color: "var(--color-fg-inverse)",
                fontSize: 11, fontWeight: 600, borderRadius: 99,
                padding: "1px 7px", lineHeight: 1.6,
              }}>
                {visible.length}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
            {visible.length > 0 && (
              <button
                type="button"
                onClick={dismissAll}
                title="Limpar todas"
                style={{
                  height: 32, padding: "0 12px",
                  background: "var(--color-bg-subtle)",
                  border: "var(--border-sm) solid var(--color-border-default)",
                  borderRadius: "var(--radius-2xl)",
                  cursor: "pointer", fontSize: 12, fontWeight: 600,
                  color: "var(--color-fg-muted)", fontFamily: "inherit",
                  display: "flex", alignItems: "center",
                }}
              >
                Limpar tudo
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 48, height: 32,
                background: "var(--color-bg-default)",
                border: "var(--border-sm) solid var(--color-border-default)",
                borderRadius: "var(--radius-2xl)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <CloseIcon size={16} color="var(--color-fg-default)" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-16) var(--space-24) var(--space-32)" }}>
          {isPending ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--color-fg-muted)", fontSize: 14 }}>
              Carregando...
            </div>
          ) : visible.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: "var(--space-8)" }}>
              <BellIcon size={32} color="var(--color-fg-subtle)" />
              <span style={{ fontSize: 14, color: "var(--color-fg-subtle)" }}>
                Nenhuma notificação
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {visible.map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "var(--space-12)",
                    padding: "var(--space-12)",
                    borderRadius: "var(--radius-xl)",
                    background: "var(--color-bg-subtle)",
                  }}
                >
                  {n.type === "expense" ? (
                    <Avatar name={n.memberName} avatar={n.memberAvatar} />
                  ) : (
                    <AlertDot type={n.type} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-default)", lineHeight: 1.4, marginBottom: 2 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-fg-muted)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.description}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-fg-subtle)", marginTop: 4 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    title="Remover"
                    style={{
                      width: 24, height: 24, border: "none", background: "transparent",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, opacity: 0.4, borderRadius: "var(--radius-lg)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
                  >
                    <CloseIcon size={12} color="var(--color-fg-muted)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
