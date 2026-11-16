import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const TEACHER_PIN = process.env.CIVICA_TEACHER_PIN || "4125";

/** Limpia storage una sola vez por contexto (no en cada navegación a jugar.html). */
async function freshContext(browser: import("@playwright/test").Browser) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const key = "__civica_e2e_storage_cleared";
    if (sessionStorage.getItem(key)) return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem(key, "1");
  });
  return context;
}

async function loginTeacher(page: Page) {
  await page.goto("proyector.html");
  await page.locator("#pin").fill(TEACHER_PIN);
  await page.locator("#pinBtn").click();
  await expect(page.locator("#main")).not.toHaveClass(/hidden/);
  await expect(page.locator("#roomCode")).not.toHaveText("—", { timeout: 30_000 });
}

async function roomCode(page: Page) {
  const code = (await page.locator("#roomCode").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-Z0-9]{5}$/);
  return code;
}

async function joinStudent(
  context: BrowserContext,
  code: string,
  nick: string,
  country: "valmira" | "cerroAzul"
) {
  const page = await context.newPage();
  await page.goto(`join.html?room=${encodeURIComponent(code)}`);
  await page.locator("#code").fill(code);
  const pick = country === "valmira" ? page.locator("#pickValmira") : page.locator("#pickCerro");
  await pick.click();
  await expect(page.locator("#joinBtn")).toBeEnabled({ timeout: 5_000 });
  await page.locator("#nick").fill(nick);
  await Promise.all([
    page.waitForURL(/jugar\.html/, { timeout: 45_000 }),
    page.locator("#joinBtn").click(),
  ]);
  await expect(page.getByText(/Tu rol:/)).toBeVisible({ timeout: 45_000 });
  return page;
}

test.describe("multijugador: profe + alumnos", () => {
  test("sala, join dos países, iniciar guerra y realtime", async ({ browser }) => {
    const teacherCtx = await browser.newContext();
    await teacherCtx.addInitScript(() => {
      if (!sessionStorage.getItem("__civica_e2e_teacher")) {
        sessionStorage.clear();
        sessionStorage.setItem("__civica_e2e_teacher", "1");
      }
    });
    const teacher = await teacherCtx.newPage();

    await loginTeacher(teacher);
    const code = await roomCode(teacher);

    const valmiraCtx = await freshContext(browser);
    const cerroCtx = await freshContext(browser);
    const alumnoV = await joinStudent(valmiraCtx, code, "E2E Valmira", "valmira");
    const alumnoC = await joinStudent(cerroCtx, code, "E2E Cerro", "cerroAzul");

    await expect(alumnoV.getByText(/Tu rol:/)).toBeVisible();
    await expect(alumnoC.getByText(/Tu rol:/)).toBeVisible();
    await expect(alumnoV.getByText(/Esperá a que el profesor|empiece/i)).toBeVisible();
    await expect(alumnoC.getByText(/Esperá a que el profesor|empiece/i)).toBeVisible();

    await Promise.all([
      teacher.waitForResponse((r) => r.url().includes("teacher_start_war")),
      teacher.locator("#startWar").click(),
    ]);
    await expect(teacher.locator("#crisisBox")).toContainText(/Empieza la guerra/, { timeout: 20_000 });

    for (const p of [alumnoV, alumnoC]) {
      await p.reload();
      await p.waitForLoadState("networkidle");
      await expect(p.getByRole("heading", { name: /Empieza la guerra/ })).toBeVisible({
        timeout: 30_000,
      });
    }

    const discussBtn = teacher.getByRole("button", { name: /Abrir discusión/i });
    await expect(discussBtn).toBeVisible({ timeout: 15_000 });
    await Promise.all([
      teacher.waitForResponse((r) => r.url().includes("teacher_set_subphase")),
      discussBtn.click(),
    ]);
    await expect(
      alumnoV.getByRole("heading", { name: /Soldados en la frontera/ })
    ).toBeVisible({ timeout: 40_000 });

    await teacherCtx.close();
    await valmiraCtx.close();
    await cerroCtx.close();
  });
});