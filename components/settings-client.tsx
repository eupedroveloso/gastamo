"use client";

import { useState, useActionState, useRef, useEffect, useTransition } from "react";
import {
  updateProfile,
  updateFamilyName,
  updateFamilyBudget,
  updateMemberBudget,
  inviteMember,
  deleteMember,
  cancelInvite,
  createCategory,
  deleteCategory,
  updateCategoryLimit,
  createCard,
  deleteCard,
  uploadAvatar,
  deleteAccount,
} from "@/lib/actions/settings";
import { logout } from "@/lib/actions/auth";
import {
  UserVneckIcon,
  UsersIcon,
  TagIcon,
  CreditCardAltIcon,
  EnvelopeIcon,
  TrashCanIcon,
  PencilIcon,
  EyeIcon,
} from "./icons";

type Tab = "profile" | "family" | "categories" | "cards";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface FamilyMemberUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface FamilyMember {
  id: string;
  role: string;
  userId: string;
  budget: number;
  user: FamilyMemberUser;
}

interface Category {
  id: string;
  name: string;
  limitAmount: number;
}

interface Card {
  id: string;
  name: string;
}

interface PendingInvite {
  id: string;
  budget: number;
  createdAt: Date;
  invitedUser: { id: string; name: string; email: string; avatar?: string | null };
  invitedBy: { id: string; name: string };
}

interface Family {
  id: string;
  name: string;
  budget: number;
  members: FamilyMember[];
  categories: Category[];
  cards: Card[];
  invites?: PendingInvite[];
}

interface SettingsClientProps {
  user: User;
  family: Family | null;
  currentUserRole?: string;
}

const inputStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 14px",
  background: "#FFFFFF",
  border: "1px solid #E5E5E5",
  borderRadius: 8,
  height: 44,
  width: "100%",
  boxSizing: "border-box",
};

const inputTextStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: 14,
  fontFamily: "var(--font-albert-sans), sans-serif",
  color: "#0A0A0A",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#525252",
  letterSpacing: "0.02em",
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "#F5F5F5",
  width: "100%",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#0A0A0A",
  margin: 0,
};

function DeleteAccountButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    await deleteAccount();
    setDeleting(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        style={{
          width: 180,
          height: 40,
          borderRadius: 8,
          background: "#DC2626",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          color: "#FFFFFF",
          fontFamily: "var(--font-albert-sans), sans-serif",
        }}
      >
        <TrashCanIcon size={16} color="#FFFFFF" />
        Apagar conta
      </button>

      {showConfirm && (
        <>
          <div
            onClick={() => { if (!deleting) { setShowConfirm(false); setConfirmText(""); } }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 101, background: "#FFFFFF", borderRadius: 24, padding: 32,
            width: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
            display: "flex", flexDirection: "column", gap: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: "#FEF2F2",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#DC2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0A0A0A" }}>Apagar conta permanentemente</p>
                <p style={{ margin: 0, fontSize: 13, color: "#525252", marginTop: 4 }}>Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 16,
              fontSize: 13, color: "#991B1B", lineHeight: 1.6,
            }}>
              Todos os seus dados serão excluídos permanentemente: perfil, gastos, categorias, cartões, sessões e configurações da família. Se você for o único membro, a família inteira será removida.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>
                Digite <strong style={{ color: "#DC2626" }}>APAGAR</strong> para confirmar:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="APAGAR"
                autoComplete="off"
                style={{
                  padding: "10px 14px", border: "1px solid #E5E5E5", borderRadius: 12,
                  fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0A0A0A",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setConfirmText(""); }}
                disabled={deleting}
                style={{
                  padding: "10px 20px", background: "none", border: "1px solid #E5E5E5",
                  borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600,
                  color: "#525252", fontFamily: "inherit",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== "APAGAR" || deleting}
                style={{
                  padding: "10px 20px",
                  background: confirmText === "APAGAR" ? "#DC2626" : "#E5E5E5",
                  border: "none", borderRadius: 12,
                  cursor: confirmText === "APAGAR" && !deleting ? "pointer" : "not-allowed",
                  fontSize: 14, fontWeight: 600,
                  color: confirmText === "APAGAR" ? "#FFFFFF" : "#A3A3A3",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
              >
                {deleting ? "Excluindo..." : "Apagar minha conta"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function SettingsClient({ user, family, currentUserRole = "member" }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [cancelingInviteId, setCancelingInviteId] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [, startMemberTransition] = useTransition();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileState, profileAction, profilePending] = useActionState(updateProfile, null);
  const [avatarState, avatarAction, avatarPending] = useActionState(uploadAvatar, null);
  const [familyNameState, familyNameAction, familyNamePending] = useActionState(updateFamilyName, null);
  const [familyBudgetState, familyBudgetAction, familyBudgetPending] = useActionState(updateFamilyBudget, null);
  const [memberBudgetState, memberBudgetAction, memberBudgetPending] = useActionState(updateMemberBudget, null);
  const [inviteState, inviteAction, invitePending] = useActionState(inviteMember, null);
  const [categoryState, categoryAction, categoryPending] = useActionState(createCategory, null);
  const [categoryLimitState, categoryLimitAction, categoryLimitPending] = useActionState(updateCategoryLimit, null);
  const [cardState, cardAction, cardPending] = useActionState(createCard, null);

  useEffect(() => {
    if (avatarState?.success) {
      // preview stays updated
    }
  }, [avatarState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAvatarPreview(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
    // auto-submit the form
    e.target.form?.requestSubmit();
  };

  const firstName = user.name.split(" ")[0] ?? "";
  const lastName = user.name.split(" ").slice(1).join(" ") ?? "";
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Meu perfil", icon: <UserVneckIcon size={16} color="currentColor" /> },
    { id: "family", label: "Família", icon: <UsersIcon size={16} color="currentColor" /> },
    { id: "categories", label: "Categorias", icon: <TagIcon size={16} color="currentColor" /> },
    { id: "cards", label: "Cartões", icon: <CreditCardAltIcon size={16} color="currentColor" /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      {/* Title */}
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 32, fontWeight: 400, margin: 0, color: "#0A0A0A", letterSpacing: "-0.02em" }}>
          Ajustes
        </h1>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: "flex", gap: 16, padding: 16, flex: 1, minHeight: 0 }}>
        {/* Left nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: 160,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "16px 24px 16px 16px",
                  borderRadius: 16,
                  border: `1px solid ${isActive ? "#0C7341" : "#F5F5F5"}`,
                  background: isActive ? "#0F8F4E" : "#FFFFFF",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 24,
                    background: isActive ? "#D6F5E3" : "#F0FAF5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: isActive ? "#0F8F4E" : "#525252",
                  }}
                >
                  {tab.icon}
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isActive ? "#FFFFFF" : "#525252",
                    fontFamily: "var(--font-albert-sans), sans-serif",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Sair da conta - below Cartões */}
          <form action={logout} style={{ marginTop: 8 }}>
            <button
              type="submit"
              style={{
                width: 160,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "16px 24px 16px 16px",
                borderRadius: 16,
                border: "1px solid #F5F5F5",
                background: "#FFFFFF",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 24,
                  background: "#FAFAFA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#525252",
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#525252" }}>
                Sair
              </span>
            </button>
          </form>
        </div>

        {/* Right content */}
        <div
          style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: 24,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflowY: "auto",
          }}
        >
          {/* ── PERFIL ── */}
          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Avatar Upload Form */}
              <p style={sectionTitleStyle}>Foto de perfil</p>
              <form action={avatarAction} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    background: "#F0FAF5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                    border: avatarPending ? "3px solid #0F8F4E" : "3px solid transparent",
                    transition: "border 0.2s",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Clique para alterar foto"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={user.name} style={{ width: 96, height: 96, objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 32, fontWeight: 700, color: "#0F8F4E" }}>{initials}</span>
                  )}
                  {/* Hover overlay */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(15,143,78,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.2s",
                    }}
                    className="avatar-overlay"
                  >
                    <PencilIcon size={20} color="#0F8F4E" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="avatar"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarPending}
                    style={{
                      width: 200,
                      height: 40,
                      borderRadius: 8,
                      background: avatarPending ? "#D6F5E3" : "#0F8F4E",
                      border: "none",
                      cursor: avatarPending ? "not-allowed" : "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      color: avatarPending ? "#0F8F4E" : "#FFFFFF",
                      fontFamily: "var(--font-albert-sans), sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {avatarPending ? "Salvando..." : "Alterar foto"}
                  </button>
                  <span style={{ fontSize: 12, color: "#525252", letterSpacing: "0.02em" }}>
                    JPG, PNG ou WebP · máx. 5MB
                  </span>
                  {avatarState?.error && (
                    <span style={{ fontSize: 12, color: "#ef4444" }}>{avatarState.error}</span>
                  )}
                  {avatarState?.success && (
                    <span style={{ fontSize: 12, color: "#0F8F4E" }}>{avatarState.success}</span>
                  )}
                </div>
              </form>

              <div style={dividerStyle} />

            <form action={profileAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Personal info */}
              <p style={sectionTitleStyle}>Informações pessoais</p>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <label style={labelStyle}>Nome</label>
                  <div style={inputStyle}>
                    <input
                      name="firstName"
                      defaultValue={firstName}
                      style={inputTextStyle}
                      placeholder="Nome"
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <label style={labelStyle}>Sobrenome</label>
                  <div style={inputStyle}>
                    <input
                      name="lastName"
                      defaultValue={lastName}
                      style={inputTextStyle}
                      placeholder="Sobrenome"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>E-mail</label>
                <div style={inputStyle}>
                  <EnvelopeIcon size={16} color="#525252" />
                  <input
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    style={inputTextStyle}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div style={dividerStyle} />

              {/* Security */}
              <p style={sectionTitleStyle}>Segurança</p>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 320 }}>
                  <label style={labelStyle}>Senha atual</label>
                  <div style={{ ...inputStyle, position: "relative" }}>
                    <input
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      style={{ ...inputTextStyle, paddingRight: 32 }}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
                    >
                      <EyeIcon size={16} color="#A3A3A3" />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 320 }}>
                  <label style={labelStyle}>Nova senha</label>
                  <div style={inputStyle}>
                    <input
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      style={inputTextStyle}
                      placeholder="Nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
                    >
                      <EyeIcon size={16} color="#A3A3A3" />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 320 }}>
                  <label style={labelStyle}>Confirmar nova senha</label>
                  <div style={inputStyle}>
                    <input
                      name="confirmPassword"
                      type="password"
                      style={inputTextStyle}
                      placeholder="Confirmar senha"
                    />
                  </div>
                </div>
              </div>

              <div style={dividerStyle} />

              {/* Feedback */}
              {profileState?.error && (
                <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>{profileState.error}</p>
              )}
              {profileState?.success && (
                <p style={{ color: "#0F8F4E", fontSize: 13, margin: 0 }}>{profileState.success}</p>
              )}

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <DeleteAccountButton />
                <button
                  type="submit"
                  disabled={profilePending}
                  style={{
                    width: 160,
                    height: 44,
                    borderRadius: 8,
                    background: "#0F8F4E",
                    border: "none",
                    cursor: profilePending ? "not-allowed" : "pointer",
                    opacity: profilePending ? 0.7 : 1,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    fontFamily: "var(--font-albert-sans), sans-serif",
                  }}
                >
                  {profilePending ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
          )}

          {/* ── FAMÍLIA ── */}
          {activeTab === "family" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={sectionTitleStyle}>Família atual</p>

              {family ? (
                <>
                  {/* Family card */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 16,
                      background: "#FAFAFA",
                      border: "1px solid #E5E5E5",
                      borderRadius: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: "#F0FAF5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <UsersIcon size={16} color="#0F8F4E" />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {editingFamilyName ? (
                          <form action={familyNameAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              name="familyName"
                              defaultValue={family.name}
                              style={{
                                ...inputTextStyle,
                                border: "1px solid #E5E5E5",
                                borderRadius: 6,
                                padding: "4px 8px",
                                width: 200,
                              }}
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={familyNamePending}
                              style={{
                                background: "#0F8F4E",
                                border: "none",
                                borderRadius: 6,
                                color: "#FFF",
                                fontSize: 12,
                                fontWeight: 600,
                                padding: "4px 10px",
                                cursor: "pointer",
                                fontFamily: "var(--font-albert-sans), sans-serif",
                              }}
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFamilyName(false)}
                              style={{
                                background: "none",
                                border: "1px solid #E5E5E5",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                padding: "4px 10px",
                                cursor: "pointer",
                                fontFamily: "var(--font-albert-sans), sans-serif",
                              }}
                            >
                              Cancelar
                            </button>
                          </form>
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A" }}>{family.name}</span>
                        )}
                        <span style={{ fontSize: 12, color: "#525252", letterSpacing: "0.02em" }}>
                          {family.members.length} integrante{family.members.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {!editingFamilyName && (
                      <button
                        type="button"
                        onClick={() => setEditingFamilyName(true)}
                        style={{
                          width: 128,
                          height: 36,
                          borderRadius: 8,
                          background: "#FFFFFF",
                          border: "1px solid #E5E5E5",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0A0A0A",
                          fontFamily: "var(--font-albert-sans), sans-serif",
                        }}
                      >
                        <PencilIcon size={14} color="#0A0A0A" />
                        Editar nome
                      </button>
                    )}
                  </div>

                  {familyNameState?.error && (
                    <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>{familyNameState.error}</p>
                  )}
                  {familyNameState?.success && (
                    <p style={{ color: "#0F8F4E", fontSize: 13, margin: 0 }}>{familyNameState.success}</p>
                  )}

                  {/* Orçamento da família */}
                  <p style={sectionTitleStyle}>Orçamento da família</p>
                  <form action={familyBudgetAction} style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 320 }}>
                    <div style={{ ...inputStyle, flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0F8F4E" }}>R$</span>
                      <input
                        name="familyBudget"
                        type="text"
                        defaultValue={family.budget > 0 ? family.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                        placeholder="0,00"
                        style={inputTextStyle}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={familyBudgetPending}
                      style={{
                        padding: "10px 20px",
                        borderRadius: 8,
                        background: "#0F8F4E",
                        border: "none",
                        cursor: familyBudgetPending ? "not-allowed" : "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#FFFFFF",
                        fontFamily: "inherit",
                        opacity: familyBudgetPending ? 0.7 : 1,
                      }}
                    >
                      {familyBudgetPending ? "Salvando..." : "Definir"}
                    </button>
                  </form>
                  <p style={{ fontSize: 12, color: "#525252", margin: "0 0 0 4px", letterSpacing: "0.02em" }}>
                    Orçamento mensal total da família
                  </p>
                  {familyBudgetState?.error && (
                    <p style={{ color: "#DC2626", fontSize: 13, margin: "4px 0 0" }}>{familyBudgetState.error}</p>
                  )}
                  {familyBudgetState?.success && (
                    <p style={{ color: "#0F8F4E", fontSize: 13, margin: "4px 0 0" }}>{familyBudgetState.success}</p>
                  )}

                  <div style={dividerStyle} />

                  {/* Members */}
                  <p style={sectionTitleStyle}>Integrantes</p>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {family.members.map((member) => {
                      const memberInitials = member.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      const isAdmin = member.role === "admin";
                      return (
                        <div
                          key={member.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 16px",
                            border: "1px solid #F5F5F5",
                            borderRadius: 12,
                            minHeight: 60,
                            boxSizing: "border-box",
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 180 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "#F0FAF5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#0F8F4E",
                                flexShrink: 0,
                                overflow: "hidden",
                              }}
                            >
                              {member.user.avatar ? (
                                <img
                                  src={member.user.avatar}
                                  alt={member.user.name}
                                  style={{ width: 36, height: 36, objectFit: "cover" }}
                                />
                              ) : (
                                memberInitials
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>
                                {member.user.name}
                              </span>
                              <span style={{ fontSize: 12, color: "#525252", letterSpacing: "0.02em" }}>
                                {member.user.email}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <form action={memberBudgetAction} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input type="hidden" name="memberId" value={member.id} />
                              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: 8, padding: "4px 10px", width: 120 }}>
                                <span style={{ fontSize: 12, color: "#525252" }}>R$</span>
                                <input
                                  name="memberBudget"
                                  type="text"
                                  defaultValue={(member.budget ?? 0) > 0 ? (member.budget ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                                  placeholder="Orçamento"
                                  style={{ ...inputTextStyle, fontSize: 12, padding: 0, width: 70 }}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={memberBudgetPending}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  background: "#0F8F4E",
                                  border: "none",
                                  cursor: memberBudgetPending ? "not-allowed" : "pointer",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "#FFFFFF",
                                  fontFamily: "inherit",
                                  opacity: memberBudgetPending ? 0.7 : 1,
                                }}
                              >
                                Salvar
                              </button>
                            </form>
                            <div
                              style={{
                                padding: "4px 10px",
                                borderRadius: 9999,
                                background: isAdmin ? "#F0FAF5" : "#F5F5F5",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: isAdmin ? "#0F8F4E" : "#525252",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {isAdmin ? "Admin" : "Membro"}
                              </span>
                            </div>
                            {(currentUserRole === "owner" || currentUserRole === "admin") && member.userId !== user.id && member.role !== "owner" && (
                              <button
                                type="button"
                                disabled={deletingMemberId === member.id}
                                onClick={() => {
                                  setDeletingMemberId(member.id);
                                  startMemberTransition(async () => {
                                    const result = await deleteMember(member.id);
                                    if (result?.error) setMemberActionError(result.error);
                                    setDeletingMemberId(null);
                                  });
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  border: "1px solid #FECACA",
                                  background: "#FEF2F2",
                                  cursor: deletingMemberId === member.id ? "not-allowed" : "pointer",
                                  opacity: deletingMemberId === member.id ? 0.6 : 1,
                                  flexShrink: 0,
                                }}
                              >
                                <TrashCanIcon size={14} color="#DC2626" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {memberActionError && (
                    <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>{memberActionError}</p>
                  )}

                  {/* Pending invites */}
                  {family.invites && family.invites.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <p style={sectionTitleStyle}>Convites Pendentes</p>
                      {family.invites.map((invite) => {
                        const inviteInitials = invite.invitedUser.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2);
                        return (
                          <div
                            key={invite.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px 16px",
                              border: "1px solid #FEF3C7",
                              borderRadius: 12,
                              background: "#FFFBEB",
                              minHeight: 60,
                              boxSizing: "border-box",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "50%",
                                  background: "#FEF3C7",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#B45309",
                                  flexShrink: 0,
                                  overflow: "hidden",
                                }}
                              >
                                {invite.invitedUser.avatar ? (
                                  <img
                                    src={invite.invitedUser.avatar}
                                    alt={invite.invitedUser.name}
                                    style={{ width: 36, height: 36, objectFit: "cover" }}
                                  />
                                ) : (
                                  inviteInitials
                                )}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>
                                  {invite.invitedUser.name}
                                </span>
                                <span style={{ fontSize: 12, color: "#525252", letterSpacing: "0.02em" }}>
                                  {invite.invitedUser.email} · Convite pendente
                                </span>
                              </div>
                            </div>
                            {(currentUserRole === "owner" || currentUserRole === "admin") && (
                              <button
                                type="button"
                                disabled={cancelingInviteId === invite.id}
                                onClick={() => {
                                  setCancelingInviteId(invite.id);
                                  startMemberTransition(async () => {
                                    await cancelInvite(invite.id);
                                    setCancelingInviteId(null);
                                  });
                                }}
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: 8,
                                  border: "1px solid #FECACA",
                                  background: "#FEF2F2",
                                  cursor: cancelingInviteId === invite.id ? "not-allowed" : "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#DC2626",
                                  fontFamily: "inherit",
                                  opacity: cancelingInviteId === invite.id ? 0.6 : 1,
                                }}
                              >
                                {cancelingInviteId === invite.id ? "Cancelando..." : "Cancelar convite"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={dividerStyle} />

                  {/* Invite section */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <p style={sectionTitleStyle}>Convidar integrante</p>
                      <p style={{ fontSize: 12, color: "#525252", margin: "4px 0 0", letterSpacing: "0.02em" }}>
                        O usuário precisa estar cadastrado na plataforma para receber o convite.
                      </p>
                    </div>
                    <form action={inviteAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ ...inputStyle, flex: 1, minWidth: 200 }}>
                          <EnvelopeIcon size={16} color="#525252" />
                          <input
                            name="inviteEmail"
                            type="email"
                            style={inputTextStyle}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div style={{ ...inputStyle, width: 140 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#0F8F4E" }}>R$</span>
                          <input
                            name="memberBudget"
                            type="text"
                            style={inputTextStyle}
                            placeholder="Orçamento (opcional)"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={invitePending}
                          style={{
                            width: 180,
                            padding: "12px 16px",
                            borderRadius: 16,
                            background: "#1A3A2E",
                            border: "none",
                            cursor: invitePending ? "not-allowed" : "pointer",
                            opacity: invitePending ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#FFFFFF",
                            fontFamily: "var(--font-albert-sans), sans-serif",
                            flexShrink: 0,
                          }}
                        >
                          Convidar
                        </button>
                      </div>
                    </form>
                    {inviteState?.error && (
                      <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>{inviteState.error}</p>
                    )}
                    {inviteState?.success && (
                      <p style={{ color: "#0F8F4E", fontSize: 13, margin: 0 }}>{inviteState.success}</p>
                    )}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 14, color: "#525252" }}>Você não pertence a nenhuma família.</p>
              )}
            </div>
          )}

          {/* ── CATEGORIAS ── */}
          {activeTab === "categories" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", height: 48 }}>
                <p style={sectionTitleStyle}>Categorias</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {(family?.categories ?? []).map((cat) => {
                  const deleteCategoryWithId = deleteCategory.bind(null, cat.id);
                  return (
                    <div
                      key={cat.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        border: "1px solid #F5F5F5",
                        borderRadius: 12,
                        minHeight: 60,
                        boxSizing: "border-box",
                        marginBottom: 4,
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: "#F5F5F5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <TagIcon size={16} color="#525252" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
                      </div>
                      <form action={categoryLimitAction} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <input type="hidden" name="categoryId" value={cat.id} />
                        <span style={{ fontSize: 12, color: "#A3A3A3", whiteSpace: "nowrap" }}>Limite</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid #E5E5E5", borderRadius: 8, padding: "6px 10px", background: "#FAFAFA", width: 140 }}>
                          <span style={{ fontSize: 12, color: "#525252", fontWeight: 500 }}>R$</span>
                          <input
                            name="limitAmount"
                            defaultValue={cat.limitAmount > 0 ? cat.limitAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
                            placeholder="0,00"
                            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", color: "#0A0A0A", width: "100%" }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={categoryLimitPending}
                          style={{
                            padding: "6px 12px", borderRadius: 8, background: "#0F8F4E", border: "none",
                            cursor: categoryLimitPending ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
                            color: "#FFFFFF", fontFamily: "inherit", whiteSpace: "nowrap",
                          }}
                        >
                          Salvar
                        </button>
                      </form>
                      <form action={deleteCategoryWithId}>
                        <button
                          type="submit"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 4,
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Excluir categoria"
                        >
                          <TrashCanIcon size={16} color="#A3A3A3" />
                        </button>
                      </form>
                    </div>
                  );
                })}

                {(family?.categories ?? []).length === 0 && (
                  <p style={{ fontSize: 14, color: "#A3A3A3", margin: "8px 0" }}>Nenhuma categoria cadastrada.</p>
                )}
                {categoryLimitState?.error && (
                  <p style={{ color: "#DC2626", fontSize: 13, margin: "4px 0 0" }}>{categoryLimitState.error}</p>
                )}
                {categoryLimitState?.success && (
                  <p style={{ color: "#0F8F4E", fontSize: 13, margin: "4px 0 0" }}>{categoryLimitState.success}</p>
                )}
              </div>

              <div style={dividerStyle} />

              {/* Create category */}
              <p style={sectionTitleStyle}>Criar nova categoria</p>
              <form action={categoryAction} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ ...inputStyle, width: 460 }}>
                  <input
                    name="categoryName"
                    style={inputTextStyle}
                    placeholder="Nome da categoria"
                  />
                </div>
                <button
                  type="submit"
                  disabled={categoryPending}
                  style={{
                    width: 160,
                    padding: "12px 16px",
                    borderRadius: 16,
                    background: "#1A3A2E",
                    border: "none",
                    cursor: categoryPending ? "not-allowed" : "pointer",
                    opacity: categoryPending ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    fontFamily: "var(--font-albert-sans), sans-serif",
                    flexShrink: 0,
                  }}
                >
                  Criar
                </button>
              </form>
              {categoryState?.error && (
                <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>{categoryState.error}</p>
              )}
              {categoryState?.success && (
                <p style={{ color: "#0F8F4E", fontSize: 13, margin: 0 }}>{categoryState.success}</p>
              )}
            </div>
          )}

          {/* ── CARTÕES ── */}
          {activeTab === "cards" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", height: 48 }}>
                <p style={sectionTitleStyle}>Cartões</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {(family?.cards ?? []).map((card) => {
                  const deleteCardWithId = deleteCard.bind(null, card.id);
                  return (
                    <div
                      key={card.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: 16,
                        border: "1px solid #F5F5F5",
                        borderRadius: 12,
                        height: 72,
                        boxSizing: "border-box",
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            background: "#F0FAF5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <CreditCardAltIcon size={16} color="#0F8F4E" />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>{card.name}</span>
                        </div>
                      </div>
                      <form action={deleteCardWithId}>
                        <button
                          type="submit"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 4,
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Excluir cartão"
                        >
                          <TrashCanIcon size={16} color="#A3A3A3" />
                        </button>
                      </form>
                    </div>
                  );
                })}

                {(family?.cards ?? []).length === 0 && (
                  <p style={{ fontSize: 14, color: "#A3A3A3", margin: "8px 0" }}>Nenhum cartão cadastrado.</p>
                )}
              </div>

              <div style={dividerStyle} />

              {/* Add card */}
              <p style={sectionTitleStyle}>Adicionar novo cartão</p>
              <form action={cardAction} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ ...inputStyle, width: 300 }}>
                  <input
                    name="cardName"
                    style={inputTextStyle}
                    placeholder="Nome do cartão"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cardPending}
                  style={{
                    width: 160,
                    padding: "12px 16px",
                    borderRadius: 16,
                    background: "#1A3A2E",
                    border: "none",
                    cursor: cardPending ? "not-allowed" : "pointer",
                    opacity: cardPending ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    fontFamily: "var(--font-albert-sans), sans-serif",
                    flexShrink: 0,
                  }}
                >
                  Criar
                </button>
              </form>
              {cardState?.error && (
                <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>{cardState.error}</p>
              )}
              {cardState?.success && (
                <p style={{ color: "#0F8F4E", fontSize: 13, margin: 0 }}>{cardState.success}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
