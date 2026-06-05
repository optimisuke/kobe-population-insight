import { NextRequest, NextResponse } from "next/server";
import { orchestrate, type HistoryMessage } from "@/lib/orchestrator";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 20;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, history } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }

  // history をサニタイズ: 型・長さ・件数を検証
  const safeHistory: HistoryMessage[] = Array.isArray(history)
    ? history
        .slice(-MAX_HISTORY_ITEMS)
        .filter(
          (m): m is HistoryMessage =>
            m !== null &&
            typeof m === "object" &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.length <= MAX_MESSAGE_LENGTH
        )
    : [];

  try {
    const result = await orchestrate(message, safeHistory);
    return NextResponse.json(result);
  } catch (err) {
    console.error("orchestrate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
