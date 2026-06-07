from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import uuid
import re
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

CLAUDE_MODEL = "claude-sonnet-4-5-20250929"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Be Heard API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("be_heard")


# ------------------------- Models -------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class OnboardingAnswer(BaseModel):
    question: str
    answer: str


class ProfileCreate(BaseModel):
    user_id: Optional[str] = None
    name: str
    partner_name: Optional[str] = ""
    mode: Literal["quick", "full"]
    answers: List[OnboardingAnswer] = []


class Profile(BaseModel):
    user_id: str
    name: str
    partner_name: str = ""
    mode: str
    answers: List[OnboardingAnswer] = []
    conflict_style: List[str] = []
    created_at: str


class Submission(BaseModel):
    raw: str = ""
    mirror: str = ""
    confirmed: bool = False


class Verdict(BaseModel):
    pill: Literal["Proportionate", "Heightened"] = "Proportionate"
    summary: str = ""
    did_well: str = ""
    could_differently: str = ""
    action: str = ""


class CaseModel(BaseModel):
    id: str
    user_id: str
    title: str
    partner_a_name: str
    partner_b_name: str
    stage: str  # see STAGES below
    status: str  # waiting | in_progress | resolved
    a_r1: Submission = Field(default_factory=Submission)
    a_r2: Submission = Field(default_factory=Submission)
    a_r3: Submission = Field(default_factory=Submission)
    b_r1: Submission = Field(default_factory=Submission)
    b_r2: Submission = Field(default_factory=Submission)
    b_r3: Submission = Field(default_factory=Submission)
    a_r2_question: str = ""
    b_r2_question: str = ""
    a_r3_question: str = ""
    b_r3_question: str = ""
    a_verdict: Optional[Verdict] = None
    b_verdict: Optional[Verdict] = None
    created_at: str
    updated_at: str


class CaseCreate(BaseModel):
    user_id: str
    title: str
    partner_a_name: str
    partner_b_name: str


class SubmitInput(BaseModel):
    partner: Literal["a", "b"]
    round: Literal[1, 2, 3]
    text: str


class ConfirmMirrorInput(BaseModel):
    partner: Literal["a", "b"]
    round: Literal[1, 2, 3]
    action: Literal["confirm", "adjust"]
    adjusted_text: Optional[str] = None


STAGES = [
    "a_r1_input",
    "a_r1_mirror",
    "b_r1_input",
    "b_r1_mirror",
    "a_r2_input",
    "b_r2_input",
    "a_r3_input",
    "b_r3_input",
    "verdict_ready",
]


# ------------------------- LLM Helpers -------------------------

def _strip_json_fence(text: str) -> str:
    text = text.strip()
    # Try to find first { and last }
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        return m.group(0)
    return text


async def _claude_send(system_msg: str, user_text: str, session_id: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_msg,
    ).with_model("anthropic", CLAUDE_MODEL)
    response = await chat.send_message(UserMessage(text=user_text))
    return response if isinstance(response, str) else str(response)


async def generate_mirror(speaker_name: str, partner_name: str, raw_text: str, case_id: str, adjustment_note: str = "") -> str:
    """Call 1: Generate neutral, emotionally accurate mirror (2-3 sentences)."""
    system_msg = (
        "You are a calm, warm mediator helping couples reconcile after an argument. "
        "Your job: take what one partner just said and reflect back what they actually "
        "meant, in neutral, non-blaming language. Strip the heat. Capture the underlying "
        "feeling and need. Speak in second person ('You felt...', 'You needed...'). "
        "Be 2-3 sentences. No advice. No judgment. No quoting their words verbatim."
    )
    user_text = (
        f"{speaker_name} just said this about a conflict with {partner_name}:\n\n"
        f"\"{raw_text}\"\n\n"
        f"{adjustment_note}\n\n"
        "Reflect back what they meant in 2-3 calm, neutral sentences. Output only the mirror text."
    )
    try:
        out = await _claude_send(system_msg, user_text, f"mirror-{case_id}-{uuid.uuid4()}")
        return out.strip().strip('"')
    except Exception:
        logger.exception("mirror generation failed")
        return f"You felt unsettled by what happened, and you wanted {partner_name} to understand your side."


async def generate_round_questions(
    case_id: str,
    a_name: str,
    b_name: str,
    a_mirror_for_b: str,
    b_mirror_for_a: str,
    round_num: int,
    prior_context: str = "",
) -> dict:
    """Call 2: Generate the focused question each partner needs to respond to."""
    if round_num == 2:
        system_msg = (
            "You are a calm couples mediator. Each partner has shared their side, and "
            "you have neutral mirrors of both. Generate one focused, open question for "
            "each partner asking how they respond to the other's mirrored feelings. "
            "The question should invite empathy, not defense."
        )
        user_text = (
            f"{a_name}'s feelings (mirrored): \"{a_mirror_for_b}\"\n\n"
            f"{b_name}'s feelings (mirrored): \"{b_mirror_for_a}\"\n\n"
            "Return STRICT JSON only with this shape:\n"
            "{\"question_for_a\": \"...\", \"question_for_b\": \"...\"}\n"
            f"question_for_a asks {a_name} how they respond to {b_name}'s feelings. "
            f"question_for_b asks {b_name} how they respond to {a_name}'s feelings. "
            "Each one short, warm, single sentence. No preamble."
        )
    else:  # round 3 closing
        system_msg = (
            "You are a calm couples mediator. This is the closing question of a 3-round "
            "dialogue. Generate one closing question for each partner that invites them "
            "to name what they need from their partner right now to move forward."
        )
        user_text = (
            f"Context so far:\n{prior_context}\n\n"
            f"Return STRICT JSON only:\n"
            f"{{\"question_for_a\": \"...\", \"question_for_b\": \"...\"}}\n"
            f"Each question is warm, gentle, single sentence, asking what they need "
            "from their partner to feel like they can move forward together."
        )
    try:
        out = await _claude_send(system_msg, user_text, f"q-{case_id}-r{round_num}")
        data = json.loads(_strip_json_fence(out))
        return {
            "a": str(data.get("question_for_a", "")).strip(),
            "b": str(data.get("question_for_b", "")).strip(),
        }
    except Exception:
        logger.exception("round question generation failed")
        if round_num == 2:
            return {
                "a": f"How do you respond to what {b_name} was feeling?",
                "b": f"How do you respond to what {a_name} was feeling?",
            }
        return {
            "a": f"What do you need from {b_name} right now to feel like you can move forward together?",
            "b": f"What do you need from {a_name} right now to feel like you can move forward together?",
        }


async def generate_verdict(case_id: str, transcript: str, a_name: str, b_name: str) -> dict:
    """Call 3: Final verdict for both partners."""
    system_msg = (
        "You are a calm, neutral couples mediator delivering a final verdict after a "
        "3-round structured dialogue. For each partner, return:\n"
        "1. pill: 'Proportionate' or 'Heightened' — was their reaction proportionate or heightened?\n"
        "2. summary: a neutral 2-sentence summary of what happened (same for both).\n"
        "3. did_well: one short paragraph (warm, specific) about what THIS partner did well.\n"
        "4. could_differently: one short paragraph about what THIS partner could have done differently.\n"
        "5. action: ONE concrete action this partner can take today to repair.\n"
        "Tone: warm, non-blaming, hopeful, never therapy-speak."
    )
    user_text2 = (
        f"Conflict transcript between {a_name} (partner_a) and {b_name} (partner_b):\n\n"
        f"{transcript}\n\n"
        "Return STRICT JSON only (no markdown), with this exact shape:\n"
        "{\n"
        "  \"summary\": \"shared 2-sentence neutral summary\",\n"
        "  \"partner_a\": {\"pill\": \"Proportionate\", \"did_well\": \"...\", \"could_differently\": \"...\", \"action\": \"...\"},\n"
        "  \"partner_b\": {\"pill\": \"Heightened\", \"did_well\": \"...\", \"could_differently\": \"...\", \"action\": \"...\"}\n"
        "}\n"
        "Keep each text field under 280 characters. pill is either \"Proportionate\" or \"Heightened\"."
    )
    try:
        out = await _claude_send(system_msg, user_text2, f"verdict-{case_id}")
        data = json.loads(_strip_json_fence(out))
        summary = str(data.get("summary", "")).strip()
        pa = data.get("partner_a", {}) or {}
        pb = data.get("partner_b", {}) or {}

        def _v(d, summary):
            pill = d.get("pill", "Proportionate")
            if pill not in ("Proportionate", "Heightened"):
                pill = "Proportionate"
            return Verdict(
                pill=pill,
                summary=summary,
                did_well=str(d.get("did_well", "")).strip(),
                could_differently=str(d.get("could_differently", "")).strip(),
                action=str(d.get("action", "")).strip(),
            ).model_dump()

        return {"a": _v(pa, summary), "b": _v(pb, summary)}
    except Exception:
        logger.exception("verdict generation failed")
        fallback_summary = "You both shared your sides, and underneath the frustration, you each wanted to feel understood."
        fb = Verdict(
            pill="Proportionate",
            summary=fallback_summary,
            did_well="You showed up and were willing to talk about something hard.",
            could_differently="You could pause before responding and check what your partner actually meant.",
            action="Tell your partner one specific thing they said that landed for you.",
        ).model_dump()
        return {"a": fb, "b": fb}


def _build_transcript(case: CaseModel) -> str:
    a, b = case.partner_a_name, case.partner_b_name
    lines = [
        "--- Round 1 ---",
        f"{a} said: {case.a_r1.raw}",
        f"({a}'s feelings, mirrored): {case.a_r1.mirror}",
        f"{b} said: {case.b_r1.raw}",
        f"({b}'s feelings, mirrored): {case.b_r1.mirror}",
        "--- Round 2 ---",
        f"{a} responded to '{case.a_r2_question}': {case.a_r2.raw}",
        f"{b} responded to '{case.b_r2_question}': {case.b_r2.raw}",
        "--- Round 3 (closing) ---",
        f"{a} on '{case.a_r3_question}': {case.a_r3.raw}",
        f"{b} on '{case.b_r3_question}': {case.b_r3.raw}",
    ]
    return "\n".join(lines)


# ------------------------- DB helpers -------------------------

def _strip_id(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# ------------------------- Routes -------------------------

@api_router.get("/")
async def root():
    return {"message": "Be Heard API", "ok": True}


@api_router.post("/profile", response_model=Profile)
async def upsert_profile(payload: ProfileCreate):
    user_id = payload.user_id or str(uuid.uuid4())
    profile = Profile(
        user_id=user_id,
        name=payload.name,
        partner_name=payload.partner_name or "",
        mode=payload.mode,
        answers=payload.answers,
        created_at=now_iso(),
    )
    doc = profile.model_dump()
    await db.profiles.update_one(
        {"user_id": user_id}, {"$set": doc}, upsert=True
    )
    return profile


@api_router.get("/profile/{user_id}", response_model=Profile)
async def get_profile(user_id: str):
    doc = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    return Profile(**doc)


@api_router.post("/cases", response_model=CaseModel)
async def create_case(payload: CaseCreate):
    case = CaseModel(
        id=str(uuid.uuid4()),
        user_id=payload.user_id,
        title=payload.title or "New case",
        partner_a_name=payload.partner_a_name or "You",
        partner_b_name=payload.partner_b_name or "Partner",
        stage="a_r1_input",
        status="in_progress",
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    await db.cases.insert_one(case.model_dump())
    return case


@api_router.get("/cases/{case_id}", response_model=CaseModel)
async def get_case(case_id: str):
    doc = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseModel(**doc)


@api_router.get("/cases", response_model=List[CaseModel])
async def list_cases(user_id: str):
    cursor = db.cases.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=100)
    return [CaseModel(**i) for i in items]


async def _save_case(case: CaseModel):
    case.updated_at = now_iso()
    await db.cases.update_one({"id": case.id}, {"$set": case.model_dump()})


@api_router.post("/cases/{case_id}/submit", response_model=CaseModel)
async def submit(case_id: str, payload: SubmitInput):
    doc = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Case not found")
    case = CaseModel(**doc)

    expected_stage = f"{payload.partner}_r{payload.round}_input"
    if case.stage != expected_stage:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit. Stage is {case.stage}, expected {expected_stage}",
        )

    speaker = case.partner_a_name if payload.partner == "a" else case.partner_b_name
    partner = case.partner_b_name if payload.partner == "a" else case.partner_a_name

    key = f"{payload.partner}_r{payload.round}"
    sub = getattr(case, key)
    sub.raw = payload.text.strip()

    if payload.round == 1:
        sub.mirror = await generate_mirror(speaker, partner, sub.raw, case.id)
        sub.confirmed = False
        setattr(case, key, sub)
        case.stage = f"{payload.partner}_r{payload.round}_mirror"
    else:
        # rounds 2 and 3 — no mirror confirmation, advance immediately
        sub.confirmed = True
        setattr(case, key, sub)
        case.stage = _advance_after_round(case, payload.partner, payload.round)
        await _maybe_generate_next(case)

    await _save_case(case)
    return case


@api_router.post("/cases/{case_id}/confirm-mirror", response_model=CaseModel)
async def confirm_mirror(case_id: str, payload: ConfirmMirrorInput):
    doc = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Case not found")
    case = CaseModel(**doc)

    expected_stage = f"{payload.partner}_r{payload.round}_mirror"
    if case.stage != expected_stage:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot confirm mirror. Stage is {case.stage}, expected {expected_stage}",
        )

    key = f"{payload.partner}_r{payload.round}"
    sub = getattr(case, key)

    if payload.action == "adjust":
        speaker = case.partner_a_name if payload.partner == "a" else case.partner_b_name
        partner = case.partner_b_name if payload.partner == "a" else case.partner_a_name
        adjustment_note = ""
        if payload.adjusted_text:
            adjustment_note = (
                f"The person felt the previous mirror missed the mark and clarified: "
                f"\"{payload.adjusted_text}\". Use that to write a better mirror."
            )
        sub.mirror = await generate_mirror(speaker, partner, sub.raw, case.id, adjustment_note)
        sub.confirmed = False
        setattr(case, key, sub)
    else:  # confirm
        sub.confirmed = True
        setattr(case, key, sub)
        case.stage = _advance_after_round(case, payload.partner, payload.round)
        await _maybe_generate_next(case)

    await _save_case(case)
    return case


def _advance_after_round(case: CaseModel, partner: str, round_num: int) -> str:
    """Determine next stage after a round was completed (mirror confirmed or r2/r3 submitted)."""
    if round_num == 1:
        if partner == "a":
            return "b_r1_input"
        return "needs_r2_questions"  # placeholder; _maybe_generate_next will resolve
    if round_num == 2:
        if partner == "a":
            return "b_r2_input"
        return "needs_r3_questions"
    if round_num == 3:
        if partner == "a":
            return "b_r3_input"
        return "needs_verdict"
    return case.stage


async def _maybe_generate_next(case: CaseModel):
    if case.stage == "needs_r2_questions":
        q = await generate_round_questions(
            case.id,
            case.partner_a_name,
            case.partner_b_name,
            case.a_r1.mirror,
            case.b_r1.mirror,
            round_num=2,
        )
        case.a_r2_question = q["a"]
        case.b_r2_question = q["b"]
        case.stage = "a_r2_input"
    elif case.stage == "needs_r3_questions":
        prior = (
            f"{case.partner_a_name} round 1 feelings: {case.a_r1.mirror}\n"
            f"{case.partner_b_name} round 1 feelings: {case.b_r1.mirror}\n"
            f"{case.partner_a_name} round 2 response: {case.a_r2.raw}\n"
            f"{case.partner_b_name} round 2 response: {case.b_r2.raw}\n"
        )
        q = await generate_round_questions(
            case.id,
            case.partner_a_name,
            case.partner_b_name,
            case.a_r1.mirror,
            case.b_r1.mirror,
            round_num=3,
            prior_context=prior,
        )
        case.a_r3_question = q["a"]
        case.b_r3_question = q["b"]
        case.stage = "a_r3_input"
    elif case.stage == "needs_verdict":
        transcript = _build_transcript(case)
        v = await generate_verdict(case.id, transcript, case.partner_a_name, case.partner_b_name)
        case.a_verdict = Verdict(**v["a"])
        case.b_verdict = Verdict(**v["b"])
        case.stage = "verdict_ready"
        case.status = "resolved"


@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str):
    res = await db.cases.delete_one({"id": case_id})
    return {"deleted": res.deleted_count}


# ------------------------- App wiring -------------------------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
