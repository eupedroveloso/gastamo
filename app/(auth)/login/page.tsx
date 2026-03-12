"use client";

import { useState } from "react";
import { EyeIcon } from "@/components/icons";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        width: 1440,
        height: "100vh",
        margin: "0 auto",
        background: "var(--color-bg-inverse)",
      }}
    >
      {/* Left Column — Decorative */}
      <div
        style={{
          width: "50%",
          padding: "var(--space-16)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "var(--color-bg-brand-accent)",
            borderRadius: "var(--radius-4xl)",
            padding: "var(--space-24)",
          }}
        />
      </div>

      {/* Right Column — Form */}
      <div
        style={{
          width: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg-inverse)",
          borderRadius: "var(--radius-4xl)",
          padding: "var(--space-24)",
        }}
      >
        <div
          style={{
            width: 322,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-24)",
            padding: "var(--space-24)",
          }}
        >
          {/* Title */}
          <h1
            style={{
              fontWeight: 300,
              fontSize: 64,
              lineHeight: 1.05,
              letterSpacing: "-1.4px",
              color: "var(--color-bg-subtle)",
            }}
          >
            Acesse sua conta
          </h1>

          {/* Form fields */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-8)",
            }}
          >
            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <label
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--color-fg-subtle)",
                }}
              >
                Email
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-8)",
                  background: "#171717",
                  border: "var(--border-sm) solid #404040",
                  borderRadius: "var(--radius-2xl)",
                  padding: "10px 12px",
                }}
              >
                <input
                  type="email"
                  placeholder="mail.exemplo@email.com"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontFamily: "inherit",
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "var(--color-fg-subtle)",
                  }}
                />
              </div>
            </div>

            {/* Senha */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <label
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--color-fg-subtle)",
                }}
              >
                Senha
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-8)",
                  background: "#171717",
                  border: "var(--border-sm) solid #404040",
                  borderRadius: "var(--radius-2xl)",
                  padding: "10px 12px",
                }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua Senha"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontFamily: "inherit",
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "var(--color-fg-subtle)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <EyeIcon size={16} color="var(--color-fg-subtle)" />
                </button>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <button
              style={{
                width: "100%",
                height: 48,
                background: "#1AAD63",
                border: "none",
                borderRadius: "var(--radius-3xl)",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 16,
                color: "var(--color-bg-subtle)",
                cursor: "pointer",
                lineHeight: 1.5,
              }}
            >
              Entrar
            </button>

            <span
              style={{
                fontWeight: 600,
                fontSize: 16,
                color: "var(--color-fg-inverse)",
                lineHeight: 1.5,
                padding: "var(--space-4)",
              }}
            >
              ou
            </span>

            <button
              style={{
                width: "100%",
                height: 48,
                background: "var(--color-bg-brand-dark)",
                border: "none",
                borderRadius: "var(--radius-3xl)",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 16,
                color: "var(--color-bg-subtle)",
                cursor: "pointer",
                lineHeight: 1.5,
              }}
            >
              Criar uma conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
