import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

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
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      <main
        className="dashboard-main"
        style={{
          flex: 1,
          padding: "var(--space-24) var(--space-24) var(--space-16) 0",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          className="dashboard-layout-inner"
          style={{
            background: "var(--color-bg-subtle)",
            borderRadius: "var(--radius-4xl)",
            padding: "var(--space-32) var(--space-24) var(--space-24)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
