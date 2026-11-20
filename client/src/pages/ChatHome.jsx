import { useState } from "react";
import { MessageSquarePlus, Sparkles } from "lucide-react";
import Button from "../components/ui/Button";
import { NewChatModal, NewGroupModal } from "../components/chat/NewChatModal";
import { useAuth } from "../context/AuthContext";

/** Shown in the main pane when no conversation is selected (desktop). */
export default function ChatHome() {
  const { user } = useAuth();
  const [chat, setChat] = useState(false);
  const [group, setGroup] = useState(false);
  return (
    <div className="chat-bg relative flex h-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="animate-blob absolute -left-20 top-10 h-80 w-80 bg-brand-500/15 blur-3xl" />
      <div
        className="animate-blob absolute -right-16 bottom-0 h-96 w-96 bg-brand-alt/15 blur-3xl"
        style={{ animationDelay: "-8s" }}
      />
      <div className="relative">
        <div className="animate-float bg-brand-gradient shadow-glow mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] text-white">
          <Sparkles className="h-11 w-11" strokeWidth={1.6} />
        </div>
        <h1 className="text-6xl leading-none">
          Hello,{" "}
          <span className="text-gradient">
            {user?.name?.split(" ")[0] || "there"}
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-mute">
          Pick a conversation from the left, or start a new one. Messages you
          send appear instantly for everyone in the chat.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button icon={MessageSquarePlus} onClick={() => setChat(true)}>
            New chat
          </Button>
          <Button variant="outline" onClick={() => setGroup(true)}>
            Create group
          </Button>
        </div>
      </div>
      <NewChatModal
        open={chat}
        onClose={() => setChat(false)}
        onGroup={() => (setChat(false), setGroup(true))}
      />
      <NewGroupModal open={group} onClose={() => setGroup(false)} />
    </div>
  );
}
