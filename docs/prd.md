# Pretendo

## 1. Summary

Pretendo takes any user question and answers it as a preselected mood and character.
A reply can be selected, based on -> mood (funny, serious, pissed off, angry and calm) and character (of a public-figures like Elon Musk, Naval Ravikant, Sadhguru, Osho, Donald Trump etc.)

The user asks a question, picks a character and mood -> gets an explanation written in that
character's voice and mood.

## 2. Goals

- Answer any question in a selected character voice and mood.
- Keep character definitions in one place so frontend and backend stay aligned.

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

Moods:

- Funny
- Serious
- Pissed off
- Calm
- Angry

Character (framed as "inspired by", not exact impersonation):

- Trump
- Elon
- Naval
- Sadhguru
- Osho

## 6. Safety

- Use "inspired by" framing for real public figures.
- Avoid defamatory or hateful output even in "pissed off" mode — stay playful, not abusive.

## 7. Tech Stack

- Frontend: Next.js (App Router) + TypeScript
- Backend: Python + FastAPI
- LLM:

## 8. File Structure

```txt
pretendo/
  apps/
    web/
      src/
        app/
          layout.tsx
          page.tsx
        components/
          ChatComposer.tsx
          CharacterPicker.tsx
          MoodPicker.tsx
          ResponsePanel.tsx
        lib/
          api.ts
          shared.ts
      package.json
      next.config.ts
      tsconfig.json

    api/
      app/
        main.py
        routes/
          chat.py
        schemas/
          chat.py
        services/
          llm.py
          prompt_builder.py
        core/
          config.py
      tests/
      pyproject.toml

  packages/
    shared/
      characters.json # single source of truth for character definitions
      moods.json # single source of truth for mood definitions
      types.ts # shared frontend types generated or maintained from JSON

  docs/
    prd.md

  README.md
  package.json
  pnpm-workspace.yaml
  .env.example
  .gitignore
```
