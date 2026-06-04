export type ChatMessageForApi = {
  role: "user" | "assistant";
  content: string;
};

export type StoredChatMessage = ChatMessageForApi & {
  id: string;
  character: string;
  mood: string;
  createdAt: number;
};

export type GenerateResponsePayload = {
  messages: ChatMessageForApi[];
  character: string;
  mood: string;
  model_id: string;
};

const SESSION_MESSAGE_LIMIT = 20;
export const DEFAULT_MODEL_ID = "openrouter/free";

export type SelectOption = {
  value: string;
  label: string;
};

export function buildApiUrl(baseUrl: string | undefined, path: string) {
  const normalizedBaseUrl = baseUrl?.trim().replace(/\/+$/, "");
  if (!normalizedBaseUrl) return path;

  return `${normalizedBaseUrl}${path}`;
}

export function createGenerateResponsePayload({
  messages,
  character,
  mood,
  modelId = DEFAULT_MODEL_ID,
}: {
  messages: StoredChatMessage[];
  character: string;
  mood: string;
  modelId?: string;
}): GenerateResponsePayload {
  return {
    messages: messages.slice(-(SESSION_MESSAGE_LIMIT * 2)).map((message) => ({
      role: message.role,
      content: message.content,
    })),
    character,
    mood,
    model_id: modelId,
  };
}

export function extractAvailableModelOptions(data: unknown): SelectOption[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((model): SelectOption[] => {
    if (!model || typeof model !== "object" || !("id" in model)) return [];
    if (typeof model.id !== "string" || model.id.trim().length === 0) {
      return [];
    }

    const value = model.id.trim();
    const label =
      "name" in model &&
      typeof model.name === "string" &&
      model.name.trim().length > 0
        ? model.name.trim()
        : value;

    return [{ value, label }];
  });
}

export function extractAssistantResponse(data: unknown, fallback: string) {
  if (
    data &&
    typeof data === "object" &&
    "response" in data &&
    typeof data.response === "string" &&
    data.response.trim().length > 0
  ) {
    return data.response;
  }

  return fallback;
}
