"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidateExpenseSurfaces() {
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

export async function createCategoryQuick(
  rawName: string
): Promise<{ id: string; name: string } | { error: string }> {
  const name = rawName.trim();
  if (!name) return { error: "Nome da categoria é obrigatório" };

  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
  if (!member) return { error: "Família não encontrada" };

  try {
    const cat = await db.category.create({
      data: { name, familyId: member.familyId },
      select: { id: true, name: true },
    });
    revalidateExpenseSurfaces();
    return { id: cat.id, name: cat.name };
  } catch {
    return { error: "Erro ao criar categoria" };
  }
}

export async function createCardQuick(
  rawName: string
): Promise<{ id: string; name: string } | { error: string }> {
  const name = rawName.trim();
  if (!name) return { error: "Nome do pagamento é obrigatório" };

  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  const member = await db.familyMember.findFirst({ where: { userId: session.userId } });
  if (!member) return { error: "Família não encontrada" };

  try {
    const card = await db.card.create({
      data: { name, familyId: member.familyId },
      select: { id: true, name: true },
    });
    revalidateExpenseSurfaces();
    return { id: card.id, name: card.name };
  } catch {
    return { error: "Erro ao criar pagamento" };
  }
}
