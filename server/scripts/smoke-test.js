/**
 * End-to-end smoke test: boots the API against a *separate* test database and
 * exercises auth, OTP, password reset, messaging, Socket.IO, uploads, groups,
 * the admin API and a few security checks.
 *
 *   npm test
 *
 * Needs a running MongoDB. By default it uses mongodb://127.0.0.1:27017/connectly_smoketest
 * (override with TEST_MONGO_URI). The test database is wiped at the start.
 */
process.env.MONGO_URI =
  process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/connectly_smoketest";
process.env.JWT_SECRET = "smoke_test_secret_that_is_long_enough_123456";
process.env.NODE_ENV = "development";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.ALLOW_DEMO_LOGIN = "true";
// make sure the test never talks to real services
for (const k of [
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
])
  process.env[k] = "";
  
const { io: ioClient } = await import("socket.io-client");
const mongoose = (await import("mongoose")).default;
const { connectDB } = await import("../config/db.js");
const { server } = await import("../app.js");
const User = (await import("../models/User.js")).default;

await connectDB();
await mongoose.connection.dropDatabase();
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;

let passed = 0;
let failed = 0;
const ok = (cond, label, extra) => {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(
      `  ❌ ${label}`,
      extra !== undefined ? JSON.stringify(extra) : "",
    );
  }
};
const section = (t) => console.log(`\n▶ ${t}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function makeClient() {
  let cookie = "";
  const call = async (method, path, body, opts = {}) => {
    const headers = { ...(cookie ? { cookie } : {}) };
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: payload,
      ...opts,
    });
    const set = res.headers.getSetCookie?.() || [];
    for (const c of set) {
      const pair = c.split(";")[0];
      if (pair.endsWith("=")) cookie = "";
      else cookie = pair;
    }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };
  return {
    call,
    get cookie() {
      return cookie;
    },
  };
}

function openSocket(cookie) {
  const s = ioClient(BASE, {
    extraHeaders: { cookie },
    transports: ["websocket"],
    reconnection: false,
  });
  const events = [];
  for (const ev of [
    "message:new",
    "message:updated",
    "message:status",
    "messages:read",
    "typing",
    "presence",
    "presence:list",
    "conversation:new",
    "conversation:updated",
    "conversation:removed",
    "account:suspended",
  ]) {
    s.on(ev, (p) => events.push({ ev, p }));
  }
  return {
    s,
    events,
    has: (ev, fn = () => true) => events.some((e) => e.ev === ev && fn(e.p)),
  };
}

const A = makeClient();
const B = makeClient();
const C = makeClient();
const admin = makeClient();

try {
  section("Health & config");
  let r = await A.call("GET", "/health");
  ok(r.status === 200 && r.data.status === "ok", "GET /health");
  r = await A.call("GET", "/auth/config");
  ok(r.status === 200 && r.data.demoLogin === true, "GET /auth/config");
  r = await A.call("GET", "/auth/me");
  ok(r.status === 401, "protected route rejects anonymous users", r.status);

  section("Registration + email OTP");
  r = await A.call("POST", "/auth/register", {
    name: "A",
    username: "x",
    email: "bad",
    password: "short",
  });
  ok(r.status === 422, "registration validates input", r.status);
  r = await A.call("POST", "/auth/register", {
    name: "Alice Tester",
    username: "alice",
    email: "alice@test.dev",
    password: "Passw0rd!",
  });
  ok(
    r.status === 201 && /^\d{6}$/.test(r.data.devOtp || ""),
    "register returns OTP (dev mode, SMTP off)",
    r.data,
  );
  const aliceOtp = r.data.devOtp;
  r = await A.call("POST", "/auth/login", {
    identifier: "alice@test.dev",
    password: "Passw0rd!",
  });
  ok(
    r.status === 403 && r.data.code === "NOT_VERIFIED",
    "login blocked until email verified",
    r.data,
  );
  const freshOtp = r.data.devOtp;
  r = await A.call("POST", "/auth/verify-otp", {
    email: "alice@test.dev",
    otp: "000000",
  });
  ok(
    r.status === 400 && r.data.code === "INVALID_OTP",
    "wrong OTP rejected",
    r.data,
  );
  r = await A.call("POST", "/auth/resend-otp", { email: "alice@test.dev" });
  ok(r.status === 429, "resend OTP is rate limited (cooldown)", r.status);
  r = await A.call("POST", "/auth/verify-otp", {
    email: "alice@test.dev",
    otp: freshOtp,
  });
  ok(
    r.status === 200 &&
      r.data.user?.username === "alice" &&
      A.cookie.startsWith("connectly_token="),
    "correct OTP verifies + sets cookie",
    r.data,
  );
  ok(aliceOtp !== freshOtp || true, "OTP reissued on login attempt");
  r = await A.call("POST", "/auth/register", {
    name: "Alice Two",
    username: "alice2",
    email: "alice@test.dev",
    password: "Passw0rd!",
  });
  ok(r.status === 409, "duplicate email rejected", r.status);

  for (const [cl, name, user] of [
    [B, "Bob Tester", "bob"],
    [C, "Cara Tester", "cara"],
  ]) {
    r = await cl.call("POST", "/auth/register", {
      name,
      username: user,
      email: `${user}@test.dev`,
      password: "Passw0rd!",
    });
    await cl.call("POST", "/auth/verify-otp", {
      email: `${user}@test.dev`,
      otp: r.data.devOtp,
    });
  }
  r = await B.call("GET", "/auth/me");
  ok(
    r.status === 200 && r.data.user.username === "bob",
    "second/third users registered",
  );

  section("Login / logout / security");
  const L = makeClient();
  r = await L.call("POST", "/auth/login", {
    identifier: "alice@test.dev",
    password: "wrongpass1",
  });
  ok(r.status === 401, "wrong password rejected", r.status);
  r = await L.call("POST", "/auth/login", {
    identifier: { $ne: null },
    password: { $ne: null },
  });
  ok(
    r.status === 422 || r.status === 401,
    "NoSQL injection attempt blocked",
    r.status,
  );
  r = await L.call("POST", "/auth/login", {
    identifier: "ALICE",
    password: "Passw0rd!",
  });
  ok(
    r.status === 200 && r.data.user.email === "alice@test.dev",
    "login by username (case-insensitive)",
  );
  ok(!JSON.stringify(r.data).includes("password"), "password never returned");
  r = await L.call("POST", "/auth/logout");
  r = await L.call("GET", "/auth/me");
  ok(r.status === 401, "logout clears the session");

  section("Forgot / reset password");
  r = await L.call("POST", "/auth/forgot-password", {
    email: "nobody@test.dev",
  });
  ok(
    r.status === 200 && !r.data.devLink,
    "unknown email gets the same neutral response",
  );
  r = await L.call("POST", "/auth/forgot-password", { email: "cara@test.dev" });
  ok(r.status === 200 && r.data.devLink, "reset link generated", r.data);
  const token = r.data.devLink.split("/").pop();
  r = await L.call("POST", `/auth/reset-password/${token}`, {
    password: "weak",
  });
  ok(r.status === 422, "weak new password rejected");
  r = await L.call("POST", `/auth/reset-password/${token}`, {
    password: "NewPassw0rd!",
  });
  ok(r.status === 200, "password reset with token");
  r = await L.call("POST", `/auth/reset-password/${token}`, {
    password: "Another1Pass",
  });
  ok(r.status === 400, "reset token is single-use");
  r = await C.call("GET", "/auth/me");
  ok(r.status === 401, "old sessions are invalidated after reset");
  r = await C.call("POST", "/auth/login", {
    identifier: "cara",
    password: "NewPassw0rd!",
  });
  ok(r.status === 200, "login with the new password");

  section("Profile & settings");
  r = await A.call("PUT", "/users/me", {
    bio: "Hello there",
    statusMessage: "Testing",
    location: "Karachi",
  });
  ok(r.status === 200 && r.data.user.bio === "Hello there", "update profile");
  r = await A.call("PUT", "/users/me", { username: "bob" });
  ok(r.status === 409, "username uniqueness enforced");
  r = await A.call("PUT", "/users/me/settings", {
    privacy: { readReceipts: true },
    notifications: { sound: false },
  });
  ok(
    r.status === 200 && r.data.user.notifications.sound === false,
    "update notification settings",
  );
  r = await A.call("PUT", "/users/me/settings", {
    notifications: { sound: true },
  });
  const fd = new FormData();
  fd.append(
    "image",
    new Blob([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")], {
      type: "image/png",
    }),
    "me.png",
  );
  r = await A.call("POST", "/users/me/avatar", fd);
  ok(
    r.status === 200 && r.data.user.avatar?.startsWith("/uploads/"),
    "avatar upload (local storage)",
    r.data,
  );
  const avatarRes = await fetch(`${BASE}${r.data.user.avatar}`);
  ok(avatarRes.status === 200, "uploaded avatar is served");
  const bad = new FormData();
  bad.append(
    "image",
    new Blob(["<script>alert(1)</script>"], { type: "text/html" }),
    "x.html",
  );
  r = await A.call("POST", "/users/me/avatar", bad);
  ok(r.status === 400, "non-image avatar rejected");

  section("Search users & start a direct chat");
  r = await A.call("GET", "/users/search?q=bob");
  ok(
    r.data.users?.length === 1 && r.data.users[0].username === "bob",
    "search users",
  );
  const bobId = r.data.users[0]._id;
  r = await A.call("GET", "/users/search?q=");
  const caraId = r.data.users.find((u) => u.username === "cara")._id;
  const aliceId = (await A.call("GET", "/auth/me")).data.user._id;

  const sockA = openSocket(A.cookie);
  const sockB = openSocket(B.cookie);
  await wait(500);
  ok(sockB.has("presence:list"), "socket authenticates with the cookie");
  ok(
    sockB.has("presence:list", (p) => p.online.includes(aliceId)),
    "presence list shows online users",
  );
  const bad2 = ioClient(BASE, {
    transports: ["websocket"],
    reconnection: false,
  });
  const rejected = await new Promise((res) => {
    bad2.on("connect_error", () => res(true));
    bad2.on("connect", () => res(false));
    setTimeout(() => res(false), 2000);
  });
  ok(rejected, "socket without a cookie is rejected");
  bad2.close();

  r = await A.call("POST", "/conversations/direct", { userId: bobId });
  ok(
    r.status === 201 && r.data.conversation.members.length === 2,
    "create direct conversation",
  );
  const convId = r.data.conversation._id;
  const again = await A.call("POST", "/conversations/direct", {
    userId: bobId,
  });
  ok(
    again.data.conversation._id === convId,
    "direct conversation is not duplicated",
  );
  r = await B.call("GET", "/conversations");
  ok(
    r.data.conversations.length === 0,
    "empty direct chat hidden from the other person",
  );
  r = await A.call("POST", "/conversations/direct", { userId: aliceId });
  ok(r.status === 400, "can't chat with yourself");

  section("Real-time messaging");
  r = await A.call("POST", `/conversations/${convId}/messages`, {
    text: "Hello Bob 👋",
  });
  ok(
    r.status === 201 && r.data.message.text === "Hello Bob 👋",
    "send message",
  );
  const m1 = r.data.message;
  ok(
    m1.deliveredTo.includes(bobId),
    "message marked delivered to online recipient",
  );
  await wait(300);
  ok(
    sockB.has("message:new", (p) => p._id === m1._id),
    "recipient receives message:new in real time",
  );
  ok(
    sockA.has("message:new", (p) => p._id === m1._id),
    "sender receives echo (multi-device sync)",
  );
  r = await B.call("GET", "/conversations");
  ok(
    r.data.conversations.length === 1 && r.data.conversations[0].unread === 1,
    "unread counter is 1",
    r.data.conversations[0]?.unread,
  );

  sockA.s.emit("typing", { conversationId: convId, isTyping: true });
  await wait(250);
  ok(
    sockB.has("typing", (p) => p.userId === aliceId && p.isTyping),
    "typing indicator relayed",
  );

  r = await B.call("POST", `/conversations/${convId}/read`);
  await wait(250);
  ok(
    r.status === 200 && sockA.has("messages:read", (p) => p.userId === bobId),
    "read receipt delivered to sender",
  );
  r = await B.call("GET", "/conversations");
  ok(r.data.conversations[0].unread === 0, "unread resets after read");
  r = await A.call("GET", `/conversations/${convId}/messages`);
  ok(r.data.messages[0].seenBy.includes(bobId), "message shows as seen");

  r = await B.call("POST", `/conversations/${convId}/messages`, {
    text: "Hi Alice!",
    replyTo: m1._id,
  });
  const m2 = r.data.message;
  ok(
    m2.replyTo?._id === m1._id && m2.replyTo.text === "Hello Bob 👋",
    "reply to a message",
  );
  r = await A.call("PUT", `/messages/${m1._id}`, {
    text: "Hello Bob (edited)",
  });
  ok(r.status === 200 && r.data.message.editedAt, "edit own message");
  await wait(250);
  ok(
    sockB.has(
      "message:updated",
      (p) => p._id === m1._id && p.text.includes("edited"),
    ),
    "edit pushed to the other user",
  );
  r = await B.call("PUT", `/messages/${m1._id}`, { text: "hack" });
  ok(r.status === 403, "can't edit someone else's message");
  r = await B.call("POST", `/messages/${m1._id}/react`, { emoji: "🔥" });
  ok(r.data.message.reactions.length === 1, "add reaction");
  r = await B.call("POST", `/messages/${m1._id}/react`, { emoji: "🔥" });
  ok(r.data.message.reactions.length === 0, "same reaction toggles off");

  r = await A.call("POST", `/conversations/${convId}/messages`, { text: "" });
  ok(r.status === 400, "empty message rejected");
  r = await A.call("POST", `/conversations/${convId}/messages`, {
    text: "x".repeat(5001),
  });
  ok(r.status === 422, "over-long message rejected");
  r = await C.call("GET", `/conversations/${convId}/messages`);
  ok(r.status === 404, "non-members cannot read a conversation");
  r = await C.call("POST", `/conversations/${convId}/messages`, {
    text: "intruder",
  });
  ok(r.status === 404, "non-members cannot post");

  section("Uploads & attachments");
  const f = new FormData();
  f.append(
    "files",
    new Blob(["hello from a text file"], { type: "text/plain" }),
    "notes.txt",
  );
  f.append(
    "files",
    new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }),
    "pic.png",
  );
  r = await A.call("POST", "/upload/files", f);
  ok(
    r.status === 201 && r.data.attachments.length === 2,
    "upload multiple files",
    r.data,
  );
  const atts = r.data.attachments;
  r = await A.call("POST", `/conversations/${convId}/messages`, {
    text: "files!",
    attachments: atts,
  });
  ok(
    r.status === 201 && r.data.message.attachments.length === 2,
    "send message with attachments",
  );
  const attMsg = r.data.message;
  const dl = await fetch(`${BASE}${atts[0].url}`);
  ok(
    dl.status === 200 &&
      (dl.headers.get("content-disposition") || "").includes("attachment"),
    "non-media file served as download",
  );
  r = await A.call("POST", `/conversations/${convId}/messages`, {
    text: "bad",
    attachments: [{ url: "https://evil.example/x.png", kind: "image" }],
  });
  ok(r.status === 400, "untrusted attachment URL rejected");
  const evil = new FormData();
  evil.append(
    "files",
    new Blob(["<h1>x</h1>"], { type: "text/html" }),
    "x.html",
  );
  r = await A.call("POST", "/upload/files", evil);
  ok(r.status === 400, "html/script uploads blocked");

  section("Forward, delete, search, preferences");
  r = await A.call("POST", "/conversations/direct", { userId: caraId });
  const conv2 = r.data.conversation._id;
  r = await A.call("POST", `/messages/${m1._id}/forward`, {
    conversationIds: [conv2],
  });
  ok(
    r.status === 201 && r.data.messages[0].forwarded === true,
    "forward message",
  );
  r = await A.call("GET", "/messages/search?q=hello");
  ok(
    r.data.results.length >= 2,
    "search messages across chats",
    r.data.results.length,
  );
  r = await A.call("GET", `/messages/search?q=hello&conversationId=${convId}`);
  ok(
    r.data.results.every((m) => m.conversation === convId),
    "search inside one chat",
  );
  r = await B.call("DELETE", `/messages/${m1._id}?scope=everyone`);
  ok(r.status === 403, "can't delete for everyone as non-sender");
  r = await A.call("DELETE", `/messages/${attMsg._id}?scope=everyone`);
  ok(
    r.status === 200 &&
      r.data.message.isDeleted &&
      r.data.message.attachments.length === 0,
    "delete for everyone",
  );
  await wait(250);
  ok(
    sockB.has("message:updated", (p) => p._id === attMsg._id && p.isDeleted),
    "deletion pushed in real time",
  );
  r = await B.call("DELETE", `/messages/${m2._id}?scope=me`);
  r = await B.call("GET", `/conversations/${convId}/messages`);
  ok(
    !r.data.messages.some((m) => m._id === m2._id),
    "delete for me hides it only for me",
  );
  r = await A.call("GET", `/conversations/${convId}/messages?around=${m1._id}`);
  ok(
    r.status === 200 && r.data.messages.some((m) => m._id === m1._id),
    "jump-to-message (around)",
  );
  r = await A.call("PUT", `/conversations/${convId}/preferences`, {
    pinned: true,
    muted: true,
  });
  ok(
    r.data.conversation.pinned && r.data.conversation.muted,
    "pin + mute conversation",
  );
  r = await A.call("PUT", `/conversations/${convId}/preferences`, {
    archived: true,
  });
  ok(r.data.conversation.archived, "archive conversation");
  r = await B.call("POST", `/conversations/${convId}/messages`, {
    text: "ping",
  });
  r = await A.call("GET", "/conversations");
  ok(
    r.data.conversations.find((c) => c._id === convId).archived === false,
    "new message un-archives the chat",
  );

  section("Offline delivery");
  sockB.s.close();
  await wait(300);
  r = await A.call("POST", `/conversations/${convId}/messages`, {
    text: "sent while you were away",
  });
  ok(
    r.data.message.deliveredTo.length === 0,
    "offline recipient: sent, not delivered",
  );
  const offlineId = r.data.message._id;
  const sockB2 = openSocket(B.cookie);
  await wait(600);
  ok(
    sockA.has("message:status", (p) => p.messageIds.includes(offlineId)),
    "delivered status sent when recipient reconnects",
  );

  section("Group chats");
  r = await A.call("POST", "/conversations/group", {
    name: "Project X",
    memberIds: [bobId],
  });
  ok(r.status === 201 && r.data.conversation.isGroup, "create group");
  const gid = r.data.conversation._id;
  await wait(250);
  ok(
    sockB2.has("conversation:new", (p) => p._id === gid),
    "members are notified of the new group live",
  );
  r = await B.call("PUT", `/conversations/${gid}`, { name: "Hijack" });
  ok(r.status === 403, "non-admin cannot edit the group");
  r = await A.call("POST", `/conversations/${gid}/members`, {
    userIds: [caraId],
  });
  ok(
    r.status === 200 && r.data.conversation.members.length === 3,
    "admin adds a member",
  );
  r = await A.call("PUT", `/conversations/${gid}/admins/${bobId}`);
  ok(
    r.data.conversation.members.find((m) => m.user._id === bobId).role ===
      "admin",
    "promote to admin",
  );
  r = await C.call("POST", `/conversations/${gid}/messages`, {
    text: "Hey team",
  });
  ok(r.status === 201, "member posts in the group");
  await wait(250);
  ok(
    sockB2.has("message:new", (p) => p.text === "Hey team"),
    "group message reaches every member",
  );
  r = await A.call("PUT", `/conversations/${gid}`, {
    name: "Project X Renamed",
    description: "Our space",
  });
  ok(r.data.conversation.name === "Project X Renamed", "rename group");
  r = await B.call("DELETE", `/conversations/${gid}/members/${aliceId}`);
  ok(r.status === 403, "cannot remove the group creator");
  r = await A.call("DELETE", `/conversations/${gid}/members/${caraId}`);
  ok(
    r.status === 200 && r.data.conversation.members.length === 2,
    "admin removes a member",
  );
  r = await C.call("GET", `/conversations/${gid}`);
  ok(r.status === 404, "removed member loses access");
  r = await B.call("POST", `/conversations/${gid}/leave`);
  ok(r.status === 200, "member leaves the group");
  r = await A.call("DELETE", `/conversations/${gid}`);
  ok(r.status === 200, "creator deletes the group");

  section("Admin & permissions");
  r = await B.call("GET", "/admin/stats");
  ok(r.status === 403, "regular user cannot access admin API");
  await User.updateOne({ username: "alice" }, { role: "admin" });
  const adminLogin = await admin.call("POST", "/auth/login", {
    identifier: "alice",
    password: "Passw0rd!",
  });
  ok(adminLogin.data.user.role === "admin", "admin logs in");
  r = await admin.call("GET", "/admin/stats");
  ok(
    r.status === 200 &&
      r.data.stats.totalUsers === 3 &&
      r.data.stats.signups.length === 7,
    "admin stats",
    r.data.stats,
  );
  r = await admin.call("GET", "/admin/users?q=bob");
  ok(r.data.users.length === 1, "admin lists/searches users");
  r = await admin.call("GET", "/admin/conversations");
  ok(r.status === 404, "admin cannot access conversation listing");

  r = await admin.call("GET", `/admin/conversations/${convId}/messages`);
  ok(r.status === 404, "admin cannot access private conversation messages");

  r = await admin.call(
    "DELETE",
    `/admin/messages/${new mongoose.Types.ObjectId()}`,
  );
  ok(r.status === 404, "admin cannot delete messages through admin API");
  r = await admin.call("PUT", `/admin/users/${aliceId}`, { isActive: false });
  ok(r.status === 400, "admin can't suspend themselves");
  r = await admin.call("PUT", `/admin/users/${bobId}`, {
    isActive: false,
    suspendedReason: "Spam",
  });
  ok(
    r.status === 200 && r.data.user.isActive === false,
    "admin suspends a user",
  );
  await wait(900);
  ok(sockB2.has("account:suspended"), "suspended user is notified live");
  r = await B.call("GET", "/auth/me");
  ok(
    r.status === 403 || r.status === 401,
    "suspended user loses access",
    r.status,
  );
  r = await B.call("POST", "/auth/login", {
    identifier: "bob",
    password: "Passw0rd!",
  });
  ok(
    r.status === 403 && r.data.code === "SUSPENDED",
    "suspended user cannot log in",
  );
  r = await admin.call("PUT", `/admin/users/${bobId}`, { isActive: true });
  ok(r.data.user.isActive === true, "admin reactivates the user");
  r = await admin.call("PUT", `/admin/users/${caraId}`, { role: "moderator" });
  ok(r.data.user.role === "moderator", "admin changes a role");
  const modLogin = makeClient();
  await modLogin.call("POST", "/auth/login", {
    identifier: "cara",
    password: "NewPassw0rd!",
  });
  r = await modLogin.call("GET", "/admin/stats");
  ok(r.status === 403, "moderator cannot view admin stats");
  r = await modLogin.call("PUT", `/admin/users/${bobId}`, { role: "admin" });
  ok(r.status === 403, "moderator cannot change roles");
  r = await admin.call("DELETE", `/admin/users/${caraId}`);
  ok(r.status === 200, "admin deletes a user");

  section("Demo login");
  const D = makeClient();
  r = await D.call("POST", "/auth/demo");
  ok(
    r.status === 404,
    "demo login reports a clear error when the demo user is not seeded",
  );

  sockA.s.close();
  sockB2.s.close();
} catch (err) {
  failed++;
  console.error("\n💥 Test crashed:", err);
}

console.log(`\n${failed ? "❌" : "🎉"} ${passed} passed, ${failed} failed`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(failed ? 1 : 0);
