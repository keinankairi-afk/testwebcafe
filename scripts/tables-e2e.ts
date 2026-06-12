import { chromium, type Page } from "playwright";

const URL = process.env.APP_URL || "http://localhost:4173";

async function saveSettings(page: Page) {
  await page.locator("button:has-text('Simpan Pengaturan')").click();
  await page.waitForSelector("text=Pengaturan disimpan", { timeout: 15000 });
  // toast disappears; small settle
  await page.waitForTimeout(800);
}

async function getCount(page: Page): Promise<number> {
  const txt = await page
    .locator("button[aria-label='Kurangi meja'] + span")
    .innerText();
  return Number(txt.trim());
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  console.log("1. Login admin...");
  await page.goto(`${URL}/login`, { waitUntil: "networkidle" });
  await page.locator("input[name='email']").fill("husin1");
  await page.locator("input[name='password']").fill("Watuagung1");
  await page.locator("button[type='submit']").click();
  await page.waitForURL("**/admin", { timeout: 20000 });
  await page.waitForSelector("text=Jumlah Meja", { timeout: 15000 });
  const original = await getCount(page);
  console.log(`   OK, jumlah meja sekarang: ${original}`);

  console.log("2. Tambah 1 meja & simpan...");
  await page.locator("button[aria-label='Tambah meja']").click();
  await saveSettings(page);
  const increased = original + 1;
  console.log(`   OK: jadi ${increased}`);

  console.log("3. Checkout pelanggan: opsi meja sesuai...");
  await page.goto(`${URL}/`, { waitUntil: "networkidle" });
  await page.locator("article button:has-text('Order')").first().click();
  await page.locator("button:has-text('item di keranjang')").click();
  await page.locator("button:has-text('Lanjut ke Checkout')").click();
  await page.waitForSelector("text=Data Pemesan", { timeout: 10000 });
  const options = page.locator("select[aria-label='Nomor meja'] option");
  const n = (await options.count()) - 1; // minus placeholder
  if (n !== increased)
    throw new Error(`Expected ${increased} options, got ${n}`);
  const lastLabel = await options.last().innerText();
  if (!lastLabel.includes(`Meja ${increased}`))
    throw new Error(`Last option: ${lastLabel}`);
  console.log(`   OK: ${n} pilihan, terakhir "${lastLabel.trim()}"`);
  await page.screenshot({ path: "tmp/e2e-tables.png" });

  console.log("4. Kurangi kembali ke semula...");
  await page.goto(`${URL}/admin`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Jumlah Meja", { timeout: 15000 });
  await page.locator("button[aria-label='Kurangi meja']").click();
  await saveSettings(page);
  const restored = await getCount(page);
  if (restored !== original) throw new Error(`Restore failed: ${restored}`);
  console.log(`   OK: kembali ke ${original}`);

  console.log("\nTABLES E2E PASSED");
} catch (e) {
  await page.screenshot({ path: "tmp/tables-e2e-error.png" });
  console.error("FAILED:", e);
  process.exit(1);
} finally {
  await browser.close();
}
