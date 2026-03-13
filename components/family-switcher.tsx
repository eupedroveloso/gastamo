"use client";

import { useState, useTransition } from "react";
import { setActiveFamily } from "@/lib/actions/family";

interface Family {
  id: string;
  name: string;
  role: string;
}

interface FamilySwitcherProps {
  families: Family[];
  activeFamilyId: string | null;
}

export function FamilySwitcher({ families, activeFamilyId }: FamilySwitcherProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (families.length <= 1) return null;

  const activeFamily = families.find((f) => f.id === activeFamilyId) ?? families[0];

  const handleSelect = (familyId: string) => {
    if (familyId === activeFamilyId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await setActiveFamily(familyId);
      setOpen(false);
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          background: "var(--color-bg-subtle)",
          border: "var(--border-sm) solid var(--color-border-default)",
          borderRadius: "var(--radius-2xl)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-fg-muted)",
          fontFamily: "inherit",
          opacity: isPending ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        {activeFamily?.name ?? "Selecionar família"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              zIndex: 20,
              background: "var(--color-bg-default)",
              border: "var(--border-sm) solid var(--color-border-default)",
              borderRadius: "var(--radius-2xl)",
              padding: "6px",
              minWidth: 200,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            {families.map((family) => {
              const isActive = family.id === activeFamilyId;
              return (
                <button
                  key={family.id}
                  type="button"
                  onClick={() => handleSelect(family.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "8px 12px",
                    background: isActive ? "var(--color-bg-brand-accent)" : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-xl)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: "var(--color-fg-default)",
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--color-bg-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>{family.name}</span>
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
