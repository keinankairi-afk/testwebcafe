import { chromium } from "playwright";

const URL = process.env.APP_URL || "http://localhost:4173";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  console.log("1. Login pakai username husin1...");
  await page.goto(`${URL}/login`, { waitUntil: "networkidle" });
  await page.locator("input[name='email']").fill("husin1");
  await page.locator("input[name='password']").fill("Watuagung1");
  await page.locator("button[type='submit']").click();
  await page.waitForURL("**/admin", { timeout: 20000 });
  await page.waitForSelector("text=Pengaturan Cafe", { timeout: 15000 });
  console.log("   OK: masuk dashboard admin");

  const testName = `Kafe Husin ${Date.now() % 1000}`;
  const testSlogan = `Rumah Makan ${Date.now() % 1000}`;
  const testHero = `Mau makan apa ${Date.now() % 1000}?`;
  console.log("2. Ganti nama cafe + warna...");
  const nameInput = page.locator("input[placeholder='Nama cafe']");
  await nameInput.fill(testName);
  await page.locator("input[aria-label='Slogan']").fill(testSlogan);
  await page.locator("input[aria-label='Tulisan Sambutan']").fill(testHero);
  await page.locator("button[aria-label='Warna Hijau']").click();
  await page.locator("button:has-text('Simpan Pengaturan')").click();
  await page.waitForSelector("text=Pengaturan disimpan", { timeout: 10000 });
  await page.waitForSelector(`header >> text=${testName}`, { timeout: 10000 });
  const theme = await page.evaluate(
    () => document.documentElement.dataset.cafeTheme,
  );
  if (theme !== "hijau") throw new Error(`theme attr = ${theme}`);
  console.log("   OK: nama & warna berubah (hijau)");
  await page.screenshot({ path: "tmp/e2e-settings-green.png" });

  console.log("3. Cek halaman menu pelanggan ikut berubah...");
  await page.goto(`${URL}/`, { waitUntil: "networkidle" });
  await page.waitForSelector(`header >> text=${testName}`, { timeout: 15000 });
  await page.waitForSelector(`header >> text=${testSlogan}`, {
    timeout: 10000,
  });
  await page.waitForSelector(`h1:has-text("${testHero}")`, { timeout: 10000 });
  console.log("   OK: menu menampilkan nama & slogan baru");

  console.log("4. Kembalikan ke Sibabu Cafe / kopi...");
  await page.goto(`${URL}/admin`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Pengaturan Cafe", { timeout: 15000 });
  await page.locator("input[placeholder='Nama cafe']").fill("Sibabu Cafe");
  await page.locator("input[aria-label='Slogan']").fill("Menu & Order");
  await page
    .locator("input[aria-label='Tulisan Sambutan']")
    .fill("Mau ngopi apa hari ini? ☕");
  await page.locator("button[aria-label='Warna Kopi']").click();
  await page.locator("button:has-text('Simpan Pengaturan')").click();
  await page.waitForSelector("text=Pengaturan disimpan", { timeout: 10000 });
  console.log("   OK: direset");

  console.log("\nADMIN LOGIN + SETTINGS E2E PASSED");
} catch (e) {
  await page.screenshot({ path: "tmp/admin-e2e-error.png" });
  console.error("FAILED:", e);
  process.exit(1);
} finally {
  await browser.close();
}
