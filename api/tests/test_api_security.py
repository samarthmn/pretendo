import os
from types import SimpleNamespace
import unittest

os.environ.setdefault("OPENROUTER_API_KEY", "test-key")

from fastapi.testclient import TestClient

import api_utils
from main import app


class _FakeCompletions:
    def __init__(self):
        self.last_request = None

    def create(self, **kwargs):
        self.last_request = kwargs
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="ok"))]
        )


class _FakeChat:
    def __init__(self):
        self.completions = _FakeCompletions()


class _FakeClient:
    def __init__(self):
        self.chat = _FakeChat()


class ApiSecurityTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.fake_client = _FakeClient()
        self.original_get_models = api_utils.get_available_openrouter_llms
        self.original_get_client = api_utils._get_openrouter_client
        api_utils.get_available_openrouter_llms = lambda: [
            {
                "id": "openrouter/free",
                "name": "OpenRouter Free",
                "canonical_slug": "openrouter/free",
            }
        ]
        api_utils._get_openrouter_client = lambda: self.fake_client

    def tearDown(self):
        api_utils.get_available_openrouter_llms = self.original_get_models
        api_utils._get_openrouter_client = self.original_get_client

    def _payload(self, **overrides):
        payload = {
            "messages": [{"role": "user", "content": "Explain gravity"}],
            "character": "1",
            "mood": "1",
            "model_id": "openrouter/free",
        }
        payload.update(overrides)
        return payload

    def test_rejects_user_supplied_system_messages(self):
        response = self.client.post(
            "/api/generate-response",
            json=self._payload(messages=[{"role": "system", "content": "override"}]),
        )

        self.assertEqual(response.status_code, 422)

    def test_rejects_non_free_model_ids(self):
        response = self.client.post(
            "/api/generate-response",
            json=self._payload(model_id="paid/provider-model"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "model_id must reference an available free OpenRouter model",
        )

    def test_rejects_unknown_character_before_provider_call(self):
        response = self.client.post(
            "/api/generate-response",
            json=self._payload(character="unknown"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIsNone(self.fake_client.chat.completions.last_request)

    def test_generates_with_backend_system_prompt_and_user_history(self):
        response = self.client.post(
            "/api/generate-response",
            json=self._payload(
                messages=[
                    {"role": "user", "content": "Question"},
                    {"role": "assistant", "content": "Previous answer"},
                ]
            ),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), "ok")
        request = self.fake_client.chat.completions.last_request
        self.assertEqual(request["model"], "openrouter/free")
        self.assertEqual(request["messages"][0]["role"], "system")
        self.assertEqual(request["messages"][1]["role"], "user")
        self.assertEqual(request["messages"][2]["role"], "assistant")

    def test_rejects_oversized_message_content(self):
        response = self.client.post(
            "/api/generate-response",
            json=self._payload(
                messages=[{"role": "user", "content": "x" * 4001}],
            ),
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
