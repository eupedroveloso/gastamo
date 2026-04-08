"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] server component error:", error);
  }, [error]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-16)",
        padding: "var(--space-32)",
        background: "var(--color-bg-subtle)",
        borderRadius: "var(--radius-4xl)",
      }}
    >
      <span style={{ fontSize: 14, color: "var(--color-fg-muted)", textAlign: "center" }}>
        Algo deu errado ao carregar o dashboard.
      </span>
      <button
        onClick={reset}
        style={{
          padding: "10px 20px",
          background: "var(--color-bg-brand-default)",
          border: "none",
          borderRadius: "var(--radius-2xl)",
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: 14,
          color: "var(--color-fg-inverse)",
          cursor: "pointer",
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
