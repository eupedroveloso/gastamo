import { MicrochipAiIcon } from "@/components/icons";
import { AI_ENABLED } from "@/lib/config";

export default function AIPage() {
  if (!AI_ENABLED) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 12,
        }}
      >
        <MicrochipAiIcon size={40} color="var(--color-fg-subtle)" />
        <p
          style={{
            fontSize: 14,
            color: "var(--color-fg-muted)",
          }}
        >
          Assistente de IA — em breve
        </p>
      </div>
    );
  }

  return null;
}
