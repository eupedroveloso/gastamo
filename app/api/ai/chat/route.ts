import { NextRequest, NextResponse } from "next/server";
import { AI_ENABLED } from "@/lib/config";
import { buildFinancialContext } from "@/lib/ai/financial-context";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { AI_TOOLS, ExtendedChatMessage, getToolStatusMessage } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-executor";
import { getSession } from "@/lib/auth";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOOL_ITERATIONS = 5;

function openRouterHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://gastamo.app",
    "X-Title": process.env.OPENROUTER_APP_NAME ?? "Gastamo",
  };
}

function baseBody(messages: ExtendedChatMessage[], stream: boolean, includeTools: boolean) {
  return {
    model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001",
    messages,
    temperature: 0.6,
    max_tokens: 2000,
    stream,
    ...(includeTools ? { tools: AI_TOOLS, tool_choice: "auto" } : {}),
  };
}

/** Non-streaming call — returns the first choice message. */
async function callNonStreaming(messages: ExtendedChatMessage[], includeTools: boolean) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(baseBody(messages, false, includeTools)),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message as {
    role: string;
    content: string | null;
    tool_calls?: {
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }[];
  };
}

/** Streaming call — returns the raw Response for forwarding. */
async function callStreaming(messages: ExtendedChatMessage[]): Promise<Response> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(baseBody(messages, true, false)),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter stream ${res.status}: ${text}`);
  }

  return res;
}

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json({ error: "IA não habilitada" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const userMessages: { role: "user" | "assistant"; content: string }[] =
      body.messages ?? [];

    if (!userMessages.length) {
      return NextResponse.json({ error: "Mensagens ausentes" }, { status: 400 });
    }

    const [ctx, session] = await Promise.all([
      buildFinancialContext(),
      getSession(),
    ]);

    if (!ctx || !session) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const systemPrompt = buildSystemPrompt(ctx);
    const toolCtx = {
      familyId: ctx.familyId,
      userId: session.userId,
    };

    const enc = new TextEncoder();

    function sseChunk(controller: ReadableStreamDefaultController, content: string) {
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ content })}\n\n`));
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messages: ExtendedChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...userMessages,
          ];

          for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const isLastIteration = i === MAX_TOOL_ITERATIONS - 1;

            const msg = await callNonStreaming(messages, !isLastIteration);

            // No tool calls — stream final response
            if (!msg.tool_calls?.length) {
              const finalMessages: ExtendedChatMessage[] = [
                ...messages,
                { role: "assistant", content: msg.content },
              ];

              // If this is a fresh response (not after tool calls), stream it
              // Otherwise send the content directly for snappier response
              const hasToolHistory = messages.some((m) => m.role === "tool");

              if (!hasToolHistory) {
                // Re-fetch as streaming for natural feel
                const streamRes = await callStreaming(messages);
                await forwardStream(streamRes, controller, enc);
              } else {
                // Already have the content — send it immediately
                if (msg.content) sseChunk(controller, msg.content);
                controller.enqueue(enc.encode("data: [DONE]\n\n"));
              }

              controller.close();
              return;
            }

            // Add assistant message with tool calls
            messages.push({
              role: "assistant",
              content: msg.content ?? null,
              tool_calls: msg.tool_calls,
            });

            // Execute each tool call
            for (const tc of msg.tool_calls) {
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(tc.function.arguments);
              } catch {
                // keep empty args
              }

              const statusMsg = getToolStatusMessage(tc.function.name, args);
              sseChunk(controller, statusMsg + "\n");

              const result = await executeTool(tc.function.name, args, toolCtx);

              messages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: result,
              });
            }
          }

          // Fallback if loop exhausted
          sseChunk(controller, "Limite de iterações atingido. Por favor, tente uma pergunta mais simples.");
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          console.error("[AI chat] stream error:", e);
          const errMsg =
            "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.";
          sseChunk(controller, errMsg);
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
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

async function forwardStream(
  res: Response,
  controller: ReadableStreamDefaultController,
  enc: TextEncoder
) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        continue;
      }
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content ?? "";
        if (content) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content })}\n\n`));
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
}
