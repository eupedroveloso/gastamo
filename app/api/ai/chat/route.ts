import { NextRequest, NextResponse } from "next/server";
import { AI_ENABLED } from "@/lib/config";
import { buildFinancialContext } from "@/lib/ai/financial-context";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { ChatMessage } from "@/lib/ai/openrouter-client";

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json({ error: "IA não habilitada" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const messages: ChatMessage[] = body.messages ?? [];

    if (!messages.length) {
      return NextResponse.json({ error: "Mensagens ausentes" }, { status: 400 });
    }

    const ctx = await buildFinancialContext();
    if (!ctx) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const systemPrompt = buildSystemPrompt(ctx);

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://gastamo.app",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "Gastamo",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001",
        messages: fullMessages,
        temperature: 0.6,
        max_tokens: 1500,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[AI chat]", res.status, errText);
      return NextResponse.json({ error: "Erro na API de IA" }, { status: 500 });
    }

    // Forward the SSE stream directly to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content ?? "";
                if (content) {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[AI chat]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
