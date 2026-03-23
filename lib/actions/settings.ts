"use server";

import { getSession, deleteSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { parseClosingDayFromInput } from "@/lib/statement-cycle";

type ActionResult = { error?: string; success?: string } | null;

function validateCardImageDataUrl(s: string): boolean {
  if (s.length < 50 || s.length > 5_000_000) return false;
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(s)) return false;
  const b64 = s.split(",")[1] ?? "";
  const approxBytes = (b64.length * 3) / 4;
  return approxBytes <= 3 * 1024 * 1024;
}

export async function updateProfile(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const currentPassword = (formData.get("currentPassword") as string)?.trim();
  const newPassword = (formData.get("newPassword") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

  if (!firstName || !email) return { error: "Nome e e-mail são obrigatórios" };

  const fullName = lastName ? `${firstName} ${lastName}` : firstName;

  try {
    if (currentPassword) {
      const user = await db.user.findUnique({ where: { id: session.userId } });
      if (!user) return { error: "Usuário não encontrado" };

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) return { error: "Senha atual incorreta" };

      if (!newPassword) return { error: "Digite a nova senha" };
      if (newPassword !== confirmPassword) return { error: "As senhas não coincidem" };
      if (newPassword.length < 6) return { error: "A nova senha deve ter ao menos 6 caracteres" };

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.user.update({
        where: { id: session.userId },
        data: { name: fullName, email, password: hashedPassword },
      });
    } else {
      await db.user.update({
        where: { id: session.userId },
        data: { name: fullName, email },
      });
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Perfil atualizado com sucesso" };
  } catch {
    return { error: "Erro ao atualizar perfil" };
  }
}

export async function updateFamilyName(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const name = (formData.get("familyName") as string)?.trim();
  if (!name) return { error: "Nome da família é obrigatório" };

  try {
    const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!member) return { error: "Família não encontrada" };

    await db.family.update({ where: { id: member.familyId }, data: { name } });
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Nome da família atualizado" };
  } catch {
    return { error: "Erro ao atualizar família" };
  }
}

export async function updateFamilyBudget(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const raw = (formData.get("familyBudget") as string)?.trim();
  const budget = parseBudget(raw);
  if (budget < 0) return { error: "Orçamento inválido" };

  try {
    const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!member) return { error: "Família não encontrada" };

    await db.family.update({ where: { id: member.familyId }, data: { budget } });
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Orçamento da família atualizado" };
  } catch {
    return { error: "Erro ao atualizar orçamento" };
  }
}

export async function updateMemberBudget(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const memberId = (formData.get("memberId") as string)?.trim();
  if (!memberId) return { error: "Integrante não informado" };

  const budget = parseBudget((formData.get("memberBudget") as string) || "");
  if (budget < 0) return { error: "Orçamento inválido" };

  try {
    const myMember = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!myMember) return { error: "Família não encontrada" };

    const target = await db.familyMember.findFirst({
      where: { id: memberId, familyId: myMember.familyId },
    });
    if (!target) return { error: "Integrante não encontrado" };

    await db.familyMember.update({ where: { id: memberId }, data: { budget } });
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Orçamento do integrante atualizado" };
  } catch {
    return { error: "Erro ao atualizar orçamento" };
  }
}

function parseBudget(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? -1 : Math.round(n * 100) / 100;
}

export async function inviteMember(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const email = (formData.get("inviteEmail") as string)?.trim().toLowerCase();
  if (!email) return { error: "E-mail é obrigatório" };

  const budgetRaw = (formData.get("memberBudget") as string)?.trim();
  const budget = budgetRaw ? parseBudget(budgetRaw) : 0;
  if (budget < 0) return { error: "Orçamento do integrante inválido" };

  try {
    const myMember = await db.familyMember.findFirst({
      where: { userId: session.userId },
      include: { family: { select: { id: true, name: true } } },
    });
    if (!myMember) return { error: "Família não encontrada" };

    const userToInvite = await db.user.findUnique({ where: { email } });
    if (!userToInvite) return { error: "Usuário não encontrado na plataforma" };

    if (userToInvite.id === session.userId) return { error: "Você não pode convidar a si mesmo" };

    const existingMember = await db.familyMember.findFirst({
      where: { userId: userToInvite.id, familyId: myMember.familyId },
    });
    if (existingMember) return { error: "Usuário já é membro desta família" };

    const existingInvite = await db.familyInvite.findFirst({
      where: { familyId: myMember.familyId, inviteeId: userToInvite.id, status: "pending" },
    });
    if (existingInvite) return { error: "Convite já enviado para este usuário" };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await db.familyInvite.create({
      data: {
        familyId: myMember.familyId,
        inviterId: session.userId,
        inviteeId: userToInvite.id,
        budget,
        expiresAt,
      },
    });

    // Notificação in-app (não bloqueia o convite se falhar — ex.: tabela ausente no banco)
    try {
      await db.notification.create({
        data: {
          userId: userToInvite.id,
          type: "invite",
          title: `${session.user.name} te convidou para a família`,
          description: `Você recebeu um convite para entrar em "${myMember.family.name}".`,
          metadata: JSON.stringify({
            inviteId: invite.id,
            familyName: myMember.family.name,
            inviterName: session.user.name,
          }),
        },
      });
    } catch (notifyErr) {
      console.error("[inviteMember] convite criado, mas falha ao criar notificação:", notifyErr);
    }

    revalidatePath("/settings");
    return { success: `Convite enviado para ${userToInvite.name}` };
  } catch (e) {
    console.error("[inviteMember]", e);
    const hint = e instanceof Error ? e.message : String(e);
    const devDetail =
      process.env.NODE_ENV === "development"
        ? ` (${hint.slice(0, 280)})`
        : "";
    if (
      hint.includes("does not exist") ||
      hint.includes("Unknown table") ||
      hint.includes("Unknown arg") ||
      hint.includes("undefined (reading 'findFirst')") ||
      hint.includes("undefined (reading 'findMany')") ||
      hint.includes("undefined (reading 'create')")
    ) {
      return {
        error: `Banco ou Prisma Client desatualizado. Rode \`npx prisma generate\` e \`npx prisma db push\` (ou migrate) e reinicie o servidor.${devDetail}`,
      };
    }
    return { error: `Erro ao enviar convite.${devDetail}` };
  }
}

export async function acceptInvite(inviteId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  try {
    const invite = await db.familyInvite.findUnique({
      where: { id: inviteId },
      include: { family: { select: { id: true, name: true } }, inviter: { select: { id: true, name: true } } },
    });

    if (!invite) return { error: "Convite não encontrado" };
    if (invite.inviteeId !== session.userId) return { error: "Convite não é para você" };
    if (invite.status !== "pending") return { error: "Convite já foi respondido" };
    if (invite.expiresAt < new Date()) return { error: "Convite expirado" };

    // Check if already a member
    const existingMember = await db.familyMember.findFirst({
      where: { userId: session.userId, familyId: invite.familyId },
    });
    if (existingMember) {
      await db.familyInvite.update({ where: { id: inviteId }, data: { status: "accepted" } });
      return { success: "Você já era membro desta família" };
    }

    // If user has a solo self-family, remove them from it so they join the invited family
    const currentMembership = await db.familyMember.findFirst({
      where: { userId: session.userId },
      include: { family: { include: { members: true } } },
    });
    if (currentMembership && currentMembership.family.members.length === 1) {
      await db.family.delete({ where: { id: currentMembership.familyId } });
    }

    // Accept invite
    await db.familyInvite.update({ where: { id: inviteId }, data: { status: "accepted" } });
    await db.familyMember.create({
      data: {
        userId: session.userId,
        familyId: invite.familyId,
        role: "member",
        budget: invite.budget,
      },
    });

    // Mark the invite notification as read
    await db.notification.updateMany({
      where: { userId: session.userId, type: "invite", metadata: { contains: inviteId } },
      data: { read: true },
    });

    // Notify the inviter
    await db.notification.create({
      data: {
        userId: invite.inviterId,
        type: "invite_accepted",
        title: `${session.user.name} aceitou seu convite`,
        description: `${session.user.name} entrou em "${invite.family.name}".`,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");
    return { success: `Você entrou em "${invite.family.name}"` };
  } catch {
    return { error: "Erro ao aceitar convite" };
  }
}

export async function declineInvite(inviteId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  try {
    const invite = await db.familyInvite.findUnique({
      where: { id: inviteId },
      include: { family: { select: { name: true } }, inviter: { select: { id: true, name: true } } },
    });

    if (!invite) return { error: "Convite não encontrado" };
    if (invite.inviteeId !== session.userId) return { error: "Convite não é para você" };
    if (invite.status !== "pending") return { error: "Convite já foi respondido" };

    await db.familyInvite.update({ where: { id: inviteId }, data: { status: "declined" } });

    // Mark the invite notification as read
    await db.notification.updateMany({
      where: { userId: session.userId, type: "invite", metadata: { contains: inviteId } },
      data: { read: true },
    });

    // Notify the inviter
    await db.notification.create({
      data: {
        userId: invite.inviterId,
        type: "invite_declined",
        title: `${session.user.name} recusou seu convite`,
        description: `${session.user.name} não aceitou o convite para "${invite.family.name}".`,
      },
    });

    revalidatePath("/settings");
    return { success: "Convite recusado" };
  } catch {
    return { error: "Erro ao recusar convite" };
  }
}

export async function createCategory(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const name = (formData.get("categoryName") as string)?.trim();
  if (!name) return { error: "Nome da categoria é obrigatório" };

  try {
    const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!member) return { error: "Família não encontrada" };

    await db.category.create({ data: { name, familyId: member.familyId } });
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Categoria criada" };
  } catch {
    return { error: "Erro ao criar categoria" };
  }
}

export async function updateCategoryLimit(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const categoryId = (formData.get("categoryId") as string)?.trim();
  if (!categoryId) return { error: "Categoria não informada" };

  const raw = (formData.get("limitAmount") as string)?.trim();
  const limit = parseBudget(raw);
  if (limit < 0) return { error: "Limite inválido" };

  try {
    const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!member) return { error: "Família não encontrada" };

    const category = await db.category.findFirst({ where: { id: categoryId, familyId: member.familyId } });
    if (!category) return { error: "Categoria não encontrada" };

    await db.category.update({ where: { id: categoryId }, data: { limitAmount: limit } });
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Limite atualizado" };
  } catch {
    return { error: "Erro ao atualizar limite" };
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  try {
    await db.category.delete({ where: { id: categoryId } });
    revalidatePath("/settings");
    revalidatePath("/");
  } catch {
    // silent fail
  }
}

export async function createCard(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const name = (formData.get("cardName") as string)?.trim();
  if (!name) return { error: "Nome do pagamento é obrigatório" };

  const closingRaw = String(formData.get("closingDate") ?? "").trim();
  const statementClosingDay = closingRaw ? parseClosingDayFromInput(closingRaw) : null;
  if (closingRaw && statementClosingDay == null) return { error: "Data de fechamento inválida" };

  const rawImg = String(formData.get("cardImage") ?? "").trim();
  let image: string | null = null;
  if (rawImg) {
    if (!validateCardImageDataUrl(rawImg)) return { error: "Imagem inválida ou muito grande (máx. ~3 MB)" };
    image = rawImg;
  }

  try {
    const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!member) return { error: "Família não encontrada" };

    await db.card.create({
      data: { name, familyId: member.familyId, statementClosingDay, image },
    });
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Pagamento criado" };
  } catch {
    return { error: "Erro ao criar pagamento" };
  }
}

export async function updateCardImage(cardId: string, imageDataUrl: string | null): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  try {
    const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!member) return { error: "Família não encontrada" };

    const card = await db.card.findFirst({
      where: { id: cardId, familyId: member.familyId },
      select: { id: true },
    });
    if (!card) return { error: "Pagamento não encontrado" };

    if (imageDataUrl != null && imageDataUrl !== "") {
      if (!validateCardImageDataUrl(imageDataUrl)) {
        return { error: "Imagem inválida ou muito grande (máx. ~3 MB)" };
      }
      await db.card.update({ where: { id: cardId }, data: { image: imageDataUrl } });
    } else {
      await db.card.update({ where: { id: cardId }, data: { image: null } });
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Imagem do cartão atualizada" };
  } catch {
    return { error: "Erro ao salvar imagem" };
  }
}

export async function updateCardStatementClosing(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const cardId = (formData.get("cardId") as string)?.trim();
  if (!cardId) return { error: "Pagamento inválido" };

  const closingRaw = String(formData.get("closingDate") ?? "").trim();
  const statementClosingDay = closingRaw ? parseClosingDayFromInput(closingRaw) : null;
  if (closingRaw && statementClosingDay == null) return { error: "Data de fechamento inválida" };

  const dueRaw = String(formData.get("dueDayOffset") ?? "").trim();
  let dueDayOffset = 7;
  if (dueRaw !== "") {
    const n = parseInt(dueRaw, 10);
    if (!Number.isFinite(n) || n < 0 || n > 60) return { error: "Prazo de vencimento inválido (0–60 dias)" };
    dueDayOffset = n;
  }

  try {
    const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!member) return { error: "Família não encontrada" };

    const card = await db.card.findFirst({
      where: { id: cardId, familyId: member.familyId },
      select: { id: true },
    });
    if (!card) return { error: "Pagamento não encontrado" };

    await db.card.update({
      where: { id: cardId },
      data: { statementClosingDay, dueDayOffset },
    });
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Fechamento da fatura atualizado" };
  } catch {
    return { error: "Erro ao atualizar fechamento" };
  }
}

export async function deleteCard(cardId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  try {
    await db.card.delete({ where: { id: cardId } });
    revalidatePath("/settings");
    revalidatePath("/");
  } catch {
    // silent fail
  }
}

export async function uploadAvatar(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: "Nenhuma imagem selecionada" };
  if (file.size > 5 * 1024 * 1024) return { error: "Imagem muito grande (máx 5MB)" };

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) return { error: "Formato inválido. Use JPG, PNG ou WebP" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    await db.user.update({
      where: { id: session.userId },
      data: { avatar: base64 },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Foto atualizada com sucesso" };
  } catch {
    return { error: "Erro ao salvar imagem" };
  }
}

export async function removeFamilyMember(memberId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  try {
    const myMember = await db.familyMember.findFirst({
      where: { userId: session.userId },
      select: { id: true, familyId: true, role: true },
    });
    if (!myMember) return { error: "Família não encontrada" };

    if (myMember.role !== "owner" && myMember.role !== "admin") {
      return { error: "Apenas o dono ou administradores podem remover integrantes" };
    }
    if (myMember.id === memberId) return { error: "Você não pode remover a si mesmo" };

    const target = await db.familyMember.findFirst({
      where: { id: memberId, familyId: myMember.familyId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!target) return { error: "Integrante não encontrado" };

    await db.familyMember.delete({ where: { id: memberId } });

    // Notify the removed member
    const family = await db.family.findUnique({ where: { id: myMember.familyId }, select: { name: true } });
    await db.notification.create({
      data: {
        userId: target.user.id,
        type: "removed_from_family",
        title: "Você foi removido da família",
        description: `${session.user.name} removeu você de "${family?.name ?? "Família"}".`,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Integrante removido da família" };
  } catch {
    return { error: "Erro ao remover integrante" };
  }
}

export async function deleteAccount(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const userId = session.userId;

  try {
    const memberships = await db.familyMember.findMany({
      where: { userId },
      include: { family: { include: { members: true } } },
    });

    for (const m of memberships) {
      const isOnlyMember = m.family.members.length === 1;
      if (isOnlyMember) {
        await db.family.delete({ where: { id: m.familyId } });
      } else {
        await db.expense.deleteMany({ where: { responsibleId: userId, familyId: m.familyId } });
      }
    }

    await db.user.delete({ where: { id: userId } });
    await deleteSession();
  } catch {
    return { error: "Erro ao excluir conta. Tente novamente." };
  }

  redirect("/login");
}
