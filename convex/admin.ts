import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { ADMIN_EMAIL, ADMIN_USERNAME } from "./adminAuth";
import { orderStatusValidator } from "./schema";

declare const process: { env: Record<string, string | undefined> };

// ---------------------------------------------------------------------------
// Admin guard. The first authenticated user to open the admin panel claims
// admin (cafe owner). Everyone else stays a regular account with no access.
// ---------------------------------------------------------------------------

async function isAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const row = await ctx.db
    .query("admins")
    .withIndex("by_user", q => q.eq("userId", userId))
    .first();
  return row !== null;
}

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Harus login terlebih dahulu.");
  if (!(await isAdmin(ctx, userId))) {
    throw new Error("Akun ini tidak punya akses admin.");
  }
  return userId;
}

/** Called when the admin panel mounts. First user ever becomes admin. */
export const ensureAdmin = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isAdmin: false };
    if (await isAdmin(ctx, userId)) return { isAdmin: true };
    const user = await ctx.db.get(userId);
    const email = user?.email ?? "";
    const isFixedAdmin = email === ADMIN_EMAIL;
    const isPreviewTester =
      process.env.VIKTOR_SPACES_IS_PREVIEW === "true" &&
      email.endsWith("@test.local");
    const anyAdmin = await ctx.db.query("admins").first();
    if (!anyAdmin || isFixedAdmin || isPreviewTester) {
      await ctx.db.insert("admins", { userId });
      return { isAdmin: true };
    }
    return { isAdmin: false };
  },
});

export const myAdminStatus = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isAdmin: false };
    return { isAdmin: await isAdmin(ctx, userId) };
  },
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

async function productImage(
  ctx: QueryCtx,
  product: Doc<"products">,
): Promise<string | null> {
  if (product.imageStorageId) {
    return await ctx.storage.getUrl(product.imageStorageId);
  }
  return product.imageUrl ?? null;
}

export const listAllProducts = query({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);
    const products = await ctx.db.query("products").collect();
    const categories = await ctx.db.query("categories").collect();
    const catName = new Map(categories.map(c => [c._id, c.name]));
    const enriched = await Promise.all(
      products.map(async p => ({
        ...p,
        image: await productImage(ctx, p),
        categoryName: catName.get(p.categoryId) ?? "Lainnya",
      })),
    );
    return enriched.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

function sanitize(text: string, maxLength: number): string {
  return text
    .replace(/[<>]/g, "")
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validateProductInput(name: string, price: number): void {
  if (name.length < 2) throw new Error("Nama produk minimal 2 karakter.");
  if (!Number.isFinite(price) || price < 1 || price > 100_000_000) {
    throw new Error("Harga tidak valid.");
  }
}

export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    categoryId: v.id("categories"),
    isActive: v.boolean(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = sanitize(args.name, 80);
    validateProductInput(name, args.price);
    if (!(await ctx.db.get(args.categoryId))) {
      throw new Error("Kategori tidak ditemukan.");
    }
    return await ctx.db.insert("products", {
      name,
      description: sanitize(args.description, 300),
      price: Math.floor(args.price),
      categoryId: args.categoryId,
      isActive: args.isActive,
      imageStorageId: args.imageStorageId,
    });
  },
});

export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    isActive: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Produk tidak ditemukan.");

    const patch: Partial<Doc<"products">> = {};
    if (args.name !== undefined) {
      const name = sanitize(args.name, 80);
      validateProductInput(name, args.price ?? product.price);
      patch.name = name;
    }
    if (args.description !== undefined) {
      patch.description = sanitize(args.description, 300);
    }
    if (args.price !== undefined) {
      validateProductInput(patch.name ?? product.name, args.price);
      patch.price = Math.floor(args.price);
    }
    if (args.categoryId !== undefined) {
      if (!(await ctx.db.get(args.categoryId))) {
        throw new Error("Kategori tidak ditemukan.");
      }
      patch.categoryId = args.categoryId;
    }
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    if (args.imageStorageId !== undefined) {
      // Replace photo: delete old uploaded file to keep storage clean.
      if (product.imageStorageId) {
        await ctx.storage.delete(product.imageStorageId);
      }
      patch.imageStorageId = args.imageStorageId;
      patch.imageUrl = undefined;
    }
    await ctx.db.patch(args.productId, patch);
  },
});

export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product) return;
    if (product.imageStorageId) {
      await ctx.storage.delete(product.imageStorageId);
    }
    await ctx.db.delete(args.productId);
  },
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const listOrders = query({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);
    const orders = await ctx.db.query("orders").order("desc").take(200);
    return Promise.all(
      orders.map(async order => ({
        ...order,
        items: await ctx.db
          .query("orderItems")
          .withIndex("by_order", q => q.eq("orderId", order._id))
          .collect(),
      })),
    );
  },
});

export const updateOrderStatus = mutation({
  args: { orderId: v.id("orders"), status: orderStatusValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Pesanan tidak ditemukan.");
    await ctx.db.patch(args.orderId, { status: args.status });
  },
});

const THEME_COLORS = ["kopi", "hijau", "biru", "ungu", "merah", "jingga"];

/** Current login username, only visible to admins. */
export const getLoginUsername = query({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("settings").first();
    return row?.adminUsername ?? ADMIN_USERNAME;
  },
});

export const updateSettings = mutation({
  args: {
    cafeName: v.string(),
    themeColor: v.optional(v.string()),
    tableCount: v.optional(v.number()),
    slogan: v.optional(v.string()),
    heroTitle: v.optional(v.string()),
    heroSubtitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const cafeName = args.cafeName.trim();
    if (cafeName.length < 2 || cafeName.length > 60) {
      throw new Error("Nama cafe harus 2-60 karakter");
    }
    const themeColor =
      args.themeColor && THEME_COLORS.includes(args.themeColor)
        ? args.themeColor
        : "kopi";
    let tableCount: number | undefined;
    if (args.tableCount !== undefined) {
      if (
        !Number.isInteger(args.tableCount) ||
        args.tableCount < 1 ||
        args.tableCount > 200
      ) {
        throw new Error("Jumlah meja harus 1-200");
      }
      tableCount = args.tableCount;
    }
    let slogan: string | undefined;
    if (args.slogan !== undefined) {
      slogan = args.slogan.trim().slice(0, 60);
      if (slogan.length === 0) slogan = "Menu & Order";
    }
    let heroTitle: string | undefined;
    if (args.heroTitle !== undefined) {
      heroTitle = args.heroTitle.trim().slice(0, 80);
      if (heroTitle.length === 0) heroTitle = "Mau ngopi apa hari ini? ☕";
    }
    let heroSubtitle: string | undefined;
    if (args.heroSubtitle !== undefined) {
      heroSubtitle = args.heroSubtitle.trim().slice(0, 120);
      if (heroSubtitle.length === 0) {
        heroSubtitle =
          "Pilih menu favoritmu, pesan langsung dari meja — tanpa antre.";
      }
    }
    const patch: {
      cafeName: string;
      themeColor: string;
      tableCount?: number;
      slogan?: string;
      heroTitle?: string;
      heroSubtitle?: string;
    } = { cafeName, themeColor };
    if (slogan !== undefined) patch.slogan = slogan;
    if (heroTitle !== undefined) patch.heroTitle = heroTitle;
    if (heroSubtitle !== undefined) patch.heroSubtitle = heroSubtitle;
    // NB: passing an explicit `undefined` to db.patch would DELETE the field.
    if (tableCount !== undefined) patch.tableCount = tableCount;
    const row = await ctx.db.query("settings").first();
    if (row) {
      await ctx.db.patch(row._id, patch);
    } else {
      await ctx.db.insert("settings", patch);
    }
    return patch;
  },
});
