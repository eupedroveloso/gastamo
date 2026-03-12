export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        gap: 8,
        minHeight: 0,
        margin: "-24px",
        padding: "24px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 268,
          flexShrink: 0,
          background: "#FFFFFF",
          borderRadius: 24,
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          flex: 1,
          background: "#F5F5F5",
          borderRadius: "24px 0px 0px 24px",
          animation: "pulse 1.5s ease-in-out infinite",
          animationDelay: "0.15s",
        }}
      />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}
