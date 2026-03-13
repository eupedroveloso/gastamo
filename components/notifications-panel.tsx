"use client";

import { useEffect, useState, useTransition } from "react";
import { CloseIcon, BellIcon } from "./icons";
import { getNotifications, type Notification } from "@/lib/actions/notifications";

interface Props {
  open: boolean;
  onClose: () => void;
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
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  const initials = name
    ? name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "var(--color-bg-brand-accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--color-fg-inverse)",
        flexShrink: 0,
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
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: `${bg}20`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: bg }} />
    </div>
  );
}

export function NotificationsPanel({ open, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      startTransition(async () => {
        const data = await getNotifications();
        setNotifications(data);
      });
    }
  }, [open]);

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
          right: 0,
          bottom: 0,
          width: 410,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-default)",
          borderLeft: "var(--border-sm) solid var(--color-border-muted)",
          borderRadius: "var(--radius-4xl) 0 0 var(--radius-4xl)",
          animation: "slideIn 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "var(--space-32) var(--space-32) var(--space-16)",
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
            {notifications.length > 0 && (
              <span
                style={{
                  background: "var(--color-bg-brand-default)",
                  color: "var(--color-fg-inverse)",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 99,
                  padding: "1px 7px",
                  lineHeight: 1.6,
                }}
              >
                {notifications.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 48,
              height: 32,
              background: "var(--color-bg-default)",
              border: "var(--border-sm) solid var(--color-border-default)",
              borderRadius: "var(--radius-2xl)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <CloseIcon size={16} color="var(--color-fg-default)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-16) var(--space-32) var(--space-32)" }}>
          {isPending ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 200,
                color: "var(--color-fg-muted)",
                fontSize: 14,
              }}
            >
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 200,
                gap: "var(--space-8)",
              }}
            >
              <BellIcon size={32} color="var(--color-fg-subtle)" />
              <span style={{ fontSize: 14, color: "var(--color-fg-subtle)" }}>
                Nenhuma notificação
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-12)",
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
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--color-fg-default)",
                        lineHeight: 1.4,
                        marginBottom: 2,
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-fg-muted)",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n.description}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-fg-subtle)",
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
