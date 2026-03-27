import { DASHBOARD_BOTTOM_ROW, DASHBOARD_GRID_DEFAULT_LAYOUT } from "@/lib/dashboard-layout-grid";

const skCard = {
  background: "var(--color-bg-default)",
  border: "1px solid var(--color-border-muted)",
  borderRadius: "var(--radius-4xl)",
  boxSizing: "border-box" as const,
  animation: "ds-skeleton-pulse 1.5s ease-in-out infinite",
};

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-12)",
        flex: 1,
        minHeight: 0,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-12)",
          padding: "0 var(--space-16) var(--space-16)",
          borderRadius: "var(--radius-3xl)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-16)",
            flexWrap: "wrap",
            rowGap: 12,
            width: "100%",
          }}
        >
          <div
            style={{
              ...skCard,
              height: 40,
              width: "min(100%, 280px)",
              borderRadius: "var(--radius-lg)",
              animationDelay: "0s",
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-end" }}>
            <div style={{ ...skCard, height: 44, width: 220, borderRadius: "var(--radius-2xl)", animationDelay: "0.08s" }} />
            <div style={{ ...skCard, height: 44, width: 128, borderRadius: "var(--radius-2xl)", animationDelay: "0.16s" }} />
          </div>
        </div>
      </div>

      <div
        className="dashboard-widgets-grid"
        style={{
          padding: "0 var(--space-16) var(--space-24)",
          flex: 1,
          minHeight: 0,
        }}
      >
        {DASHBOARD_GRID_DEFAULT_LAYOUT.map((item, i) => {
          const { id, x, y, w, h } = item;
          return (
            <div
              key={id}
              className="dashboard-widget-slot"
              style={{
                gridColumn: `${x + 1} / ${x + w + 1}`,
                gridRow: `${y + 1} / ${y + h + 1}`,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  ...skCard,
                  flex: 1,
                  minHeight: id === "budget_column" ? 320 : 240,
                  animationDelay: `${0.1 + i * 0.07}s`,
                }}
              />
            </div>
          );
        })}
        <div
          className="dashboard-widget-slot dashboard-bottom-row"
          style={{
            gridColumn: `${DASHBOARD_BOTTOM_ROW.x + 1} / ${DASHBOARD_BOTTOM_ROW.x + DASHBOARD_BOTTOM_ROW.w + 1}`,
            gridRow: `${DASHBOARD_BOTTOM_ROW.y + 1} / ${DASHBOARD_BOTTOM_ROW.y + DASHBOARD_BOTTOM_ROW.h + 1}`,
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            gap: "var(--space-16)",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {DASHBOARD_BOTTOM_ROW.ids.map((id, j) => (
            <div
              key={id}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  ...skCard,
                  flex: 1,
                  minHeight: 200,
                  animationDelay: `${0.24 + j * 0.07}s`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ds-skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
