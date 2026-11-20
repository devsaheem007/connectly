import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { ApiError, asyncHandler } from "../utils/ApiError.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { adminUser } from "../utils/serializers.js";
import { deleteUserData } from "../services/conversationService.js";

import { disconnectUser, emitToUser, onlineIds } from "../socket/io.js";

const dayKey = (d) => d.toISOString().slice(0, 10);

function lastSevenDays() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 6);
  const days = Array.from({ length: 7 }, (_, i) =>
    dayKey(new Date(start.getTime() + i * 86400000)),
  );
  return { start, days };
}

async function dailyCounts(Model, start, days) {
  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return days.map((d) => ({ date: d, count: map[d] || 0 }));
}

export const getStats = asyncHandler(async (req, res) => {
  const { start, days } = lastSevenDays();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [
    totalUsers,
    verifiedUsers,
    suspendedUsers,
    admins,
    totalMessages,
    messagesToday,
    totalConversations,
    groups,
    signups,
    messages,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isVerified: true }),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ role: { $in: ["admin", "moderator"] } }),
    Message.countDocuments({ type: { $ne: "system" } }),
    Message.countDocuments({
      type: { $ne: "system" },
      createdAt: { $gte: today },
    }),
    Conversation.countDocuments(),
    Conversation.countDocuments({ isGroup: true }),
    dailyCounts(User, start, days),
    dailyCounts(Message, start, days),
    User.find().sort({ createdAt: -1 }).limit(5),
  ]);

  res.json({
    stats: {
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      staff: admins,
      onlineNow: onlineIds().length,
      totalMessages,
      messagesToday,
      totalConversations,
      groups,
      directChats: totalConversations - groups,
      signups,
      messages,
      recentUsers: recentUsers.map(adminUser),
    },
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 12, 50);
  const filter = {};

  const q = String(req.query.q || "")
    .trim()
    .slice(0, 60);
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { username: rx }, { email: rx }];
  }
  if (["user", "moderator", "admin"].includes(req.query.role))
    filter.role = req.query.role;
  if (req.query.status === "active")
    Object.assign(filter, { isActive: true, isVerified: true });
  if (req.query.status === "suspended") filter.isActive = false;
  if (req.query.status === "unverified") filter.isVerified = false;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  const online = new Set(onlineIds());
  res.json({
    users: users.map((u) => ({
      ...adminUser(u),
      online: online.has(String(u._id)),
    })),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
});

async function manageableUser(req) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (String(user._id) === String(req.user._id))
    throw new ApiError(400, "You can't do that to your own account");
  if (req.user.role !== "admin" && user.role !== "user")
    throw new ApiError(
      403,
      "Moderators can only manage regular users",
      "FORBIDDEN",
    );
  return user;
}

export const updateUser = asyncHandler(async (req, res) => {
  const user = await manageableUser(req);
  const { role, isActive, suspendedReason } = req.body;

  if (role !== undefined) {
    if (req.user.role !== "admin")
      throw new ApiError(403, "Only admins can change roles", "FORBIDDEN");
    if (!["user", "moderator", "admin"].includes(role))
      throw new ApiError(400, "Invalid role");
    user.role = role;
  }
  if (typeof isActive === "boolean") {
    user.isActive = isActive;
    user.suspendedReason = isActive
      ? ""
      : String(suspendedReason || "").slice(0, 140);
    if (!isActive) {
      user.tokenVersion += 1;
      emitToUser(user._id, "account:suspended", {
        reason: user.suspendedReason,
      });
      setTimeout(() => disconnectUser(user._id), 400);
    }
  }
  await user.save();
  res.json({ user: adminUser(user) });
});

export const forceLogout = asyncHandler(async (req, res) => {
  const user = await manageableUser(req);
  user.tokenVersion += 1;
  await user.save();
  emitToUser(user._id, "account:suspended", {
    reason: "You were signed out by an administrator",
  });
  setTimeout(() => disconnectUser(user._id), 400);
  res.json({ message: "User signed out everywhere" });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin")
    throw new ApiError(403, "Only admins can delete accounts", "FORBIDDEN");
  const user = await manageableUser(req);
  if (user.role === "admin")
    throw new ApiError(403, "Demote this admin before deleting the account");
  disconnectUser(user._id);
  await deleteUserData(user._id);
  res.json({ message: "User deleted" });
});
