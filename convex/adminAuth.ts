import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import {
  createAccount,
  getAuthUserId,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { Scrypt } from "lucia";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";

export const ADMIN_USERNAME = "husin1";
export const ADMIN_EMAIL = "husin1@sibabu.cafe";
/** Initial password for the very first login. After the account exists,
 *  the (changeable) password lives hashed in the authAccounts table. */
const DEFAULT_ADMIN_PASSWORD = "Watuagung1";

const PROVIDER = "admin-login";

export const AdminCredentials = ConvexCredentials<DataModel>({
  id: PROVIDER,
  crypto: {
    async hashSecret(password: string) {
      return await new Scrypt().hash(password);
    },
    async verifySecret(password: string, hash: string) {
      return await new Scrypt().verify(hash, password);
    },
  },
  authorize: async (params, ctx) => {
    const username = ((params.username as string) || "").trim().toLowerCase();
    const password = (params.password as string) || "";

    const currentUsername: string = await ctx.runQuery(
      internal.adminAuth.getAdminUsername,
    );
    if (username !== currentUsername || password.length === 0) {
      throw new Error("Invalid username or password");
    }

    const exists = await ctx.runQuery(internal.adminAuth.adminAccountExists);

    if (exists) {
      // Password is verified against the stored (changeable) hash.
      const result = await retrieveAccount(ctx, {
        provider: PROVIDER,
        account: { id: ADMIN_USERNAME, secret: password },
      });
      return { userId: result.user._id };
    }

    // First login ever: only the default password may create the account.
    if (password !== DEFAULT_ADMIN_PASSWORD) {
      throw new Error("Invalid username or password");
    }
    const { user } = await createAccount(ctx, {
      provider: PROVIDER,
      account: { id: ADMIN_USERNAME, secret: password },
      profile: {
        email: ADMIN_EMAIL,
        name: "Husin",
        emailVerificationTime: Date.now(),
      },
      shouldLinkViaEmail: false,
    });
    return { userId: user._id };
  },
});

/** Current login username (changeable; defaults to the initial one). */
export const getAdminUsername = internalQuery({
  args: {},
  handler: async ctx => {
    const row = await ctx.db.query("settings").first();
    return row?.adminUsername ?? ADMIN_USERNAME;
  },
});

/** Persist a new login username in settings. */
export const setAdminUsername = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("settings").first();
    if (row) {
      await ctx.db.patch(row._id, { adminUsername: args.username });
    } else {
      await ctx.db.insert("settings", {
        cafeName: "Sibabu Cafe",
        adminUsername: args.username,
      });
    }
  },
});

/** Does the fixed admin account already exist? */
export const adminAccountExists = internalQuery({
  args: {},
  handler: async ctx => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", q =>
        q.eq("provider", PROVIDER).eq("providerAccountId", ADMIN_USERNAME),
      )
      .unique();
    return account !== null;
  },
});

/** Is this user in the admins table? (used by the changePassword action) */
export const isAdminUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("admins")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .first();
    return row !== null;
  },
});

/** Admin changes their own password from the admin panel. */
export const changePassword = action({
  args: { oldPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Harus login terlebih dahulu.");
    const isAdmin = await ctx.runQuery(internal.adminAuth.isAdminUser, {
      userId,
    });
    if (!isAdmin) throw new ConvexError("Akun ini tidak punya akses admin.");

    const newPassword = args.newPassword;
    if (newPassword.length < 8) {
      throw new ConvexError("Password baru minimal 8 karakter.");
    }

    try {
      await retrieveAccount(ctx, {
        provider: PROVIDER,
        account: { id: ADMIN_USERNAME, secret: args.oldPassword },
      });
    } catch {
      throw new ConvexError("Password lama salah.");
    }

    await modifyAccountCredentials(ctx, {
      provider: PROVIDER,
      account: { id: ADMIN_USERNAME, secret: newPassword },
    });
    return null;
  },
});

/** Admin changes the login username (requires current password). */
export const changeUsername = action({
  args: { password: v.string(), newUsername: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Harus login terlebih dahulu.");
    const isAdmin = await ctx.runQuery(internal.adminAuth.isAdminUser, {
      userId,
    });
    if (!isAdmin) throw new ConvexError("Akun ini tidak punya akses admin.");

    const newUsername = args.newUsername.trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,30}$/.test(newUsername)) {
      throw new ConvexError(
        "Username 3-30 karakter, hanya huruf kecil, angka, titik, strip, underscore (tanpa spasi/@).",
      );
    }

    try {
      await retrieveAccount(ctx, {
        provider: PROVIDER,
        account: { id: ADMIN_USERNAME, secret: args.password },
      });
    } catch {
      throw new ConvexError("Password salah.");
    }

    await ctx.runMutation(internal.adminAuth.setAdminUsername, {
      username: newUsername,
    });
    return null;
  },
});

/** Emergency reset (run manually):
 *  bunx convex run adminAuth:resetAdminPassword '{"newPassword":"..."}' [--prod] */
export const resetAdminPassword = internalAction({
  args: { newPassword: v.string() },
  handler: async (ctx, args) => {
    await modifyAccountCredentials(ctx, {
      provider: PROVIDER,
      account: { id: ADMIN_USERNAME, secret: args.newPassword },
    });
    return null;
  },
});
