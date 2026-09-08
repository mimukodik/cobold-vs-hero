from client import BriefingRequest, CoboldBriefingClient


def backend_briefing(client: CoboldBriefingClient) -> dict:
    return client.create_briefing(
        BriefingRequest(
            change_title="Backend evidence approval",
            change_description="Review one focused backend test.",
            affected_surfaces=["backend"],
            risk_flags=[],
        )
    )


def test_status_reports_bff_and_backend_up() -> None:
    response = CoboldBriefingClient().get_status()
    assert response["status"] == "UP"
    assert [service["service"] for service in response["services"]] == ["bff-nestjs", "be-java"]


def test_attached_evidence_remains_not_ready_until_reviewer_approval() -> None:
    client = CoboldBriefingClient()
    briefing = backend_briefing(client)
    attached = client.transition_evidence(
        briefing["briefingId"], "backend-test", "attach",
        {"actorRole": "developer", "url": "https://example.test/backend-test"},
    )
    assert attached["readinessVerdict"] == "NOT_READY"
    assert attached["evidenceItems"][0]["status"] == "attached"
    assert attached["gaps"][0]["message"] == "jóváhagyásra vár: API reviewer"

    approved = client.transition_evidence(
        briefing["briefingId"], "backend-test", "approve", {"actorRole": "api-reviewer"}
    )
    assert approved["readinessVerdict"] == "READY"
    assert approved["missingEvidence"] == []


def test_rejection_returns_evidence_to_planned_with_comment() -> None:
    client = CoboldBriefingClient()
    briefing = backend_briefing(client)
    client.transition_evidence(
        briefing["briefingId"], "backend-test", "attach",
        {"actorRole": "developer", "url": "https://example.test/backend-test"},
    )
    rejected = client.transition_evidence(
        briefing["briefingId"], "backend-test", "reject",
        {"actorRole": "api-reviewer", "comment": "Add the missing edge case."},
    )
    assert rejected["evidenceItems"][0]["status"] == "planned"
    assert rejected["evidenceItems"][0]["rejectionComment"] == "Add the missing edge case."


def test_production_design_evidence_is_assigned_to_tech_lead() -> None:
    response = CoboldBriefingClient().create_briefing(
        BriefingRequest(
            change_title="Production design",
            change_description="Change backend and frontend in production.",
            affected_surfaces=["backend", "frontend"],
            risk_flags=["production"],
        )
    )
    items = {item["id"]: item for item in response["evidenceItems"]}
    assert items["hld"]["approverRole"] == "tech-lead"
    assert items["lld"]["approverRole"] == "tech-lead"
