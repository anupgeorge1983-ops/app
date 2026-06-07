"""Full regression of the case lifecycle:

POST /api/cases
 -> submit a/r1 -> confirm-mirror a/r1
 -> submit b/r1 -> confirm-mirror b/r1
 -> submit a/r2 -> submit b/r2
 -> submit a/r3 -> submit b/r3
 -> GET /api/cases/{id}  expect status='resolved', a_verdict/b_verdict populated.
"""
import uuid
import pytest


PILLS = {"Proportionate", "Heightened"}
LONG_TIMEOUT = 180  # Claude calls can be slow


@pytest.fixture
def fresh_case(api_client, base_url, request):
    user_id = f"TEST_user_{uuid.uuid4()}"
    r = api_client.post(
        f"{base_url}/api/cases",
        json={
            "user_id": user_id,
            "title": "TEST_flow_case",
            "partner_a_name": "Alex",
            "partner_b_name": "Sam",
        },
        timeout=30,
    )
    assert r.status_code == 200, r.text
    case = r.json()
    case_id = case["id"]
    assert case["stage"] == "a_r1_input"
    assert case["status"] == "in_progress"

    def _cleanup():
        try:
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception:
            pass

    request.addfinalizer(_cleanup)
    return case_id, user_id


def _submit(api_client, base_url, case_id, partner, rnd, text):
    r = api_client.post(
        f"{base_url}/api/cases/{case_id}/submit",
        json={"partner": partner, "round": rnd, "text": text},
        timeout=LONG_TIMEOUT,
    )
    assert r.status_code == 200, f"submit {partner}/{rnd} failed: {r.status_code} {r.text}"
    return r.json()


def _confirm(api_client, base_url, case_id, partner, rnd):
    r = api_client.post(
        f"{base_url}/api/cases/{case_id}/confirm-mirror",
        json={"partner": partner, "round": rnd, "action": "confirm"},
        timeout=LONG_TIMEOUT,
    )
    assert r.status_code == 200, f"confirm {partner}/{rnd} failed: {r.status_code} {r.text}"
    return r.json()


def test_full_case_flow_resolves(api_client, base_url, fresh_case):
    case_id, _ = fresh_case

    # --- Round 1 partner A ---
    case = _submit(api_client, base_url, case_id, "a", 1,
                   "I felt ignored when you didn't reply to my message all day.")
    assert case["stage"] == "a_r1_mirror"
    assert case["a_r1"]["raw"]
    assert case["a_r1"]["mirror"], "mirror should be generated for round 1"

    case = _confirm(api_client, base_url, case_id, "a", 1)
    assert case["stage"] == "b_r1_input"
    assert case["a_r1"]["confirmed"] is True

    # --- Round 1 partner B ---
    case = _submit(api_client, base_url, case_id, "b", 1,
                   "I was overwhelmed at work and I didn't mean to shut you out.")
    assert case["stage"] == "b_r1_mirror"
    assert case["b_r1"]["mirror"]

    case = _confirm(api_client, base_url, case_id, "b", 1)
    # After b r1 confirmation: needs_r2_questions resolves to a_r2_input
    assert case["stage"] == "a_r2_input", case["stage"]
    assert case["a_r2_question"], "round 2 question for A should be generated"
    assert case["b_r2_question"], "round 2 question for B should be generated"

    # --- Round 2 (no mirror) ---
    case = _submit(api_client, base_url, case_id, "a", 2,
                   "I hear that you were drowning at work. I just wish you had told me.")
    assert case["stage"] == "b_r2_input"

    case = _submit(api_client, base_url, case_id, "b", 2,
                   "I hear that my silence made you feel invisible. I'm sorry.")
    assert case["stage"] == "a_r3_input", case["stage"]
    assert case["a_r3_question"], "round 3 question for A should be generated"
    assert case["b_r3_question"], "round 3 question for B should be generated"

    # --- Round 3 ---
    case = _submit(api_client, base_url, case_id, "a", 3,
                   "I need you to send a quick 'thinking of you' even on busy days.")
    assert case["stage"] == "b_r3_input"

    case = _submit(api_client, base_url, case_id, "b", 3,
                   "I need you to trust that silence isn't rejection, and I'll do better.")
    assert case["stage"] == "verdict_ready", case["stage"]
    assert case["status"] == "resolved", case["status"]

    # --- Final GET ---
    r = api_client.get(f"{base_url}/api/cases/{case_id}", timeout=30)
    assert r.status_code == 200
    final = r.json()
    assert final["status"] == "resolved"
    assert final["stage"] == "verdict_ready"
    a_v = final.get("a_verdict")
    b_v = final.get("b_verdict")
    assert a_v is not None, "a_verdict missing"
    assert b_v is not None, "b_verdict missing"
    assert a_v["pill"] in PILLS, a_v
    assert b_v["pill"] in PILLS, b_v
    for v in (a_v, b_v):
        assert v["summary"], v
        assert v["did_well"], v
        assert v["could_differently"], v
        assert v["action"], v


def test_submit_wrong_stage_returns_400(api_client, base_url, fresh_case):
    """Case starts at a_r1_input — submitting b_r1 immediately must 400."""
    case_id, _ = fresh_case
    r = api_client.post(
        f"{base_url}/api/cases/{case_id}/submit",
        json={"partner": "b", "round": 1, "text": "early"},
        timeout=30,
    )
    assert r.status_code == 400, r.text


def test_get_unknown_case_returns_404(api_client, base_url):
    r = api_client.get(f"{base_url}/api/cases/does-not-exist-{uuid.uuid4()}", timeout=15)
    assert r.status_code == 404
