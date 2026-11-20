import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bell,
  BellOff,
  Info,
  MoreVertical,
  Pin,
  PinOff,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import { Dropdown, MenuItem, Spinner } from "../ui/misc";
import MessageList from "./MessageList";
import Composer from "./Composer";
import InfoPanel from "./InfoPanel";
import ForwardModal from "./ForwardModal";
import { ConfirmModal, DeleteMessageModal } from "./GroupModals";
import { api, errMsg } from "../../lib/api";
import {
  cn,
  convAvatar,
  convTitle,
  lastSeenLabel,
  listStamp,
  otherMember,
  previewOf,
} from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useToast } from "../../context/ToastContext";

function Subtitle({ conv, meId }) {
  const { typing, isOnline, lastSeenOf } = useChat();
  const typers = Object.keys(typing[conv._id] || {})
    .map(
      (id) =>
        conv.members
          .find((m) => String(m.user?._id) === id)
          ?.user?.name?.split(" ")[0],
    )
    .filter(Boolean);

  if (typers.length)
    return (
      <span className="font-semibold italic text-brand-600">
        {conv.isGroup ? `${typers.join(", ")} typing…` : "typing…"}
      </span>
    );
  if (conv.isGroup) {
    const online = conv.members.filter((m) => isOnline(m.user?._id)).length;
    return (
      <span>
        {conv.members.length} members{online > 0 ? ` · ${online} online` : ""}
      </span>
    );
  }
  const other = otherMember(conv, meId);
  if (!other) return <span>Account deleted</span>;
  if (other.hidesOnline) return <span>@{other.username}</span>;
  return isOnline(other._id) ? (
    <span className="font-semibold text-emerald-500">online</span>
  ) : (
    <span>{lastSeenLabel(lastSeenOf(other))}</span>
  );
}

export default function ChatWindow() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const {
    conversations,
    convLoading,
    setActiveId,
    openConversation,
    deleteMessage,
    setPreference,
    clearChat,
    jumpToMessage,
    markRead,
    isOnline,
  } = useChat();
  const toast = useToast();
  const conv = conversations.find((c) => c._id === id);

  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [forwarding, setForwarding] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [info, setInfo] = useState(
    () => window.matchMedia("(min-width: 1280px)").matches,
  );
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [clearAsk, setClearAsk] = useState(false);
  const [dragging, setDragging] = useState(false);
  const composer = useRef(null);
  const dragDepth = useRef(0);

  // tell the provider which chat is open + load / mark-read it
  useEffect(() => {
    setActiveId(id);
    openConversation(id);
    setReplyTo(null);
    setEditing(null);
    setSearch(false);
    return () => setActiveId(null);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the open chat marked as read while the window is visible
  useEffect(() => {
    if (conv?.unread && document.visibilityState === "visible") markRead(id);
  }, [conv?.unread, id, markRead]);

  const onReply = useCallback((m) => {
    setEditing(null);
    setReplyTo(m);
  }, []);
  const onEdit = useCallback((m) => {
    setReplyTo(null);
    setEditing(m);
  }, []);

  const onDragEnter = (e) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    dragDepth.current++;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (!dragDepth.current) setDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (e.dataTransfer?.files?.length)
      composer.current?.addFiles(e.dataTransfer.files);
  };

  if (convLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }
  if (!conv) return <Navigate to="/app" replace />;

  const title = convTitle(conv, user._id);
  const other = !conv.isGroup ? otherMember(conv, user._id) : null;

  const pref = async (prefs, ok) => {
    setMenu(false);
    try {
      await setPreference(conv._id, prefs);
      if (ok) toast.success(ok);
      if (prefs.archived) nav("/app");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      <section
        className="relative flex min-w-0 flex-1 flex-col"
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <header className="relative z-50 flex items-center gap-2 border-b border-line bg-card/80 px-2 py-3 backdrop-blur-xl sm:gap-3 sm:px-5">
          <button
            onClick={() => nav("/app")}
            className="rounded-full p-2 text-mute transition hover:bg-soft hover:text-ink md:hidden"
            aria-label="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setInfo((i) => !i)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 text-left transition hover:bg-soft/70"
          >
            <Avatar
              src={convAvatar(conv, user._id)}
              name={title}
              size="md"
              group={conv.isGroup}
              online={
                other && !other.hidesOnline ? isOnline(other._id) : undefined
              }
            />
            <span className="min-w-0">
              <span className="font-display block truncate text-[25px] leading-none">
                {title}
              </span>
              <span className="mt-1 block truncate text-[13px] text-mute">
                <Subtitle conv={conv} meId={user._id} />
              </span>
            </span>
          </button>

          <button
            onClick={() => setSearch((s) => !s)}
            className={cn(
              "rounded-full p-2.5 transition hover:bg-soft",
              search
                ? "bg-brand-500/10 text-brand-600"
                : "text-mute hover:text-ink",
            )}
            aria-label="Search in chat"
            title="Search in chat"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => setInfo((i) => !i)}
            className={cn(
              "rounded-full p-2.5 transition hover:bg-soft",
              info
                ? "bg-brand-500/10 text-brand-600"
                : "text-mute hover:text-ink",
            )}
            aria-label="Chat info"
            title="Chat info"
          >
            <Info className="h-5 w-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenu((m) => !m)}
              className="rounded-full p-2.5 text-mute transition hover:bg-soft hover:text-ink"
              aria-label="More options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            <Dropdown open={menu} onClose={() => setMenu(false)}>
              <MenuItem
                icon={conv.pinned ? PinOff : Pin}
                onClick={() =>
                  pref(
                    { pinned: !conv.pinned },
                    conv.pinned ? "Unpinned" : "Pinned to the top",
                  )
                }
              >
                {conv.pinned ? "Unpin chat" : "Pin chat"}
              </MenuItem>
              <MenuItem
                icon={conv.muted ? Bell : BellOff}
                onClick={() =>
                  pref(
                    { muted: !conv.muted },
                    conv.muted ? "Notifications on" : "Notifications muted",
                  )
                }
              >
                {conv.muted ? "Unmute" : "Mute notifications"}
              </MenuItem>
              <MenuItem
                icon={conv.archived ? ArchiveRestore : Archive}
                onClick={() =>
                  pref(
                    { archived: !conv.archived },
                    conv.archived ? "Chat restored" : "Chat archived",
                  )
                }
              >
                {conv.archived ? "Unarchive" : "Archive chat"}
              </MenuItem>
              <MenuItem
                icon={Trash2}
                danger
                onClick={() => (setMenu(false), setClearAsk(true))}
              >
                Clear chat
              </MenuItem>
            </Dropdown>
          </div>
        </header>

        {search && (
          <InChatSearch
            conv={conv}
            meId={user._id}
            onClose={() => setSearch(false)}
            onPick={(m) => jumpToMessage(conv._id, m._id)}
          />
        )}

        <MessageList
          conv={conv}
          meId={user._id}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={setDeleting}
          onForward={setForwarding}
        />

        <Composer
          key={conv._id}
          ref={composer}
          conv={conv}
          meId={user._id}
          replyTo={replyTo}
          editing={editing}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditing(null)}
        />

        {dragging && (
          <div className="animate-fade pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-brand-400 bg-brand-500/12 backdrop-blur-sm">
            <UploadCloud className="h-14 w-14 text-brand-500" />
            <p className="font-display text-3xl">Drop files to share</p>
          </div>
        )}
      </section>

      {info && (
        <div className="animate-slide-in-right fixed inset-0 z-40 w-full border-l border-line bg-card sm:left-auto sm:w-[22rem] xl:static xl:z-auto xl:w-[22rem] xl:shrink-0">
          <InfoPanel
            conv={conv}
            onClose={() => setInfo(false)}
            onClear={() =>
              clearChat(conv._id).then(() => toast.success("Chat cleared"))
            }
          />
        </div>
      )}

      <ForwardModal message={forwarding} onClose={() => setForwarding(null)} />
      <DeleteMessageModal
        message={deleting}
        mine={deleting && String(deleting.sender?._id) === String(user._id)}
        onClose={() => setDeleting(null)}
        onDelete={async (m, scope) => {
          try {
            await deleteMessage(conv._id, m._id, scope);
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
      <ConfirmModal
        open={clearAsk}
        onClose={() => setClearAsk(false)}
        title="Clear this chat?"
        text="All messages will be removed from your view. Other people keep their copy."
        confirmLabel="Clear chat"
        danger
        onConfirm={async () => {
          try {
            await clearChat(conv._id);
            toast.success("Chat cleared");
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function InChatSearch({ conv, meId, onClose, onPick }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/messages/search", {
          params: { q: q.trim(), conversationId: conv._id },
        });
        if (alive) setResults(data.results);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 280);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, conv._id]);

  return (
    <div className="animate-slide-up border-b border-line bg-card/90 px-3 py-3 backdrop-blur-xl sm:px-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-mute" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder="Search in this conversation"
          className="h-11 w-full rounded-xl border border-line bg-soft pl-10 pr-10 text-sm outline-none focus:border-brand-300 focus:bg-card focus:ring-4 focus:ring-brand-500/12"
        />
        <button
          onClick={onClose}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-mute hover:text-ink"
          aria-label="Close search"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {(loading || results) && (
        <div className="scroll-thin mt-2 max-h-56 overflow-y-auto">
          {loading && !results && (
            <p className="py-3 text-center text-sm text-mute">Searching…</p>
          )}
          {results && results.length === 0 && (
            <p className="py-3 text-center text-sm text-mute">
              No messages found for “{q}”.
            </p>
          )}
          {results?.map((m) => (
            <button
              key={m._id}
              onClick={() => onPick(m)}
              className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-soft"
            >
              <span className="flex items-baseline justify-between gap-2 text-xs text-mute">
                <b className="font-semibold text-ink/80">
                  {String(m.sender?._id) === String(meId)
                    ? "You"
                    : m.sender?.name}
                </b>
                <span>{listStamp(m.createdAt)}</span>
              </span>
              <span className="line-clamp-2 text-[13px]">
                {previewOf(m, meId)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
