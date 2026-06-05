import { test, expect } from "@playwright/test";

test.describe("Chat UI (mock mode)", () => {
  test("ページが正常に表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("神戸市 人口インサイト")).toBeVisible();
    await expect(page.getByText("KOBE CITY")).toBeVisible();
    await expect(
      page.getByPlaceholder("神戸市の人口について質問してください...")
    ).toBeVisible();
  });

  test("質問例ボタンをクリックするとモック回答が返る", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "神戸市はどの年代が流出している？" })
      .click();
    await expect(page.getByText("モックデータ")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("テキスト入力して送信するとモック回答が返る", async ({ page }) => {
    await page.goto("/");
    await page
      .getByPlaceholder("神戸市の人口について質問してください...")
      .fill("人口の将来推計を教えて");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("モックデータ")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("政策質問でアコーディオンに検索詳細が表示される", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "神戸市は人口減少をどう捉えている？" })
      .click();
    await expect(page.getByText("モックデータ")).toBeVisible({
      timeout: 10_000,
    });
    // アコーディオンを開く
    await page.getByText("検索詳細").click();
    await expect(page.getByText("RETRIEVED CHUNKS")).toBeVisible();
  });

  test("送信ボタンは空入力時に無効になっている", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "送信" })).toBeDisabled();
    await page
      .getByPlaceholder("神戸市の人口について質問してください...")
      .fill("質問");
    await expect(page.getByRole("button", { name: "送信" })).toBeEnabled();
  });

  test("連続質問で会話が積み上がる", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "神戸市はどの年代が流出している？" })
      .click();
    await expect(page.getByText("モックデータ")).toBeVisible({
      timeout: 10_000,
    });
    await page
      .getByRole("button", { name: "人口は今後どうなる？" })
      .click();
    // 2つ目の回答が来ること
    await expect(page.getByText("モックデータ").nth(1)).toBeVisible({
      timeout: 10_000,
    });
  });
});
