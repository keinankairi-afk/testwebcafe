import { runTest } from "./auth";

runTest("Sibabu Cafe E2E", async helper => {
  const { page } = helper;

  // ---------------- Customer flow ----------------
  console.log("📍 1. Menu page (customer)...");
  await helper.goto("/");
  await page.waitForSelector("text=Sibabu Cafe", { timeout: 15000 });
  // Wait for products (auto-seed may take a moment on first load)
  await page.waitForSelector("article", { timeout: 30000 });
  const productCount = await page.locator("article").count();
  console.log(`   ✓ Products rendered: ${productCount}`);
  if (productCount < 1) throw new Error("No products on menu");

  console.log("📍 2. Add 2 products to cart...");
  await page.locator("article button:has-text('Order')").first().click();
  await page.locator("article button:has-text('Order')").nth(1).click();
  await page.waitForTimeout(500);

  console.log("📍 3. Open cart drawer...");
  await page.locator("button:has-text('item di keranjang')").click();
  await page.waitForSelector("text=Keranjang", { timeout: 5000 });
  const cartItems = await page.locator("[role='dialog'] li").count();
  console.log(`   ✓ Cart items: ${cartItems}`);
  if (cartItems !== 2)
    throw new Error(`Expected 2 cart items, got ${cartItems}`);

  console.log("📍 4. Checkout...");
  await page.locator("button:has-text('Lanjut ke Checkout')").click();
  await page.waitForSelector("text=Data Pemesan", { timeout: 10000 });
  await page.getByPlaceholder("Contoh: Budi").fill("Tester Viktor");
  await page.locator("select[aria-label='Nomor meja']").selectOption("7");
  await page
    .getByPlaceholder("Contoh: less sugar, tanpa es, saus dipisah...")
    .fill("Less sugar ya");
  await page.locator("button:has-text('Kirim Pesanan')").click();
  await page.waitForSelector("text=Pesanan Terkirim", { timeout: 15000 });
  const codeText = await page.locator("p.font-mono").innerText();
  console.log(`   ✓ Order placed, code: ${codeText}`);
  if (!codeText.startsWith("SB-")) throw new Error("Order code missing");
  await helper.screenshot("e2e-order-success.png");

  // ---------------- Admin flow ----------------
  console.log("📍 5. Admin dashboard (first user claims admin)...");
  await helper.goto("/admin");
  await page.waitForSelector("text=Dashboard", { timeout: 20000 });
  await page.waitForSelector("text=Pesanan Hari Ini", { timeout: 10000 });
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes("Tester Viktor")) {
    throw new Error("New order not visible on dashboard");
  }
  console.log("   ✓ Dashboard shows today's stats + new order");

  console.log("📍 6. Orders page: process the order...");
  await helper.goto("/admin/orders");
  await page.waitForSelector(`text=${codeText}`, { timeout: 15000 });
  await page.locator(`button:has-text('${codeText}')`).first().click();
  await page.waitForSelector("text=Less sugar ya", { timeout: 5000 });
  console.log("   ✓ Order detail expanded, notes visible");
  await page.locator("button:has-text('Proses Pesanan')").click();
  await page.waitForSelector("text=Diproses", { timeout: 10000 });
  console.log("   ✓ Status → Diproses");
  await page.locator("button:has-text('Tandai Selesai')").click();
  await page.waitForTimeout(1000);
  console.log("   ✓ Status → Selesai");
  await helper.screenshot("e2e-admin-orders.png");

  console.log("📍 7. Products page: CRUD...");
  await helper.goto("/admin/products");
  await page.waitForSelector("text=Tambah Produk", { timeout: 15000 });
  const productRows = await page.locator("ul > li").count();
  console.log(`   ✓ Product list rendered (${productRows} rows)`);
  // Edit first product price via modal
  await page.locator("button[aria-label='Edit']").first().click();
  await page.waitForSelector("text=Edit Produk", { timeout: 5000 });
  await page.locator("input[type='number']").fill("19500");
  await page.locator("button:has-text('Simpan Perubahan')").click();
  await page.waitForSelector("text=Produk diperbarui", { timeout: 10000 });
  console.log("   ✓ Product updated via modal");
  await helper.screenshot("e2e-admin-products.png");

  console.log("\n🎉 Full customer + admin flow OK!");
}).catch(err => {
  console.error("E2E error:", err);
  process.exit(1);
});
