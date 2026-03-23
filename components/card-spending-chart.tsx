import { PaymentCardThumbnail } from "./payment-card-thumbnail";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type SpendByPaymentRow = {
  id: string;
  name: string;
  image: string | null;
  amount: number;
};

type Props = {
  rows: SpendByPaymentRow[];
};

const BAR_COLORS = ["#0C7341", "#1AAD63", "#99E83A", "#0F8F4E", "#1A3A2E", "#2D5A47"];

export function CardSpendingChart({ rows }: Props) {
  const positive = rows.filter((r) => r.amount > 0);
  const max = Math.max(...positive.map((r) => r.amount), 1);

  if (positive.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--color-fg-subtle)", fontWeight: 300, margin: 0 }}>
        Nenhum gasto com pagamento associado neste período.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {positive.map((r, i) => (
        <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
              <PaymentCardThumbnail imageUrl={r.image} name={r.name} width={60} />
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: "var(--color-fg-default)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1.4,
                }}
              >
                {r.name}
              </span>
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--color-bg-brand-strong)",
                flexShrink: 0,
                lineHeight: 1.4,
              }}
            >
              {formatBRL(r.amount)}
            </span>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 8,
              background: "var(--color-bg-subtle)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (r.amount / max) * 100)}%`,
                height: "100%",
                borderRadius: 8,
                background: BAR_COLORS[i % BAR_COLORS.length],
                transition: "width 0.35s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
