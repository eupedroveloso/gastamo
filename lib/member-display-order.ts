/**
 * Ordem de exibição de orçamentos / integrantes:
 * 1. Dono (owner)
 * 2. Administradores (admin)
 * 3. Participantes (member e demais papéis)
 *
 * Desempate: nome (pt-BR).
 */

const ROLE_ORDER: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

export type MemberSortable = {
  role: string;
  user: { name: string };
};

export function compareMembersByRoleThenName(a: MemberSortable, b: MemberSortable): number {
  const ra = ROLE_ORDER[a.role] ?? 50;
  const rb = ROLE_ORDER[b.role] ?? 50;
  if (ra !== rb) return ra - rb;
  return a.user.name.localeCompare(b.user.name, "pt-BR", { sensitivity: "base" });
}

/** Cópia ordenada (não muta o array original). */
export function sortMembersForBudgetDisplay<T extends MemberSortable>(members: T[]): T[] {
  return [...members].sort(compareMembersByRoleThenName);
}
