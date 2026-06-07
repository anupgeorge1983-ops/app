# Be Heard — Product Requirements

## What it is
A couples conflict resolution app. It's the **bridge back after a fight** — not therapy, not a daily habit app.
Calm, neutral, AI-mediated 3-round dialogue that ends with a verdict for both partners.

## Tech
- **Frontend:** Expo Router (React Native, SDK 54), TypeScript, file-based routing.
- **Backend:** FastAPI + MongoDB (motor), Pydantic v2.
- **AI:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `emergentintegrations` and `EMERGENT_LLM_KEY`.
- **Auth:** None (anonymous local user id stored in AsyncStorage).
- **MVP scope:** Single-device demo mode (both partners walk through sequentially on one device) + WhatsApp share link.

## Implemented screens
- `/` Home — Brand title, profile icon, "Start a case" CTA, last case card with status dot, history list.
- `/onboarding` — Welcome → Quick start (3 q) vs Full profile (15 q) → name + partner name → questions with progress bar → completion screen.
- `/profile` — User profile, conflict answers, reset onboarding.
- `/case/new` — Name the case before starting.
- `/case/[id]` — Dynamic flow driven by backend stage machine. Renders R1 / R2 / R3 input, mirror confirmation card (with "Yes, that's right" / "Let me adjust" → regenerate), partner handoff card with WhatsApp share, pull-quote of partner's mirror for R2.
- `/verdict/[id]` — Pill badge (Proportionate/Heightened), tab to switch between partners, summary, "did well" card, "could have done differently" card, "one action" purple card.

## Backend API (all under `/api`)
- `POST /profile`, `GET /profile/{user_id}` — upsert/get profile.
- `POST /cases`, `GET /cases/{id}`, `GET /cases?user_id=`, `DELETE /cases/{id}` — case CRUD.
- `POST /cases/{id}/submit` — submit a round; auto-runs mirror generation (R1) or advances state.
- `POST /cases/{id}/confirm-mirror` — confirm or adjust the mirror (regenerates on adjust).

## State machine (stored in `case.stage`)
`a_r1_input → a_r1_mirror → b_r1_input → b_r1_mirror → a_r2_input → b_r2_input → a_r3_input → b_r3_input → verdict_ready`

## LLM calls per case
1. **Mirror** — per partner per R1 submission. Returns 2–3 sentence neutral mirror.
2. **Round questions** — once after both R1 mirrors confirmed (generates R2 questions for both), once after both R2 submissions (generates R3 closing questions).
3. **Verdict** — once after both R3 submissions. Returns shared summary + per-partner pill, did_well, could_differently, action.

All LLM calls have safe fallbacks if the API errors.

## Open / known
- No real-time multi-device sync yet — by design (demo mode).
- No push notifications — by design (skipped for MVP).
- "Hold to record" mic is not wired (text input only). Voice-to-text would need expo-speech-recognition.
