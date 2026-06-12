import { internalMutation } from "./_generated/server";

export const clearAdmins = internalMutation({
  args: {},
  handler: async ctx => {
    const admins = await ctx.db.query("admins").collect();
    for (const a of admins) {
      await ctx.db.delete(a._id);
    }
    return admins.length;
  },
});
