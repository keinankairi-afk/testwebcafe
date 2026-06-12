import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("diproses"),
  v.literal("selesai"),
  v.literal("dibatalkan"),
);

const schema = defineSchema({
  ...authTables,

  // Cafe owner(s). First signed-in user to call ensureAdmin claims admin.
  admins: defineTable({
    userId: v.id("users"),
  }).index("by_user", ["userId"]),

  settings: defineTable({
    cafeName: v.string(),
    themeColor: v.optional(v.string()),
    // Login username for the fixed admin account (internal account id stays
    // constant; this is what the login form checks against).
    adminUsername: v.optional(v.string()),
    // Number of tables in the cafe (customers pick 1..tableCount at checkout).
    tableCount: v.optional(v.number()),
    // Tagline shown under the name in the customer header.
    slogan: v.optional(v.string()),
    // Big greeting title + subtitle on the customer menu page.
    heroTitle: v.optional(v.string()),
    heroSubtitle: v.optional(v.string()),
  }),

  categories: defineTable({
    name: v.string(),
    sortOrder: v.number(),
  }),

  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    categoryId: v.id("categories"),
    imageUrl: v.optional(v.string()), // external URL (seed data)
    imageStorageId: v.optional(v.id("_storage")), // uploaded photo
    isActive: v.boolean(),
  }).index("by_category", ["categoryId"]),

  orders: defineTable({
    code: v.string(),
    customerName: v.string(),
    tableNumber: v.string(),
    notes: v.optional(v.string()),
    status: orderStatusValidator,
    total: v.number(),
  }).index("by_status", ["status"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    productName: v.string(),
    price: v.number(),
    quantity: v.number(),
    subtotal: v.number(),
  }).index("by_order", ["orderId"]),
});

export default schema;
