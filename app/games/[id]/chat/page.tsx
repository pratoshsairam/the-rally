
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: number;
  game_id: number;
  sender_id: string;
  content: string;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

export default function GameChatPage() {
  const supabase = useMemo(() => createClient(), []);

  const [gameId, setGameId] = useState("");
  const [userId, setUserId] = useState("");
  const [gameTitle, setGameTitle] = useState("Game chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Read the game ID from the URL without useParams().
  useEffect(() => {
    const match = window.location.pathname.match(
      /^\/games\/([^/]+)\/chat\/?$/
    );

    if (match?.[1]) {
      setGameId(decodeURIComponent(match[1]));
    } else {
      setError("Could not determine which game this chat belongs to.");
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    const numericGameId = Number(gameId);

    const { data, error: messageError } = await supabase
      .from("game_messages")
      .select("id, game_id, sender_id, content, created_at")
      .eq("game_id", numericGameId)
      .order("created_at", { ascending: true });

    if (messageError) {
      setError("Could not load messages. Please try again.");
      return;
    }

    const rows = (data ?? []) as Message[];
    setMessages(rows);

    const senderIds = [...new Set(rows.map((message) => message.sender_id))];

    if (senderIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", senderIds);

      if (profileRows) {
        const mapped: Record<string, Profile> = {};

        for (const profile of profileRows as Profile[]) {
          mapped[profile.id] = profile;
        }

        setProfiles((previous) => ({ ...previous, ...mapped }));
      }
    }
  }, [gameId, supabase]);

  useEffect(() => {
    if (!gameId) return;

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    async function initialise() {
      setLoading(true);
      setError("");

      const numericGameId = Number(gameId);

      if (!Number.isSafeInteger(numericGameId) || numericGameId <= 0) {
        setError("Invalid game ID.");
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      const currentUserId = authData.user.id;
      setUserId(currentUserId);

      const { data: game, error: gameError } = await supabase
        .from("games")
        .select("id, host_id, title")
        .eq("id", numericGameId)
        .maybeSingle();

      if (!active) return;

      if (gameError || !game) {
        setError(
          "This game could not be found, or you do not have access."
        );
        setLoading(false);
        return;
      }

      setGameTitle(game.title || "Game chat");

      let allowed = game.host_id === currentUserId;

      if (!allowed) {
        const { data: membership, error: membershipError } = await supabase
          .from("game_players")
          .select("id")
          .eq("game_id", numericGameId)
          .eq("user_id", currentUserId)
          .eq("status", "joined")
          .maybeSingle();

        if (!active) return;

        if (membershipError) {
          setError("Could not verify your game membership.");
          setLoading(false);
          return;
        }

        allowed = !!membership;
      }

      if (!allowed) {
        setError(
          "Only the host and joined players can access this chat."
        );
        setLoading(false);
        return;
      }

      await loadMessages();

      if (!active) return;

      channel = supabase
        .channel(`game-chat-${numericGameId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "game_messages",
            filter: `game_id=eq.${numericGameId}`,
          },
          async (payload) => {
            const incoming = payload.new as Message;

            setMessages((previous) => {
              if (previous.some((message) => message.id === incoming.id)) {
                return previous;
              }

              return [...previous, incoming].sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );
            });

            const { data: profile } = await supabase
              .from("profiles")
              .select("id, full_name, username")
              .eq("id", incoming.sender_id)
              .maybeSingle();

            if (profile) {
              setProfiles((previous) => ({
                ...previous,
                [profile.id]: profile as Profile,
              }));
            }
          }
        )
        .subscribe();

      setLoading(false);
    }

    void initialise();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [gameId, loadMessages, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || sending || !userId || !gameId) return;

    setSending(true);
    setError("");

    const { error: sendError } = await supabase
      .from("game_messages")
      .insert({
        game_id: Number(gameId),
        sender_id: userId,
        content,
      });

    if (sendError) {
      setError(
        sendError.code === "42501"
          ? "You do not have permission to send messages in this chat."
          : "Your message could not be sent. Please try again."
      );
    } else {
      setDraft("");
    }

    setSending(false);
  }

  function displayName(senderId: string) {
    const profile = profiles[senderId];

    return profile?.full_name || profile?.username || "Player";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-white px-4 py-6 text-slate-900 sm:px-6">
      <header className="mb-5">
        <Link
          href={gameId ? `/games/${gameId}` : "/games"}
          className="text-sm font-medium text-slate-600 hover:text-black"
        >
          ← Back to game
        </Link>

        <h1 className="mt-4 text-2xl font-bold">{gameTitle}</h1>

        <p className="mt-1 text-sm text-slate-500">
          Group chat for the host and joined players
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section
        aria-label="Game messages"
        className="flex min-h-[50vh] flex-1 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <div className="flex-1 space-y-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading chat…
            </p>
          ) : messages.length === 0 && !error ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.sender_id === userId;

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    mine ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      mine
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <p
                      className={`mb-1 text-xs font-semibold ${
                        mine ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {mine ? "You" : displayName(message.sender_id)}
                    </p>

                    <p className="whitespace-pre-wrap break-words text-sm">
                      {message.content}
                    </p>

                    <p
                      className={`mt-2 text-right text-[11px] ${
                        mine ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {new Intl.DateTimeFormat("en-NZ", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(message.created_at))}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={sendMessage}
          className="mt-5 flex gap-2 border-t border-slate-200 pt-4"
        >
          <label htmlFor="chat-message" className="sr-only">
            Write a message
          </label>

          <input
            id="chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            placeholder="Write a message…"
            disabled={loading || sending || !userId || !!error}
            className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={
              loading || sending || !draft.trim() || !!error
            }
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}