"use client";

import {
  ArrowUp,
  Broom,
  CaretDown,
  Sparkle,
  Trash,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type initSqlJs from "sql.js";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
  character: string;
  mood: string;
  createdAt: number;
};

type SQLDatabase = initSqlJs.Database;
type SQLiteRow = Record<string, initSqlJs.SqlValue>;

const SESSION_MESSAGE_LIMIT = 20;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const DEFAULT_MODEL_ID = "openrouter/auto";
const SQLITE_STORAGE_KEY = "pretendo-chat-sqlite-db";
const COMPOSER_MAX_HEIGHT = 144;

const characters = [
  "Donald Trump",
  "Elon Musk",
  "Naval Ravikant",
  "Mark Zuckerberg",
  "Steve Jobs",
  "Jim Carrey",
  "Osho Rajneesh",
  "Jiddu Krishnamurti",
  "Joe Rogan",
  "Gordon Ramsay",
  "Simon Cowell",
  "Taylor Swift",
  "Arnold Schwarzenegger",
  "Snoop Dogg",
];

const moods = ["Funny", "Serious", "Pissed off", "Angry", "Calm"];

const starterPrompts = [
  "Explain quantum computing in one paragraph.",
  "Make this idea sound calmer.",
  "What would Steve Jobs say about focus?",
  "Give me a practical learning plan.",
];

function createMessageId(role: Role) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rowToMessage(row: SQLiteRow): Message {
  return {
    id: String(row.id),
    role: row.role === "assistant" ? "assistant" : "user",
    content: String(row.content ?? ""),
    character: String(row.character ?? characters[0]),
    mood: String(row.mood ?? moods[0]),
    createdAt: Number(row.created_at ?? Date.now()),
  };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function persistDatabase(db: SQLDatabase) {
  localStorage.setItem(SQLITE_STORAGE_KEY, bytesToBase64(db.export()));
}

function execSql(db: SQLDatabase, sql: string, bind?: (string | number)[]) {
  db.run(sql, bind ?? undefined);
  persistDatabase(db);
}

function selectMessages(db: SQLDatabase) {
  const result = db.exec(
    "SELECT id, role, content, character, mood, created_at FROM messages ORDER BY created_at ASC;",
  )[0];

  if (!result) return [];

  return result.values.map((values) =>
    result.columns.reduce<SQLiteRow>((row, column, index) => {
      row[column] = values[index];
      return row;
    }, {}),
  );
}

async function createSQLiteStore() {
  const initSqlJsModule = await import("sql.js");
  const SQL = await initSqlJsModule.default({
    locateFile: (file) => `/${file}`,
  });
  const savedDatabase = localStorage.getItem(SQLITE_STORAGE_KEY);
  const db = savedDatabase
    ? new SQL.Database(base64ToBytes(savedDatabase))
    : new SQL.Database();

  execSql(
    db,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      character TEXT NOT NULL,
      mood TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );`,
  );

  return { db };
}

function fallbackReply(prompt: string, character: string, mood: string) {
  const moodHint =
    mood === "Calm"
      ? "with a calm, grounded tone"
      : mood === "Funny"
        ? "with a light comic edge"
        : mood === "Serious"
          ? "with direct, serious framing"
          : "with sharper energy while staying safe";

  return `Inspired by ${character}, it would answer ${moodHint}: ${prompt.trim()} Start with the simplest version, name the tradeoff, and end with one concrete next step.`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState(characters[4]);
  const [selectedMood, setSelectedMood] = useState(moods[4]);
  const [isSending, setIsSending] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [error, setError] = useState("");
  const storeRef = useRef<Awaited<ReturnType<typeof createSQLiteStore>> | null>(
    null,
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const sentMessageCount = messages.filter(
    (message) => message.role === "user",
  ).length;
  const remainingMessages = SESSION_MESSAGE_LIMIT - sentMessageCount;
  const isLimitReached = remainingMessages <= 0;
  const canSend =
    input.trim().length > 0 && !isSending && !isLimitReached && storageReady;

  const insertMessage = useCallback(async (message: Message) => {
    const store = storeRef.current;
    if (!store) return;

    execSql(
      store.db,
      `INSERT INTO messages (id, role, content, character, mood, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        message.id,
        message.role,
        message.content,
        message.character,
        message.mood,
        message.createdAt,
      ],
    );
  }, []);

  const resizeComposer = useCallback(() => {
    const composer = composerRef.current;
    if (!composer) return;

    composer.style.height = "auto";
    const nextHeight = Math.min(composer.scrollHeight, COMPOSER_MAX_HEIGHT);
    composer.style.height = `${nextHeight}px`;
    composer.style.overflowY =
      composer.scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const store = await createSQLiteStore();
        if (cancelled) return;

        const rows = selectMessages(store.db);

        storeRef.current = store;
        setMessages(rows.map(rowToMessage).slice(-(SESSION_MESSAGE_LIMIT * 2)));
        setStorageReady(true);
      } catch (storageError) {
        console.error(storageError);
        setError(
          "Local chat storage could not initialize in this browser session.",
        );
        setStorageReady(false);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
      storeRef.current?.db.close();
    };
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [input, resizeComposer]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const scrollToLatest = () => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    };

    requestAnimationFrame(() => {
      scrollToLatest();
      requestAnimationFrame(scrollToLatest);
    });
  }, [messages, isSending]);

  async function requestAssistantReply(
    nextMessages: Message[],
    prompt: string,
  ) {
    if (!API_BASE_URL) {
      return fallbackReply(prompt, selectedCharacter, selectedMood);
    }

    const payload = {
      messages: nextMessages
        .slice(-(SESSION_MESSAGE_LIMIT * 2))
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
      character: selectedCharacter,
      mood: selectedMood,
      model_id: DEFAULT_MODEL_ID,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok)
        throw new Error(`API responded with ${response.status}`);
      const data = (await response.json()) as {
        response?: string;
        message?: string;
        content?: string;
      };
      return (
        data.response ??
        data.message ??
        data.content ??
        fallbackReply(prompt, selectedCharacter, selectedMood)
      );
    } catch {
      return fallbackReply(prompt, selectedCharacter, selectedMood);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!canSend || !content) return;

    setError("");
    setInput("");
    setIsSending(true);
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      resizeComposer();
    });

    const userMessage: Message = {
      id: createMessageId("user"),
      role: "user",
      content,
      character: selectedCharacter,
      mood: selectedMood,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    await insertMessage(userMessage);

    const assistantContent = await requestAssistantReply(nextMessages, content);
    const assistantMessage: Message = {
      id: createMessageId("assistant"),
      role: "assistant",
      content: assistantContent,
      character: selectedCharacter,
      mood: selectedMood,
      createdAt: Date.now() + 1,
    };

    setMessages((current) => [...current, assistantMessage]);
    await insertMessage(assistantMessage);
    setIsSending(false);
  }

  async function clearChat() {
    const store = storeRef.current;
    if (!store) return;

    execSql(store.db, "DELETE FROM messages;");
    setMessages([]);
    setError("");
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <main
      className="h-screen overflow-hidden bg-[#17131b] text-[#f4eef8]"
      aria-label="Pretendo chat"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(67,52,80,0.34),transparent_34%),linear-gradient(180deg,rgba(24,20,30,0.9),rgba(13,11,16,0.98))]" />

      <section className="relative mx-auto flex h-screen w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 -mx-4 shrink-0 border-b border-white/[0.055] bg-[#17131b]/88 px-4 py-3 backdrop-blur-2xl sm:mx-0 sm:border-b-0 sm:bg-[#17131b]/80 sm:px-0 sm:py-4">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#f6b1d5] shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
                <Sparkle size={18} weight="duotone" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Pretendo</p>
              </div>
            </div>
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="scrollbar-hidden flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-1 py-6 sm:py-8"
          role="region"
          aria-label="Chat messages"
          tabIndex={0}
        >
          {messages.length === 0 ? (
            <div className="flex min-h-full w-full max-w-4xl mx-1 flex-col justify-center py-8">
              <h1 className="text-center text-3xl font-semibold tracking-normal text-white sm:text-5xl">
                How can I help you?
              </h1>

              <div className="mx-auto mt-9 w-full max-w-2xl divide-y divide-white/[0.055]">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="flex w-full items-center justify-between gap-5 py-5 text-left text-lg text-[#c2b5ca] transition hover:text-white"
                  >
                    <span>{prompt}</span>
                    <ArrowUp
                      className="shrink-0 rotate-45 opacity-0 transition group-hover:opacity-100"
                      size={16}
                    />
                  </button>
                ))}
              </div>

              <MessageLimitStatus
                count={sentMessageCount}
                limit={SESSION_MESSAGE_LIMIT}
                remaining={remainingMessages}
                isLimitReached={isLimitReached}
                className="mt-8 justify-center"
              />
            </div>
          ) : (
            <div
              className="w-full max-w-4xl px-1 space-y-5 pb-8 pt-4 sm:pt-8"
              role="log"
              aria-label="Conversation"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  aria-label={
                    message.role === "user"
                      ? "Your message"
                      : `Pretendo message in ${message.character}, ${message.mood}`
                  }
                >
                  {message.role === "assistant" ? (
                    <div
                      className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#7a4466]/45 bg-[#2a1524] text-[#f5a7cf]"
                      aria-hidden="true"
                    >
                      <Sparkle size={17} weight="fill" />
                    </div>
                  ) : null}

                  <div
                    className={`max-w-[86%] rounded-[22px] border px-4 py-3 text-[15px] leading-7 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:max-w-[82%] ${
                      message.role === "user"
                        ? "border-[#a74375]/35 bg-[#3a1f31] text-white"
                        : "border-white/8 bg-white/[0.055] text-[#ded5e6]"
                    }`}
                  >
                    <p>{message.content}</p>
                    {message.role === "assistant" ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#9f91aa]">
                        <span>{message.character}</span>
                        <span className="h-1 w-1 rounded-full bg-[#62566b]" />
                        <span>{message.mood}</span>
                      </div>
                    ) : null}
                  </div>

                  {message.role === "user" ? (
                    <div
                      className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[#d4cadb]"
                      aria-hidden="true"
                    >
                      <UserCircle size={18} weight="duotone" />
                    </div>
                  ) : null}
                </article>
              ))}

              {isSending ? (
                <div
                  className="flex items-center gap-3 text-sm text-[#b8aabc]"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-[#f26aa9]"
                    aria-hidden="true"
                  />
                  Thinking in {selectedMood.toLowerCase()} mode...
                </div>
              ) : null}

              <MessageLimitStatus
                count={sentMessageCount}
                limit={SESSION_MESSAGE_LIMIT}
                remaining={remainingMessages}
                isLimitReached={isLimitReached}
                className="justify-center pt-1"
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 shrink-0 px-4 pb-1.5 pt-1 sm:mx-0 sm:px-0 sm:py-3">
          <div className="mx-auto max-w-4xl">
            {error ? (
              <div
                id="composer-error"
                className="mb-2 flex items-center gap-2 rounded-2xl border border-[#a74375]/35 bg-[#351725] px-3 py-2 text-sm text-[#ffc5df]"
                role="alert"
              >
                <WarningCircle size={18} weight="duotone" />
                {error}
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className="rounded-[18px] border border-white/[0.08] bg-[#241f28]/95 p-2 shadow-[0_-18px_56px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-2xl sm:rounded-[22px] sm:p-2.5"
              aria-label="Send a chat message"
            >
              <label htmlFor="chat-message" className="sr-only">
                Message
              </label>
              <textarea
                ref={composerRef}
                id="chat-message"
                suppressHydrationWarning
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  requestAnimationFrame(resizeComposer);
                }}
                onKeyDown={handleComposerKeyDown}
                placeholder={
                  isLimitReached
                    ? "Clear local chat to start again..."
                    : "Type your message here..."
                }
                rows={2}
                disabled={isLimitReached}
                className="scrollbar-hidden min-h-12 w-full resize-none bg-transparent px-2 py-1 text-[15px] leading-6 text-white outline-none placeholder:text-[#8f8198] disabled:cursor-not-allowed"
                aria-describedby={
                  error ? "composer-help composer-error" : "composer-help"
                }
                aria-invalid={Boolean(error)}
              />
              <p id="composer-help" className="sr-only">
                Press Command Enter or Control Enter to send. Choose a character
                and mood before sending.
              </p>

              <div className="flex items-center gap-2 border-t border-white/[0.06] pt-2">
                <div className="scrollbar-hidden flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
                  <SelectControl
                    label="Voice"
                    value={selectedCharacter}
                    options={characters}
                    onChange={setSelectedCharacter}
                    mobileWidth="w-[132px]"
                  />
                  <SelectControl
                    label="Mood"
                    value={selectedMood}
                    options={moods}
                    onChange={setSelectedMood}
                    mobileWidth="w-[88px]"
                  />
                </div>

                <div className="flex shrink-0 items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={clearChat}
                    disabled={messages.length === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#c7bccd] transition hover:border-[#a74375]/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:gap-1.5 sm:px-2.5 sm:text-xs sm:font-semibold"
                    aria-label="Clear chat"
                    title="Clear chat"
                  >
                    <Trash size={14} weight="duotone" />
                    <span className="hidden sm:inline">Clear chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInput("");
                      setError("");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-[#c9bdcf] transition hover:border-white/15 hover:bg-white/[0.075] hover:text-white"
                    aria-label="Clear composer"
                    title="Clear composer"
                  >
                    <Broom size={15} weight="duotone" />
                  </button>
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#a74375]/50 bg-[#6d2450] text-white shadow-[0_10px_30px_rgba(167,67,117,0.25)] transition hover:bg-[#82305f] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.045] disabled:text-[#706676] disabled:shadow-none"
                    aria-label="Send message"
                    title="Send message"
                  >
                    {isSending ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <ArrowUp size={16} weight="bold" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function MessageLimitStatus({
  count,
  limit,
  remaining,
  isLimitReached,
  className = "",
}: {
  count: number;
  limit: number;
  remaining: number;
  isLimitReached: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-xs text-[#a99bae] ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[#d8cedf]">
        {count}/{limit} sent
      </span>
      <span>{isLimitReached ? "Limit reached" : `${remaining} remaining`}</span>
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
  mobileWidth = "w-auto",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  mobileWidth?: string;
}) {
  return (
    <label
      className={`group relative flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.09] bg-[#302835] px-2 text-xs font-semibold text-[#d0c4d7] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-[#c75f98]/65 focus-within:bg-[#372d3b] hover:border-white/15 hover:bg-[#372d3b] sm:h-9 sm:w-auto sm:rounded-2xl sm:px-2.5 sm:text-sm ${mobileWidth}`}
    >
      <span className="hidden text-xs font-medium text-[#a799b0] sm:inline">
        {label}
      </span>
      <select
        value={value}
        suppressHydrationWarning
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none bg-transparent pr-5 text-[#f7eff9] outline-none sm:max-w-[156px]"
        aria-label={label}
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
            className="bg-[#211824] text-white"
          >
            {option}
          </option>
        ))}
      </select>
      <CaretDown
        className="pointer-events-none absolute right-2 text-[#9c8ea5] sm:right-3"
        size={13}
        weight="bold"
      />
    </label>
  );
}
