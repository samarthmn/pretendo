import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApiUrl,
  createGenerateResponsePayload,
  extractAvailableModelOptions,
  extractAssistantResponse,
} from "./api-client.ts";

test("buildApiUrl uses same-origin api paths by default", () => {
  assert.equal(
    buildApiUrl(undefined, "/api/generate-response"),
    "/api/generate-response",
  );
  assert.equal(buildApiUrl("", "/api/generate-response"), "/api/generate-response");
});

test("buildApiUrl joins configured API bases without duplicate slashes", () => {
  assert.equal(
    buildApiUrl("http://localhost:8000/", "/api/generate-response"),
    "http://localhost:8000/api/generate-response",
  );
});

test("extractAssistantResponse reads the backend response contract", () => {
  assert.equal(
    extractAssistantResponse({ response: "from api" }, "fallback"),
    "from api",
  );
});

test("extractAssistantResponse falls back for unknown response bodies", () => {
  assert.equal(
    extractAssistantResponse({ message: "old shape" }, "fallback"),
    "fallback",
  );
});

test("extractAvailableModelOptions reads model ids and labels from api data", () => {
  assert.deepEqual(
    extractAvailableModelOptions([
      {
        id: "openrouter/free",
        name: "OpenRouter Free",
      },
      {
        id: "provider/free-model",
        name: "",
      },
      {
        id: "",
        name: "Missing id",
      },
    ]),
    [
      { value: "openrouter/free", label: "OpenRouter Free" },
      { value: "provider/free-model", label: "provider/free-model" },
    ],
  );
});

test("createGenerateResponsePayload sends the backend-supported free model", () => {
  const payload = createGenerateResponsePayload({
    messages: [
      {
        role: "user",
        content: "Hello",
        character: "Steve Jobs",
        mood: "Calm",
        createdAt: 1,
        id: "1",
      },
    ],
    character: "Steve Jobs",
    mood: "Calm",
  });

  assert.equal(payload.model_id, "openrouter/free");
  assert.deepEqual(payload.messages, [{ role: "user", content: "Hello" }]);
});

test("createGenerateResponsePayload sends the selected model", () => {
  const payload = createGenerateResponsePayload({
    messages: [
      {
        role: "user",
        content: "Hello",
        character: "Steve Jobs",
        mood: "Calm",
        createdAt: 1,
        id: "1",
      },
    ],
    character: "Steve Jobs",
    mood: "Calm",
    modelId: "provider/free-model",
  });

  assert.equal(payload.model_id, "provider/free-model");
});
