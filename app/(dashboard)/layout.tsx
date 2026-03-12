import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100vh",
        margin: 0,
        background: "var(--color-bg-inverse)",
        overflow: "hidden",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: "var(--space-16) var(--space-24) var(--space-16) 0",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        <div
          style={{
            background: "var(--color-bg-subtle)",
            borderRadius: "var(--radius-4xl)",
            padding: "var(--space-24)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "calc(100vh - 32px)",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
