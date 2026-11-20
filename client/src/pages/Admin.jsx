import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  Users,
  Wifi,
} from "lucide-react";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import FloatingMenu from "../components/ui/FloatingMenu";
import Input from "../components/ui/Input";
import { Badge, EmptyState, MenuItem, Spinner } from "../components/ui/misc";
import { ConfirmModal } from "../components/chat/GroupModals";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api, errMsg } from "../lib/api";
import { cn, listStamp } from "../lib/utils";

const TABS = [
  ["overview", "Overview", LayoutDashboard],
  ["users", "Users", Users],
];

function StatCard({ icon: Icon, label, value, hint, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-500/12 text-brand-600",
    green: "bg-emerald-500/12 text-emerald-600",
    amber: "bg-amber-500/15 text-amber-600",
    rose: "bg-rose-500/12 text-rose-600",
  };

  return (
    <div className="shadow-soft rounded-3xl border border-line bg-card p-5">
      <span
        className={cn(
          "mb-4 flex h-11 w-11 items-center justify-center rounded-2xl",
          tones[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-display text-5xl leading-none">{value}</p>
      <p className="mt-2 text-sm font-semibold">{label}</p>
      {hint && <p className="text-xs text-mute">{hint}</p>}
    </div>
  );
}

function BarChart({ title, data, color }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="shadow-soft rounded-3xl border border-line bg-card p-5">
      <h3 className="text-2xl">{title}</h3>
      <div className="mt-5 flex h-40 items-end gap-2.5">
        {data.map((d) => (
          <div
            key={d.date}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <span className="text-[11px] font-bold opacity-0 transition group-hover:opacity-100">
              {d.count}
            </span>
            <div
              className="w-full rounded-t-xl transition-all duration-700"
              style={{
                height: `${Math.max((d.count / max) * 100, 4)}%`,
                background: color,
              }}
            />
            <span className="text-[11px] text-mute">
              {new Date(d.date + "T00:00:00Z").toLocaleDateString([], {
                weekday: "short",
                timeZone: "UTC",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setStats(r.data.stats))
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error)
    return <p className="py-10 text-center text-sm text-rose-500">{error}</p>;

  if (!stats)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Registered users"
          value={stats.totalUsers}
          hint={`${stats.verifiedUsers} verified`}
        />

        <StatCard
          icon={Wifi}
          tone="green"
          label="Online now"
          value={stats.onlineNow}
          hint="Live socket connections"
        />

        <StatCard
          icon={MessageSquare}
          tone="amber"
          label="Messages"
          value={stats.totalMessages}
          hint={`${stats.messagesToday} today`}
        />

        <StatCard
          icon={Ban}
          tone="rose"
          label="Suspended"
          value={stats.suspendedUsers}
          hint={`${stats.staff} staff accounts`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart
          title="New sign-ups · last 7 days"
          data={stats.signups}
          color="linear-gradient(180deg, var(--brand-400), var(--brand-600))"
        />

        <BarChart
          title="Messages · last 7 days"
          data={stats.messages}
          color="linear-gradient(180deg, var(--brand-alt), var(--brand-500))"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="shadow-soft rounded-3xl border border-line bg-card p-5">
          <h3 className="text-2xl">Newest members</h3>

          <ul className="mt-3 divide-y divide-line">
            {stats.recentUsers.map((u) => (
              <li key={u._id} className="flex items-center gap-3 py-3">
                <Avatar src={u.avatar} name={u.name} size="md" />

                <div className="min-w-0 flex-1">
                  <p className="font-display truncate text-xl leading-tight">
                    {u.name}
                  </p>
                  <p className="truncate text-xs text-mute">{u.email}</p>
                </div>

                <span className="text-xs text-mute">
                  {listStamp(u.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shadow-soft rounded-3xl border border-line bg-card p-5">
          <h3 className="text-2xl">Conversations</h3>

          <dl className="mt-4 space-y-4 text-sm">
            {[
              ["Total", stats.totalConversations],
              ["Direct chats", stats.directChats],
              ["Groups", stats.groups],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between border-b border-line pb-3 last:border-0"
              >
                <dt className="text-mute">{k}</dt>
                <dd className="font-display text-3xl">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

const roleTone = { admin: "red", moderator: "amber", user: "gray" };

function Pager({ page, pages, total, onPage }) {
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-mute">
      <span>{total} total</span>

      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-full p-2 transition hover:bg-soft disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="font-semibold text-ink">
          {page} / {pages}
        </span>

        <button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded-full p-2 transition hover:bg-soft disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function UsersTab() {
  const { user: me } = useAuth();
  const toast = useToast();
  const isAdmin = me.role === "admin";

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(null);
  const [suspend, setSuspend] = useState(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data: d } = await api.get("/admin/users", {
        params: { q, role, status, page },
      });

      setData(d);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, role, status, page, toast]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const update = async (u, body, ok) => {
    try {
      await api.put(`/admin/users/${u._id}`, body);
      toast.success(ok);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const rows = data?.users || [];

  const manageable = (u) =>
    String(u._id) !== String(me._id) && (isAdmin || u.role === "user");

  return (
    <div className="shadow-soft overflow-hidden rounded-3xl border border-line bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-mute" />

          <input
            value={q}
            onChange={(e) => (setQ(e.target.value), setPage(1))}
            placeholder="Search name, username or email"
            className="h-11 w-full rounded-xl border border-line bg-soft pl-10 pr-3 text-sm outline-none focus:border-brand-300 focus:bg-card focus:ring-4 focus:ring-brand-500/12"
          />
        </div>

        <select
          value={role}
          onChange={(e) => (setRole(e.target.value), setPage(1))}
          className="h-11 rounded-xl border border-line bg-card px-3 text-sm outline-none focus:border-brand-300"
        >
          <option value="">All roles</option>
          <option value="user">Users</option>
          <option value="moderator">Moderators</option>
          <option value="admin">Admins</option>
        </select>

        <select
          value={status}
          onChange={(e) => (setStatus(e.target.value), setPage(1))}
          className="h-11 rounded-xl border border-line bg-card px-3 text-sm outline-none focus:border-brand-300"
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          text="Try a different search or filter."
        />
      ) : (
        <div
          className={cn(
            "overflow-x-auto transition-opacity",
            loading && "opacity-60",
          )}
        >
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-soft/60 text-[11px] font-bold uppercase tracking-[0.12em] text-mute">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {rows.map((u) => (
                <tr key={u._id} className="transition hover:bg-soft/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={u.avatar}
                        name={u.name}
                        size="md"
                        online={u.online}
                      />

                      <div className="min-w-0">
                        <p className="font-display truncate text-xl leading-tight">
                          {u.name}
                        </p>
                        <p className="truncate text-xs text-mute">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Badge tone={roleTone[u.role]}>{u.role}</Badge>
                  </td>

                  <td className="px-4 py-3">
                    {!u.isActive ? (
                      <Badge tone="red" title={u.suspendedReason}>
                        Suspended
                      </Badge>
                    ) : !u.isVerified ? (
                      <Badge tone="amber">Unverified</Badge>
                    ) : (
                      <Badge tone="green">Active</Badge>
                    )}
                  </td>

                  <td className="px-4 py-3 text-mute">
                    {new Date(u.createdAt).toLocaleDateString([], {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  <td className="px-4 py-3 text-mute">
                    {u.online ? (
                      <span className="font-semibold text-emerald-500">
                        online
                      </span>
                    ) : (
                      listStamp(u.lastSeen)
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {manageable(u) && (
                      <button
                        onClick={(e) => setMenu({ anchor: e.currentTarget, u })}
                        className="rounded-full p-2 text-mute transition hover:bg-line/60 hover:text-ink"
                        aria-label={`Manage ${u.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <Pager
          page={data.page}
          pages={data.pages}
          total={data.total}
          onPage={setPage}
        />
      )}

      {menu && (
        <FloatingMenu anchor={menu.anchor} onClose={() => setMenu(null)}>
          {menu.u.isActive ? (
            <MenuItem
              icon={Ban}
              onClick={() => (setSuspend(menu.u), setReason(""), setMenu(null))}
            >
              Suspend account
            </MenuItem>
          ) : (
            <MenuItem
              icon={UserCheck}
              onClick={() => (
                update(
                  menu.u,
                  { isActive: true },
                  `${menu.u.name} reactivated`,
                ),
                setMenu(null)
              )}
            >
              Reactivate account
            </MenuItem>
          )}

          {isAdmin && menu.u.role !== "moderator" && (
            <MenuItem
              icon={ShieldCheck}
              onClick={() => (
                update(
                  menu.u,
                  { role: "moderator" },
                  `${menu.u.name} is now a moderator`,
                ),
                setMenu(null)
              )}
            >
              Make moderator
            </MenuItem>
          )}

          {isAdmin && menu.u.role !== "admin" && (
            <MenuItem
              icon={ShieldCheck}
              onClick={() => (
                update(
                  menu.u,
                  { role: "admin" },
                  `${menu.u.name} is now an admin`,
                ),
                setMenu(null)
              )}
            >
              Make admin
            </MenuItem>
          )}

          {isAdmin && menu.u.role !== "user" && (
            <MenuItem
              icon={ShieldOff}
              onClick={() => (
                update(
                  menu.u,
                  { role: "user" },
                  `${menu.u.name} is now a regular user`,
                ),
                setMenu(null)
              )}
            >
              Set as regular user
            </MenuItem>
          )}

          <MenuItem
            icon={LogOut}
            onClick={() => (
              setConfirm({ type: "logout", u: menu.u }),
              setMenu(null)
            )}
          >
            Force sign-out
          </MenuItem>

          {isAdmin && menu.u.role !== "admin" && (
            <MenuItem
              icon={Trash2}
              danger
              onClick={() => (
                setConfirm({ type: "delete", u: menu.u }),
                setMenu(null)
              )}
            >
              Delete account
            </MenuItem>
          )}
        </FloatingMenu>
      )}

      <Modal
        open={Boolean(suspend)}
        onClose={() => setSuspend(null)}
        size="sm"
        title={`Suspend ${suspend?.name}?`}
        subtitle="They will be signed out immediately and cannot log in."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspend(null)}>
              Cancel
            </Button>

            <Button
              variant="danger"
              onClick={async () => (
                await update(
                  suspend,
                  { isActive: false, suspendedReason: reason },
                  `${suspend.name} suspended`,
                ),
                setSuspend(null)
              )}
            >
              Suspend
            </Button>
          </>
        }
      >
        <Input
          label="Reason (shown to the user)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={140}
          placeholder="e.g. Violating community guidelines"
        />
      </Modal>

      <ConfirmModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={
          confirm?.type === "delete"
            ? `Delete ${confirm?.u.name}?`
            : `Sign ${confirm?.u.name} out?`
        }
        text={
          confirm?.type === "delete"
            ? "Their account, direct chats and group memberships are permanently removed. This cannot be undone."
            : "They will be signed out on every device and need to log in again."
        }
        confirmLabel={
          confirm?.type === "delete" ? "Delete account" : "Sign out"
        }
        danger={confirm?.type === "delete"}
        onConfirm={async () => {
          try {
            if (confirm.type === "delete") {
              await api.delete(`/admin/users/${confirm.u._id}`);
            } else {
              await api.post(`/admin/users/${confirm.u._id}/logout`);
            }

            toast.success(
              confirm.type === "delete" ? "User deleted" : "User signed out",
            );

            load();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  if (user.role === "user") return <Navigate to="/app" replace />;

  const body = {
    overview: <Overview />,
    users: <UsersTab />,
  }[tab];

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl leading-none sm:text-6xl">Admin</h1>

            <p className="mt-2 text-sm text-mute">
              Signed in as <b>{user.role}</b>.{" "}
              {user.role === "moderator"
                ? "You can manage regular user accounts."
                : "You can manage platform users and settings."}
            </p>
          </div>

          <div className="scroll-hide flex gap-1.5 overflow-x-auto">
            {TABS.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                  tab === id
                    ? "bg-ink text-paper"
                    : "bg-soft text-mute hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div key={tab} className="animate-slide-up">
          {body}
        </div>
      </div>
    </div>
  );
}
