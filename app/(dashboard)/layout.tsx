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
        minHeight: "100vh",
        margin: 0,
        background: "var(--color-bg-inverse)",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: "var(--space-16) var(--space-24) var(--space-16) 0",
        }}
      >
        <div
          style={{
            background: "var(--color-bg-subtle)",
            borderRadius: "var(--radius-4xl)",
            padding: "var(--space-24)",
            minHeight: "calc(100vh - 32px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
