import { describe, it, expect, afterEach } from "vitest";
import { mockOrchestrate, isMockMode } from "../mock";

describe("mockOrchestrate", () => {
  it("転出キーワードで SQL モードを返す", () => {
    const result = mockOrchestrate("神戸市はどの年代が転出している？");
    expect(result.searchModes).toContain("sql");
    expect(result.answer).toContain("転出");
  });

  it("流出キーワードで SQL モードを返す", () => {
    const result = mockOrchestrate("若者の流出状況は？");
    expect(result.searchModes).toContain("sql");
  });

  it("将来キーワードで SQL モードを返す", () => {
    const result = mockOrchestrate("人口は今後どうなる？");
    expect(result.searchModes).toContain("sql");
    expect(result.answer).toContain("推計");
  });

  it("政策キーワードで FTS/Vector モードを返す", () => {
    const result = mockOrchestrate("神戸市の政策は？");
    expect(result.searchModes).toContain("fts");
    expect(result.searchModes).toContain("vector");
  });

  it("ビジョンキーワードで参照文書が含まれる", () => {
    const result = mockOrchestrate("人口ビジョンの内容は？");
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("未知の質問でデフォルト回答を返す", () => {
    const result = mockOrchestrate("全然関係のない質問");
    expect(result.answer).toBeTruthy();
    expect(result.searchModes.length).toBeGreaterThan(0);
  });

  it("回答には必ず answer, searchModes, sources が含まれる", () => {
    for (const q of ["転入", "施策", "将来推計", "人口ビジョン", "その他"]) {
      const r = mockOrchestrate(q);
      expect(r).toHaveProperty("answer");
      expect(r).toHaveProperty("searchModes");
      expect(r).toHaveProperty("sources");
    }
  });
});

describe("isMockMode", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env.TIDB_HOST = saved.TIDB_HOST;
    process.env.OPENAI_API_KEY = saved.OPENAI_API_KEY;
  });

  it("TIDB_HOST が未設定なら true", () => {
    delete process.env.TIDB_HOST;
    process.env.OPENAI_API_KEY = "key";
    expect(isMockMode()).toBe(true);
  });

  it("OPENAI_API_KEY が未設定なら true", () => {
    process.env.TIDB_HOST = "host";
    delete process.env.OPENAI_API_KEY;
    expect(isMockMode()).toBe(true);
  });

  it("両方設定済みなら false", () => {
    process.env.TIDB_HOST = "host";
    process.env.OPENAI_API_KEY = "key";
    expect(isMockMode()).toBe(false);
  });
});
