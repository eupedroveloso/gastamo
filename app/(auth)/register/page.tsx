"use client";

import { useActionState, useState } from "react";
import { register } from "@/lib/actions/auth";
import { EyeIcon } from "@/components/icons";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100vh",
        background: "var(--color-bg-inverse)",
      }}
    >
      {/* Left Column */}
      <div style={{ width: "50%", padding: "var(--space-16)" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#F0FAF5",
            borderRadius: "var(--radius-4xl)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/login-illustration.svg"
            alt="Ilustração"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      {/* Right Column */}
      <div
        style={{
          width: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-24)",
        }}
      >
        <form
          action={formAction}
          style={{
            width: 322,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-24)",
          }}
        >
          <h1
            style={{
              fontWeight: 300,
              fontSize: 64,
              lineHeight: 1.05,
              letterSpacing: "-1.4px",
              color: "var(--color-bg-subtle)",
            }}
          >
            Crie sua conta
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            {/* Nome */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <label
                htmlFor="name"
                style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.5, color: "var(--color-fg-subtle)" }}
              >
                Nome
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#171717",
                  border: "1px solid #404040",
                  borderRadius: "var(--radius-2xl)",
                  padding: "10px 12px",
                }}
              >
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Seu nome completo"
                  required
                  autoComplete="name"
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

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <label
                htmlFor="email"
                style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.5, color: "var(--color-fg-subtle)" }}
              >
                Email
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#171717",
                  border: "1px solid #404040",
                  borderRadius: "var(--radius-2xl)",
                  padding: "10px 12px",
                }}
              >
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="mail.exemplo@email.com"
                  required
                  autoComplete="email"
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
                htmlFor="password"
                style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.5, color: "var(--color-fg-subtle)" }}
              >
                Senha
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-8)",
                  background: "#171717",
                  border: "1px solid #404040",
                  borderRadius: "var(--radius-2xl)",
                  padding: "10px 12px",
                }}
              >
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
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
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                >
                  <EyeIcon size={16} color="var(--color-fg-subtle)" />
                </button>
              </div>
            </div>

            {state?.error && (
              <p
                style={{
                  fontWeight: 400,
                  fontSize: 13,
                  color: "#f87171",
                  lineHeight: 1.5,
                  padding: "8px 12px",
                  background: "rgba(248,113,113,0.1)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                {state.error}
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                width: "100%",
                height: 48,
                background: isPending ? "#0c7341" : "#1AAD63",
                border: "none",
                borderRadius: "var(--radius-3xl)",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 16,
                color: "var(--color-bg-subtle)",
                cursor: isPending ? "not-allowed" : "pointer",
                lineHeight: 1.5,
                transition: "background 0.2s",
              }}
            >
              {isPending ? "Criando conta..." : "Criar conta"}
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

            <a
              href="/login"
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              Já tenho conta
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
