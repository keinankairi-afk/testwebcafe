import { chromium, type Page } from "playwright";

const URL = process.env.APP_URL || "http://localhost:4173";
const DEFAULT_PW = "Watuagung1";
const NEW_PW = "PasswordBaru99";

async function login(page: Page, pw: string): Promise<boolean> {
  await page.goto(`${URL}/login`, { waitUntil: "networkidle" });
  await page.locator("input[name='email']").fill("husin1");
  await page.locator("input[name='password']").fill(pw);
  await page.locator("button[type='submit']").click();
  try {
    await page.waitForURL("**/admin", { timeout: 15000 });
    await page.waitForSelector("text=Ganti Password", { timeout: 15000 });
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

async function changePw(page: Page, oldPw: string, newPw: string) {
  await page.locator("input[aria-label='Password Lama']").fill(oldPw);
  await page.locator("input[aria-label='Password Baru']").fill(newPw);
  await page
    .locator("input[aria-label='Konfirmasi Password Baru']")
    .fill(newPw);
  await page.locator("button:has-text('Ganti Password')").last().click();
  await page.waitForSelector("text=Password berhasil diganti", {
    timeout: 15000,
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  console.log("0. Pastikan password = default...");
  if (!(await login(page, DEFAULT_PW))) {
    console.log("   (sisa run sebelumnya, reset dulu)");
    if (!(await login(page, NEW_PW))) throw new Error("Cannot login at all");
    await changePw(page, NEW_PW, DEFAULT_PW);
    await logout(page);
    if (!(await login(page, DEFAULT_PW))) throw new Error("Reset failed");
  }
  console.log("   OK: login default berhasil");

  console.log("1. Ganti password ke yang baru...");
  await changePw(page, DEFAULT_PW, NEW_PW);
  console.log("   OK: password diganti");
  await page.screenshot({ path: "tmp/e2e-pw-changed.png" });
  await logout(page);

  console.log("2. Password lama harus DITOLAK...");
  if (await login(page, DEFAULT_PW))
    throw new Error("Old password still works!");
  await page.waitForSelector("text=Username/email atau password salah", {
    timeout: 10000,
  });
  console.log("   OK: password lama ditolak");

  console.log("3. Login dengan password baru...");
  if (!(await login(page, NEW_PW)))
    throw new Error("New password login failed");
  console.log("   OK: password baru jalan");

  console.log("4. Validasi: password lama salah harus error...");
  await page.locator("input[aria-label='Password Lama']").fill("salahsalah");
  await page.locator("input[aria-label='Password Baru']").fill("ApapunDeh123");
  await page
    .locator("input[aria-label='Konfirmasi Password Baru']")
    .fill("ApapunDeh123");
  await page.locator("button:has-text('Ganti Password')").last().click();
  await page.waitForSelector("text=Password lama salah", { timeout: 15000 });
  console.log("   OK: error 'Password lama salah' muncul");

  console.log("5. Kembalikan ke password awal...");
  await changePw(page, NEW_PW, DEFAULT_PW);
  await logout(page);
  if (!(await login(page, DEFAULT_PW))) throw new Error("Restore failed");
  console.log("   OK: kembali ke default");

  console.log("\nPASSWORD E2E PASSED");
} catch (e) {
  await page.screenshot({ path: "tmp/pw-e2e-error.png" });
  console.error("FAILED:", e);
  process.exit(1);
} finally {
  await browser.close();
}
