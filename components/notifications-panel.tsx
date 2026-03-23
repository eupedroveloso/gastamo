"use client";

import { useEffect, useState, useTransition } from "react";
import { CloseIcon, BellIcon } from "./icons";
import {
  getNotifications,
  dismissNotification,
  dismissAllNotifications,
  type Notification,
} from "@/lib/actions/notifications";
import { acceptInvite, declineInvite } from "@/lib/actions/settings";

const DISMISSED_CAT_KEY = "gastamo_dismissed_cat_alerts";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Atualiza contador na sidebar após carregar / dispensar */
  onUpdate?: () => void;
}

function getDismissedCats(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_CAT_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedCats(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_CAT_KEY, JSON.stringify(Array.from(ids)));
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

function NotificationIcon({ type }: { type: Notification["type"] }) {
  const colors: Record<string, { bg: string; dot: string }> = {
    invite: { bg: "#EFF6FF", dot: "#3B82F6" },
    invite_accepted: { bg: "#F0FAF5", dot: "#0F8F4E" },
    invite_declined: { bg: "#FEF2F2", dot: "#DC2626" },
    expense_added: { bg: "#F0FAF5", dot: "#1AAD63" },
    expense_deleted: { bg: "#FEF2F2", dot: "#F97316" },
    removed_from_family: { bg: "#FEF2F2", dot: "#DC2626" },
    weekly_report: { bg: "#F5F3FF", dot: "#7C3AED" },
    category_alert: { bg: "#FFF7ED", dot: "#F97316" },
  };
  const { bg, dot } = colors[type] ?? { bg: "#F5F5F5", dot: "#A3A3A3" };
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot }} />
    </div>
  );
}

export function NotificationsPanel({ open, onClose, onUpdate }: Props) {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [dismissedCats, setDismissedCats] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const load = () => {
    startTransition(async () => {
      const data = await getNotifications();
      setAllNotifications(data);
      onUpdate?.();
    });
  };

  useEffect(() => {
    if (open) {
      setDismissedCats(getDismissedCats());
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visible = allNotifications.filter((n) =>
    n.type === "category_alert" ? !dismissedCats.has(n.id) : true
  );

  const dismiss = async (n: Notification) => {
    if (n.type === "category_alert") {
      const next = new Set(dismissedCats);
      next.add(n.id);
      setDismissedCats(next);
      saveDismissedCats(next);
      onUpdate?.();
    } else {
      setAllNotifications((prev) => prev.filter((x) => x.id !== n.id));
      await dismissNotification(n.id);
      onUpdate?.();
    }
  };

  const dismissAll = async () => {
    const catIds = new Set(allNotifications.filter((n) => n.type === "category_alert").map((n) => n.id));
    setDismissedCats(catIds);
    saveDismissedCats(catIds);
    setAllNotifications([]);
    await dismissAllNotifications();
    onUpdate?.();
  };

  const handleInvite = async (n: Notification, action: "accept" | "decline") => {
    const inviteId = n.metadata?.inviteId;
    if (!inviteId) return;
    setRespondingTo(n.id);
    if (action === "accept") {
      await acceptInvite(inviteId);
    } else {
      await declineInvite(inviteId);
    }
    setRespondingTo(null);
    load();
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
          width: 380,
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
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-16) var(--space-16) var(--space-32)" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {visible.map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "var(--space-12)",
                    borderRadius: "var(--radius-xl)",
                    background: n.type === "invite" ? "#EFF6FF" : "var(--color-bg-subtle)",
                    border: n.type === "invite" ? "1px solid #BFDBFE" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-12)" }}>
                    <NotificationIcon type={n.type} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-default)", lineHeight: 1.4, marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div
                        style={
                          n.type === "weekly_report"
                            ? {
                                fontSize: 12,
                                color: "var(--color-fg-muted)",
                                lineHeight: 1.5,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }
                            : {
                                fontSize: 12,
                                color: "var(--color-fg-muted)",
                                lineHeight: 1.4,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }
                        }
                      >
                        {n.description}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-fg-subtle)", marginTop: 4 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(n)}
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

                  {/* Invite action buttons */}
                  {n.type === "invite" && n.metadata?.inviteId && (
                    <div style={{ display: "flex", gap: 8, paddingLeft: 48 }}>
                      <button
                        type="button"
                        disabled={respondingTo === n.id}
                        onClick={() => handleInvite(n, "decline")}
                        style={{
                          flex: 1, padding: "6px 0", borderRadius: 8,
                          border: "1px solid #BFDBFE", background: "#FFFFFF",
                          fontSize: 12, fontWeight: 600, color: "#1D4ED8",
                          cursor: "pointer", fontFamily: "inherit",
                          opacity: respondingTo === n.id ? 0.6 : 1,
                        }}
                      >
                        Recusar
                      </button>
                      <button
                        type="button"
                        disabled={respondingTo === n.id}
                        onClick={() => handleInvite(n, "accept")}
                        style={{
                          flex: 1, padding: "6px 0", borderRadius: 8,
                          border: "none", background: "#2563EB",
                          fontSize: 12, fontWeight: 600, color: "#FFFFFF",
                          cursor: "pointer", fontFamily: "inherit",
                          opacity: respondingTo === n.id ? 0.6 : 1,
                        }}
                      >
                        {respondingTo === n.id ? "..." : "Aceitar"}
                      </button>
                    </div>
                  )}
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
