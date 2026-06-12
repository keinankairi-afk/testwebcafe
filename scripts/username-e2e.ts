import { chromium, type Page } from "playwright";

const URL = process.env.APP_URL || "http://localhost:4173";
const PW = "Watuagung1";
const DEFAULT_USER = "husin1";
const NEW_USER = "husinbaru";

async function login(page: Page, user: string): Promise<boolean> {
  await page.goto(`${URL}/login`, { waitUntil: "networkidle" });
  await page.locator("input[name='email']").fill(user);
  await page.locator("input[name='password']").fill(PW);
  await page.locator("button[type='submit']").click();
  try {
    await page.waitForURL("**/admin", { timeout: 15000 });
    await page.waitForSelector("text=Ganti Username", { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

async function logout(page: Page) {
  await page.locator("button[aria-label='Keluar']:visible").first().click();
  await page.waitForURL(u => !u.pathname.startsWith("/admin"), {
    timeout: 15000,
  });
}

async function changeUser(page: Page, newUser: string) {
  await page.locator("input[aria-label='Username Baru']").fill(newUser);
  await page.locator("input[aria-label='Password (konfirmasi)']").fill(PW);
  await page.locator("button:has-text('Ganti Username')").last().click();
  await page.waitForSelector("text=Username berhasil diganti", {
    timeout: 15000,
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  console.log("0. Pastikan username = default...");
  if (!(await login(page, DEFAULT_USER))) {
    console.log("   (sisa run sebelumnya, reset dulu)");
    if (!(await login(page, NEW_USER))) throw new Error("Cannot login");
    await changeUser(page, DEFAULT_USER);
    await logout(page);
    if (!(await login(page, DEFAULT_USER))) throw new Error("Reset failed");
  }
  console.log("   OK");

  console.log("1. Ganti username ke husinbaru...");
  await changeUser(page, NEW_USER);
  await page.waitForSelector(`text=${NEW_USER}`, { timeout: 10000 });
  await page.screenshot({ path: "tmp/e2e-username.png" });
  await logout(page);
  console.log("   OK");

  console.log("2. Username lama harus DITOLAK...");
  if (await login(page, DEFAULT_USER)) throw new Error("Old username works!");
  await page.waitForSelector("text=Username/email atau password salah", {
    timeout: 10000,
  });
  console.log("   OK");

  console.log("3. Login dengan username baru...");
  if (!(await login(page, NEW_USER))) throw new Error("New username failed");
  console.log("   OK");

  console.log("4. Validasi: username spasi/pendek ditolak...");
  await page.locator("input[aria-label='Username Baru']").fill("a b");
  await page.locator("input[aria-label='Password (konfirmasi)']").fill(PW);
  await page.locator("button:has-text('Ganti Username')").last().click();
  await page.waitForSelector("text=Username 3-30 karakter", { timeout: 15000 });
  console.log("   OK");

  console.log("5. Kembalikan ke husin1...");
  await changeUser(page, DEFAULT_USER);
  await logout(page);
  if (!(await login(page, DEFAULT_USER))) throw new Error("Restore failed");
  console.log("   OK");

  console.log("\nUSERNAME E2E PASSED");
} catch (e) {
  await page.screenshot({ path: "tmp/username-e2e-error.png" });
  console.error("FAILED:", e);
  process.exit(1);
} finally {
  await browser.close();
}
