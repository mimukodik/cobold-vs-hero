"""Reusable evidence-approval UI steps for workshop scenarios."""

from page_objects import CoboldBriefingPOM


def create_and_attach_backend_evidence(pom: CoboldBriefingPOM) -> None:
    pom.create_backend_briefing()
    pom.attach("backend-test")


def approve_as_api_reviewer(pom: CoboldBriefingPOM) -> None:
    pom.switch_role("api-reviewer")
    pom.approve("backend-test")
