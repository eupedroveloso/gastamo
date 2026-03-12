"use server";

import { getSession, deleteSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

type ActionResult = { error?: string; success?: string } | null;

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
    const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!member) return { error: "Família não encontrada" };

    const userToInvite = await db.user.findUnique({ where: { email } });
    if (!userToInvite) return { error: "Usuário não encontrado na plataforma" };

    const existing = await db.familyMember.findFirst({
      where: { userId: userToInvite.id, familyId: member.familyId },
    });
    if (existing) return { error: "Usuário já é membro desta família" };

    await db.familyMember.create({
      data: { userId: userToInvite.id, familyId: member.familyId, role: "member", budget },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: `${userToInvite.name} foi adicionado à família` };
  } catch {
    return { error: "Erro ao convidar integrante" };
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
  if (!name) return { error: "Nome do cartão é obrigatório" };

  try {
    const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
    if (!member) return { error: "Família não encontrada" };

    await db.card.create({ data: { name, familyId: member.familyId } });
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: "Cartão criado" };
  } catch {
    return { error: "Erro ao criar cartão" };
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
