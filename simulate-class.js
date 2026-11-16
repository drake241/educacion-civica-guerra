#!/usr/bin/env node
/**
 * Simula una clase: entra N alumnos y vota cuando el profe abre votación.
 * Uso: ROOM_CODE=AB12C node scripts/simulate-class.js
 * El proyector debe mostrar el mismo código.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = (process.env.CIVICA_BASE_URL || "https://drake241.github.io/educacion-civica-guerra/").replace(
  /\/?$/,
  "/"
);
const CODE = process.env.ROOM_CODE;
const N = Number(process.env.SIM_STUDENTS || 15);

if (!CODE) {
  console.error("Falta ROOM_CODE=XXXXX");
  process.exit(1);
}

(async () => {
  const joinUrl = new URL(`join.html?room=${CODE}`, BASE).href;
  const browser = await chromium.launch({ headless: true });
  const pages = [];

  for (let i = 1; i <= N; i++) {
    const country = i % 2 === 1 ? "valmira" : "cerroAzul";
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem("__sim")) return;
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem("__sim", "1");
    });
    const p = await ctx.newPage();
    await p.goto(joinUrl);
    await p.locator("#code").fill(CODE);
    await p.locator(country === "valmira" ? "#pickValmira" : "#pickCerro").click();
    await p.locator("#nick").fill(`E${i}-${Date.now().toString(36).slice(-4)}`);
    await Promise.all([p.waitForURL(/jugar/), p.locator("#joinBtn").click()]);
    await p.getByText(/Tu rol:/).waitFor({ timeout: 60_000 });
    pages.push({ p, ctx, country });
  }
  console.log(`Listos: ${pages.length} alumnos en ${CODE}. Dejá este proceso corriendo y abrí votación en el proyector.`);

  const voteOnce = async (p, country) => {
    if (country === "valmira") {
      const btn = p.locator(".vote-opt").first();
      if (await btn.isVisible().catch(() => false)) await btn.click();
    } else if (await p.locator("#vYes").isVisible().catch(() => false)) {
      await p.locator("#vYes").click();
    } else if (await p.locator(".vote-opt").first().isVisible().catch(() => false)) {
      await p.locator(".vote-opt").first().click();
    }
  };

  for (;;) {
    for (const { p, country } of pages) {
      await voteOnce(p, country).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
})();