import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

// 外部依存をモック — 実際のDB/OpenAI呼び出しを防ぐ
vi.mock("@/lib/orchestrator", () => ({
  orchestrate: vi.fn().mockResolvedValue({
    answer: "テスト回答",
    searchModes: ["sql"],
    sources: [],
    chunks: [],
  }),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/chat", () => {
  it("正常なメッセージで 200 を返す", async () => {
    const res = await POST(makeRequest({ message: "テスト質問" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toBe("テスト回答");
    expect(data.searchModes).toContain("sql");
  });

  it("message なしで 400 を返す", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("message が空文字で 400 を返す", async () => {
    const res = await POST(makeRequest({ message: "" }));
    expect(res.status).toBe(400);
  });

  it("message が数値型で 400 を返す", async () => {
    const res = await POST(makeRequest({ message: 123 }));
    expect(res.status).toBe(400);
  });

  it("2000文字超えのメッセージで 400 を返す", async () => {
    const res = await POST(makeRequest({ message: "a".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("2000文字ちょうどのメッセージで 200 を返す", async () => {
    const res = await POST(makeRequest({ message: "a".repeat(2000) }));
    expect(res.status).toBe(200);
  });

  it("history が配列でない場合は空配列として扱う", async () => {
    const { orchestrate } = await import("@/lib/orchestrator");
    const res = await POST(makeRequest({ message: "質問", history: "invalid" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(orchestrate)).toHaveBeenCalledWith("質問", []);
  });

  it("history の不正な要素は除外される", async () => {
    const { orchestrate } = await import("@/lib/orchestrator");
    const history = [
      { role: "user", content: "前の質問" },
      { role: "invalid-role", content: "不正" }, // 除外される
      { role: "assistant", content: "前の回答" },
      null, // 除外される
    ];
    const res = await POST(makeRequest({ message: "質問", history }));
    expect(res.status).toBe(200);
    const call = vi.mocked(orchestrate).mock.calls.at(-1)!;
    expect(call[1]).toHaveLength(2); // valid な2件だけ
  });
});
