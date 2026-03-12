export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          height: 56,
          background: "var(--color-bg-default)",
          border: "1px solid var(--color-border-muted)",
          borderRadius: "24px",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 500,
          background: "var(--color-bg-default)",
          border: "1px solid var(--color-border-muted)",
          borderRadius: "24px",
          animation: "pulse 1.5s ease-in-out infinite",
          animationDelay: "0.1s",
        }}
      />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}
