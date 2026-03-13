"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/auth";

export type AuthState = { error: string } | null;

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Preencha todos os campos" };
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return { error: "Email ou senha incorretos" };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { error: "Email ou senha incorretos" };
    }

    await createSession(user.id);
  } catch {
    return { error: "Erro ao conectar com o servidor. Tente novamente." };
  }

  redirect("/");
}

export async function register(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Preencha todos os campos" };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres" };
  }

  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "Email já cadastrado" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: { name, email, password: hashedPassword },
    });

    await db.family.create({
      data: {
        name: `Família de ${name}`,
        members: {
          create: { userId: user.id, role: "owner" },
        },
      },
    });

    await createSession(user.id);
  } catch {
    return { error: "Erro ao criar conta. Tente novamente." };
  }

  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
