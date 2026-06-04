# Pretendo

## 1. Summary

Pretendo takes any user question and answers it as a preselected mood and character.
A reply can be selected based on mood (funny, serious, pissed off, angry, calm — see `utils/moods.json`) and character (public figures such as Donald Trump, Elon Musk, Naval Ravikant, Mark Zuckerberg, Steve Jobs, Jim Carrey, Osho Rajneesh, Jiddu Krishnamurti — see `utils/character.json`).

The user asks a question, picks a character and mood -> gets an explanation written in that
character's voice and mood.

## 2. Goals

- Answer any question in a selected character voice and mood.
- Keep character and mood definitions in `utils/character.json` and `utils/moods.json` so frontend and backend stay aligned.

## 3. Users

Anyone who wants an explanation with personality — for fun, for learning, or for sharing entertaining answers.

## 4. Core User Flow

1. User types a question.
2. User selects a character / tone.
3. Frontend sends `question, character, mood` to the Python API.
4. API builds a prompt from the character template and calls the LLM (can be local LLM or openrouter's free models - only the ones which are available for free).
5. API returns the styled explanation.
6. Frontend displays the response with loading and error states.
7. It should be the same chatgpt style of chating.

## 5. Moods & Characters

Moods. Canonical list: `utils/moods.json`.

| id  | name       | description           |
| --- | ---------- | --------------------- |
| 1   | Funny      | Funny as a clown      |
| 2   | Serious    | Serious as a judge    |
| 3   | Pissed off | Pissed off as a drunk |
| 4   | Angry      | Angry as a bear       |
| 5   | Calm       | Calm as a lake        |

Characters (framed as "inspired by", not exact impersonation). Canonical list: `utils/character.json`.

| id  | name               |
| --- | ------------------ |
| 1   | Donald Trump       |
| 2   | Elon Musk          |
| 3   | Naval Ravikant     |
| 4   | Mark Zuckerberg    |
| 5   | Steve Jobs         |
| 6   | Jim Carrey         |
| 7   | Osho Rajneesh      |
| 8   | Jiddu Krishnamurti |

## 6. Safety

- Use "inspired by" framing for real public figures.
- Avoid defamatory or hateful output even in "pissed off" mode — stay playful, not abusive.

## 7. Tech Stack

- Frontend: Next.js (App Router) + TypeScript
- Backend: Python + FastAPI
- LLM: OpenRouter or Local LLM
