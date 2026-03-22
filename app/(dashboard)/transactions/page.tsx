import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTransactionsData } from "@/lib/actions/expenses";
import { TransactionsClient } from "@/components/transactions-client";

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/api/auth/signout-expired");

  const data = await getTransactionsData();
  if (!data) redirect("/api/auth/signout-expired");

  return (
    <TransactionsClient
      expenses={data.expenses}
      categories={data.categories}
      cards={data.cards}
      members={data.members}
    />
  );
}
