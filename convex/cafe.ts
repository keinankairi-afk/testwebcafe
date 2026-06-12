import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Public API: customer menu & ordering
// ---------------------------------------------------------------------------

async function productImageUrl(
  ctx: QueryCtx,
  product: Doc<"products">,
): Promise<string | null> {
  if (product.imageStorageId) {
    return await ctx.storage.getUrl(product.imageStorageId);
  }
  return product.imageUrl ?? null;
}

export const getSettings = query({
  args: {},
  handler: async ctx => {
    const row = await ctx.db.query("settings").first();
    return {
      cafeName: row?.cafeName ?? "Sibabu Cafe",
      themeColor: row?.themeColor ?? "kopi",
      tableCount: row?.tableCount ?? 12,
      slogan: row?.slogan ?? "Menu & Order",
      heroTitle: row?.heroTitle ?? "Mau ngopi apa hari ini? ☕",
      heroSubtitle:
        row?.heroSubtitle ??
        "Pilih menu favoritmu, pesan langsung dari meja — tanpa antre.",
    };
  },
});

export const listCategories = query({
  args: {},
  handler: async ctx => {
    const categories = await ctx.db.query("categories").collect();
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listActiveProducts = query({
  args: {},
  handler: async ctx => {
    const products = await ctx.db.query("products").collect();
    const categories = await ctx.db.query("categories").collect();
    const catName = new Map(categories.map(c => [c._id, c.name]));
    const active = products.filter(p => p.isActive);
    return Promise.all(
      active.map(async p => ({
        ...p,
        image: await productImageUrl(ctx, p),
        categoryName: catName.get(p.categoryId) ?? "Lainnya",
      })),
    );
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

function generateOrderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SB-";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export const placeOrder = mutation({
  args: {
    customerName: v.string(),
    tableNumber: v.string(),
    notes: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const customerName = sanitize(args.customerName, 60);
    const tableNumber = sanitize(args.tableNumber, 10);
    const notes = args.notes ? sanitize(args.notes, 300) : undefined;

    if (customerName.length < 2) {
      throw new Error("Nama pelanggan minimal 2 karakter.");
    }
    if (tableNumber.length < 1) {
      throw new Error("Nomor meja wajib diisi.");
    }
    const settingsRow = await ctx.db.query("settings").first();
    const tableCount = settingsRow?.tableCount ?? 12;
    const tableNo = Number(tableNumber);
    if (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > tableCount) {
      throw new Error(`Nomor meja harus 1 sampai ${tableCount}.`);
    }
    if (args.items.length === 0 || args.items.length > 50) {
      throw new Error("Keranjang kosong atau terlalu banyak item.");
    }

    // Validate products & compute prices server-side (never trust client).
    const lines: {
      productId: Id<"products">;
      productName: string;
      price: number;
      quantity: number;
      subtotal: number;
    }[] = [];
    for (const item of args.items) {
      const quantity = Math.floor(item.quantity);
      if (quantity < 1 || quantity > 99) {
        throw new Error("Jumlah item tidak valid (1-99).");
      }
      const product = await ctx.db.get(item.productId);
      if (!product || !product.isActive) {
        throw new Error(
          "Ada produk yang sudah tidak tersedia. Muat ulang menu.",
        );
      }
      lines.push({
        productId: product._id,
        productName: product.name,
        price: product.price,
        quantity,
        subtotal: product.price * quantity,
      });
    }
    const total = lines.reduce((sum, l) => sum + l.subtotal, 0);

    const code = generateOrderCode();
    const orderId = await ctx.db.insert("orders", {
      code,
      customerName,
      tableNumber,
      notes,
      status: "pending",
      total,
    });
    for (const line of lines) {
      await ctx.db.insert("orderItems", { orderId, ...line });
    }
    return { orderId, code };
  },
});

// ---------------------------------------------------------------------------
// Seed: fills demo menu only when database is completely empty.
// ---------------------------------------------------------------------------

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

const SEED: {
  name: string;
  sortOrder: number;
  products: [string, string, number, string][];
}[] = [
  {
    name: "Coffee",
    sortOrder: 1,
    products: [
      [
        "Espresso",
        "Single shot espresso dari biji arabika pilihan.",
        18000,
        img("photo-1510591509098-f4fdc6d0ff04"),
      ],
      [
        "Caffe Latte",
        "Espresso lembut dengan steamed milk dan latte art.",
        28000,
        img("photo-1561882468-9110e03e0f78"),
      ],
      [
        "Cappuccino",
        "Espresso, susu, dan foam tebal yang creamy.",
        27000,
        img("photo-1572442388796-11668a67e53d"),
      ],
      [
        "Es Kopi Susu Sibabu",
        "Signature! Kopi susu gula aren khas Sibabu.",
        24000,
        img("photo-1517701604599-bb29b565090c"),
      ],
      [
        "V60 Manual Brew",
        "Seduhan manual V60, rasa clean dan fruity.",
        30000,
        img("photo-1495474472287-4d71bcdd2085"),
      ],
    ],
  },
  {
    name: "Non Coffee",
    sortOrder: 2,
    products: [
      [
        "Matcha Latte",
        "Matcha premium Jepang dengan susu segar.",
        29000,
        img("photo-1515823064-d6e0c04616a7"),
      ],
      [
        "Cokelat Klasik",
        "Dark chocolate hangat atau dingin, rich & creamy.",
        26000,
        img("photo-1542990253-0d0f5be5f0ed"),
      ],
      [
        "Lemon Tea Segar",
        "Teh hitam dengan perasan lemon asli.",
        20000,
        img("photo-1556679343-c7306c1976bc"),
      ],
    ],
  },
  {
    name: "Food",
    sortOrder: 3,
    products: [
      [
        "Croissant Butter",
        "Croissant renyah berlapis butter premium.",
        22000,
        img("photo-1555507036-ab1f4038808a"),
      ],
      [
        "Nasi Goreng Cafe",
        "Nasi goreng spesial dengan telur dan ayam suwir.",
        35000,
        img("photo-1512058564366-18510be2db19"),
      ],
      [
        "Chicken Sandwich",
        "Roti panggang, ayam grilled, sayuran segar.",
        32000,
        img("photo-1528735602780-2552fd46c7af"),
      ],
    ],
  },
  {
    name: "Dessert",
    sortOrder: 4,
    products: [
      [
        "Tiramisu Cup",
        "Tiramisu lembut dengan mascarpone dan kopi.",
        28000,
        img("photo-1571877227200-a0d98ea607e9"),
      ],
      [
        "Brownies Fudgy",
        "Brownies cokelat fudgy dengan es krim vanilla.",
        25000,
        img("photo-1606313564200-e75d5e30476c"),
      ],
      [
        "Pancake Madu",
        "Pancake fluffy dengan madu dan butter.",
        27000,
        img("photo-1567620905732-2d1ec7ab7445"),
      ],
    ],
  },
];

export const seedIfEmpty = mutation({
  args: {},
  handler: async ctx => {
    const existingCategory = await ctx.db.query("categories").first();
    const existingProduct = await ctx.db.query("products").first();
    if (existingCategory || existingProduct) {
      return { seeded: false };
    }
    for (const cat of SEED) {
      const categoryId = await ctx.db.insert("categories", {
        name: cat.name,
        sortOrder: cat.sortOrder,
      });
      for (const [name, description, price, imageUrl] of cat.products) {
        await ctx.db.insert("products", {
          name,
          description,
          price,
          categoryId,
          imageUrl,
          isActive: true,
        });
      }
    }
    return { seeded: true };
  },
});
