import { AI_ENABLED } from "@/lib/config";
import { AIChat } from "@/components/ai-chat";
import { MicrochipAiIcon } from "@/components/icons";

export default function AIPage() {
  if (!AI_ENABLED) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 12,
        }}
      >
        <MicrochipAiIcon size={40} color="var(--color-fg-subtle)" />
        <p style={{ fontSize: 14, color: "var(--color-fg-muted)" }}>
          Assistente de IA — em breve
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        margin: "-24px",
        padding: "24px",
        overflow: "hidden",
      }}
    >
      <AIChat />
    </div>
  );
}
