"""Tests for GET /api/stats."""
import uuid


def test_stats_fresh_user_zero(api_client, base_url):
    fresh = f"TEST_user_{uuid.uuid4()}"
    r = api_client.get(f"{base_url}/api/stats", params={"user_id": fresh})
    assert r.status_code == 200, r.text
    data = r.json()
    for key in (
        "total_cases",
        "total_resolved",
        "my_cases",
        "my_resolved",
        "my_in_progress",
    ):
        assert key in data, f"missing key {key}: {data}"
        assert isinstance(data[key], int)
    assert data["my_cases"] == 0
    assert data["my_resolved"] == 0
    assert data["my_in_progress"] == 0


def test_stats_after_creating_case(api_client, base_url, request):
    fresh = f"TEST_user_{uuid.uuid4()}"
    create = api_client.post(
        f"{base_url}/api/cases",
        json={
            "user_id": fresh,
            "title": "TEST_stats_case",
            "partner_a_name": "Alex",
            "partner_b_name": "Sam",
        },
    )
    assert create.status_code == 200, create.text
    case_id = create.json()["id"]

    def _cleanup():
        try:
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception:
            pass

    request.addfinalizer(_cleanup)

    r = api_client.get(f"{base_url}/api/stats", params={"user_id": fresh})
    assert r.status_code == 200, r.text
    s = r.json()
    assert s["my_cases"] == 1, s
    assert s["my_in_progress"] == 1, s
    assert s["my_resolved"] == 0, s
    # the aggregate counters should be at least our count
    assert s["total_cases"] >= 1
