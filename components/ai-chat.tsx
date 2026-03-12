"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SearchIcon, PlusIcon, SendIcon, CommentPlusIcon, EllipsisHIcon } from "./icons";

interface Message {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

interface StoredConversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const STORAGE_KEY = "gastamo_ai_chats";
const ACTIVE_KEY = "gastamo_ai_active";

function loadConversations(): StoredConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveConversations(convs: StoredConversation[]) {
  try {
    const clean = convs.map((c) => ({
      ...c,
      messages: c.messages.filter((m) => !m.loading),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // storage full or unavailable
  }
}

function saveActiveId(id: string) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
}

function loadActiveId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

function getGroup(ts: number): "today" | "week" | "older" {
  const now = new Date();
  const d = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - 7 * 86400000;
  if (ts >= startOfToday) return "today";
  if (ts >= startOfWeek) return "week";
  return "older";
}

const INITIAL_PROMPTS = [
  "Como estou gastando esse mês?",
  "Qual categoria tem mais gastos?",
  "Como está meu orçamento?",
  "Analise meus gastos fixos",
  "Quem gastou mais este mês?",
  "Dicas para economizar",
];

function FinnAvatar({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: "#99E83A",
        border: "2px solid #0F8F4E", display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, fontFamily: "inherit",
        fontWeight: 700, fontSize: size * 0.38, color: "#0F8F4E", lineHeight: 1, userSelect: "none",
      }}
    >
      F
    </div>
  );
}

function ConvItem({ conv, isActive, onClick, onDelete }: {
  conv: StoredConversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowMenu(false); }}
        style={{
          width: "100%", minHeight: 40, padding: 10,
          background: isActive ? "#0A0A0A" : hovered ? "rgba(0,0,0,0.04)" : "transparent",
          border: "none", borderRadius: 8, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, textAlign: "left", transition: "background 0.1s",
        }}
      >
        <span style={{
          fontSize: 12, fontWeight: isActive ? 600 : 400,
          color: isActive ? "#FFFFFF" : "#525252",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: 1.5, letterSpacing: "0.02em", flex: 1,
        }}>
          {conv.title}
        </span>
        {(isActive || hovered) && (
          <span
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            <EllipsisHIcon size={14} color={isActive ? "#FFFFFF" : "#A3A3A3"} />
          </span>
        )}
      </button>
      {showMenu && (
        <div
          onMouseLeave={() => setShowMenu(false)}
          style={{
            position: "absolute", right: 0, top: "100%", zIndex: 10,
            background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)", overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(); }}
            style={{
              width: "100%", padding: "8px 16px", background: "none", border: "none",
              cursor: "pointer", fontSize: 12, color: "#DC2626", fontFamily: "inherit",
              textAlign: "left", whiteSpace: "nowrap",
            }}
          >
            Excluir conversa
          </button>
        </div>
      )}
    </div>
  );
}

export function AIChat() {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadConversations();
    const lastActiveId = loadActiveId();

    if (saved.length > 0) {
      setConversations(saved);
      if (lastActiveId && saved.some((c) => c.id === lastActiveId)) {
        setActiveConvId(lastActiveId);
      } else {
        setActiveConvId(saved[0].id);
      }
    } else {
      const newId = `conv-${Date.now()}`;
      const newConv: StoredConversation = {
        id: newId, title: "Nova conversa", messages: [], createdAt: Date.now(),
      };
      setConversations([newConv]);
      setActiveConvId(newId);
    }
    setInitialized(true);
  }, []);

  // Persist whenever conversations change
  useEffect(() => {
    if (!initialized) return;
    saveConversations(conversations);
  }, [conversations, initialized]);

  // Persist active conv id
  useEffect(() => {
    if (activeConvId) saveActiveId(activeConvId);
  }, [activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages ?? [];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createNewConversation = useCallback(() => {
    const id = `conv-${Date.now()}`;
    const newConv: StoredConversation = {
      id, title: "Nova conversa", messages: [], createdAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(id);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const newId = `conv-${Date.now()}`;
        const newConv: StoredConversation = {
          id: newId, title: "Nova conversa", messages: [], createdAt: Date.now(),
        };
        setActiveConvId(newId);
        return [newConv];
      }
      if (id === activeConvId) {
        setActiveConvId(next[0].id);
      }
      return next;
    });
  }, [activeConvId]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const trimmed = text.trim();
    const userMsg: Message = { role: "user", content: trimmed };
    const loadingMsg: Message = { role: "assistant", content: "", loading: true };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConvId) return c;
        const title = c.messages.length === 0 ? trimmed.slice(0, 45) : c.title;
        return { ...c, title, messages: [...c.messages, userMsg, loadingMsg] };
      })
    );
    setInput("");
    setIsLoading(true);

    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error("Erro na resposta");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const convId = activeConvId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            assistantContent += parsed.content ?? "";
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== convId) return c;
                const updated = [...c.messages];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent, loading: false };
                return { ...c, messages: updated };
              })
            );
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      console.error("[AIChat]", err);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConvId) return c;
          const updated = [...c.messages];
          updated[updated.length - 1] = {
            role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente.", loading: false,
          };
          return { ...c, messages: updated };
        })
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const exportConversation = () => {
    if (!messages.length) return;
    const text = messages.filter((m) => !m.loading)
      .map((m) => `${m.role === "user" ? "Você" : "Finn"}: ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finn-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = searchQuery
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const todayConvs = filtered.filter((c) => getGroup(c.createdAt) === "today");
  const weekConvs = filtered.filter((c) => getGroup(c.createdAt) === "week");
  const olderConvs = filtered.filter((c) => getGroup(c.createdAt) === "older");

  const canSend = input.trim().length > 0 && !isLoading;

  if (!initialized) return null;

  return (
    <div style={{ display: "flex", flex: 1, gap: 8, minHeight: 0, overflow: "hidden" }}>
      {/* ── Left Sidebar ── */}
      <div style={{
        width: 268, flexShrink: 0, background: "#FFFFFF", borderRadius: 24,
        display: "flex", flexDirection: "column", padding: 24, gap: 25, overflow: "hidden",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "#0A0A0A", lineHeight: 1.5 }}>
              Conversas
            </span>
            <button
              type="button"
              onClick={createNewConversation}
              style={{
                width: 28, height: 28, background: "#0F8F4E", border: "none", borderRadius: 6,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <CommentPlusIcon size={14} color="#FFFFFF" />
            </button>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            border: "1px solid #E5E5E5", borderRadius: 16, padding: "8px 12px", background: "#FFFFFF",
          }}>
            <input
              type="text"
              placeholder="Buscar Chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                fontFamily: "inherit", fontSize: 13, fontWeight: 400, color: "#0A0A0A", lineHeight: 1.5,
              }}
            />
            <SearchIcon size={14} color="#A3A3A3" />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Hoje", items: todayConvs },
            { label: "Semana passada", items: weekConvs },
            { label: "Mais antigo", items: olderConvs },
          ].map(
            (section) =>
              section.items.length > 0 && (
                <div key={section.label} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#A3A3A3", lineHeight: 1.5, letterSpacing: "0.02em" }}>
                    {section.label}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {section.items.map((conv) => (
                      <ConvItem
                        key={conv.id}
                        conv={conv}
                        isActive={conv.id === activeConvId}
                        onClick={() => setActiveConvId(conv.id)}
                        onDelete={() => deleteConversation(conv.id)}
                      />
                    ))}
                  </div>
                </div>
              )
          )}

          {filtered.length === 0 && (
            <span style={{ fontSize: 12, color: "#A3A3A3", textAlign: "center", paddingTop: 8 }}>
              Nenhuma conversa encontrada
            </span>
          )}
        </div>
      </div>

      {/* ── Main Chat Panel ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", background: "#F5F5F5",
        borderRadius: "24px 0px 0px 24px", overflow: "hidden", minWidth: 0,
      }}>
        {/* Chat header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "16px 28px",
          background: "#FFFFFF", borderBottom: "1px solid #F5F5F5", flexShrink: 0,
        }}>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: "#0A0A0A", lineHeight: 1.5 }}>
            Finn · Assistente Financeiro
          </span>
          <button
            type="button"
            onClick={exportConversation}
            disabled={messages.length === 0}
            style={{
              padding: "8px 12px", background: "#FFFFFF", border: "1px solid #E5E5E5",
              borderRadius: 8, cursor: messages.length > 0 ? "pointer" : "default",
              fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              color: messages.length > 0 ? "#0A0A0A" : "#A3A3A3", lineHeight: 1.5,
            }}
          >
            Exportar
          </button>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "28px 40px 20px",
          display: "flex", flexDirection: "column", gap: 20,
        }}>
          {/* Date divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ flex: 1, height: 1, background: "#E5E5E5" }} />
            <span style={{ fontSize: 12, fontWeight: 400, color: "#A3A3A3", lineHeight: 1.5, flexShrink: 0 }}>
              {activeConv ? new Date(activeConv.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long" }) : "Hoje"}
            </span>
            <div style={{ flex: 1, height: 1, background: "#E5E5E5" }} />
          </div>

          {/* Finn welcome */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <FinnAvatar size={32} />
            <div style={{
              background: "#FFFFFF", borderRadius: "4px 16px 16px 16px",
              padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, maxWidth: 500,
            }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#0A0A0A", lineHeight: 1.5 }}>
                Olá! Sou o Finn, seu assistente financeiro 👋
              </p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#525252", lineHeight: 1.5 }}>
                Posso analisar gastos, criar metas ou sugerir onde economizar. Como posso te ajudar hoje?
              </p>
            </div>
          </div>

          {/* Suggested prompts — only on empty chat */}
          {isEmpty && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 44 }}>
              {INITIAL_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  style={{
                    padding: "8px 12px", background: "#FFFFFF", border: "1px solid #E5E5E5",
                    borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
                    fontWeight: 600, color: "#0A0A0A", lineHeight: 1.5, transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFAFA"; e.currentTarget.style.borderColor = "#A3A3A3"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.borderColor = "#E5E5E5"; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 12, alignItems: "flex-start",
              }}
            >
              {msg.role === "assistant" && <FinnAvatar size={32} />}
              <div style={{
                maxWidth: msg.role === "user" ? "60%" : 520,
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                background: msg.role === "user" ? "#0F8F4E" : "#FFFFFF",
                color: msg.role === "user" ? "#FFFFFF" : "#525252",
                fontSize: 14, lineHeight: 1.6, fontWeight: 400, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {msg.loading ? (
                  <span style={{ display: "flex", gap: 4, alignItems: "center", height: 20 }}>
                    {[0, 0.2, 0.4].map((delay) => (
                      <span key={delay} style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#A3A3A3",
                        animation: "dotPulse 1.2s ease-in-out infinite", animationDelay: `${delay}s`,
                      }} />
                    ))}
                  </span>
                ) : msg.content}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px 12px 24px",
          background: "#FFFFFF", borderTop: "1px solid #F5F5F5", flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={createNewConversation}
            title="Nova conversa"
            style={{
              width: 20, height: 20, background: "none", border: "none", cursor: "pointer",
              padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: "#A3A3A3", transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0A0A0A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3A3")}
          >
            <PlusIcon size={16} color="currentColor" />
          </button>

          <div style={{
            flex: 1, background: "#F5F5F5", border: "1px solid #E5E5E5",
            borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center",
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Pergunte algo sobre suas finanças..."
              disabled={isLoading}
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                fontFamily: "inherit", fontSize: 16, fontWeight: 400, color: "#0A0A0A", lineHeight: 1.5,
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: canSend ? "#0F8F4E" : "#E5E5E5", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: canSend ? "pointer" : "not-allowed", flexShrink: 0, transition: "background 0.2s",
            }}
          >
            <SendIcon size={16} color={canSend ? "#FFFFFF" : "#A3A3A3"} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
