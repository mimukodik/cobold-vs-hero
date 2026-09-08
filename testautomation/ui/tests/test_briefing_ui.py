from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from playwright.sync_api import Error as PlaywrightError, expect, sync_playwright

from page_objects import BriefingFormData, CoboldBriefingPOM


@pytest.fixture
def pom() -> Iterator[CoboldBriefingPOM]:
    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.launch(headless=os.getenv("COBOLD_UI_HEADLESS", "true").lower() != "false")
        except PlaywrightError as error:
            pytest.fail(f"Chromium failed to launch. Run the UI browser install task. {error}")
        try:
            page = browser.new_page()
            result = CoboldBriefingPOM(
                page,
                ui_base_url=os.getenv("COBOLD_UI_BASE_URL", "http://localhost:4200"),
                bff_base_url=os.getenv("COBOLD_API_BASE_URL"),
            )
            result.open()
            yield result
        finally:
            browser.close()


def test_url_is_required_to_attach(pom: CoboldBriefingPOM) -> None:
    pom.create_backend_briefing()
    pom.by_data_test("attach-evidence-backend-test").click()
    expect(pom.by_data_test("evidence-error-backend-test")).to_contain_text("URL")


def test_attached_evidence_is_not_ready(pom: CoboldBriefingPOM) -> None:
    pom.create_backend_briefing()
    pom.attach("backend-test")
    expect(pom.by_data_test("briefing-status")).to_have_text("NOT_READY")
    expect(pom.by_data_test("missing-evidence")).to_contain_text("jóváhagyásra vár: API reviewer")


def test_reviewer_approves(pom: CoboldBriefingPOM) -> None:
    pom.create_backend_briefing()
    pom.attach("backend-test")
    pom.switch_role("api-reviewer")
    pom.approve("backend-test")
    expect(pom.by_data_test("evidence-status-backend-test")).to_have_text("jóváhagyva")


def test_rejection_requires_and_displays_comment(pom: CoboldBriefingPOM) -> None:
    pom.create_backend_briefing()
    pom.attach("backend-test")
    pom.switch_role("api-reviewer")
    pom.reject("backend-test")
    expect(pom.by_data_test("evidence-error-backend-test")).to_contain_text("kötelező")
    pom.reject("backend-test", "Add the missing edge case.")
    expect(pom.by_data_test("evidence-status-backend-test")).to_have_text("tervezett")
    expect(pom.by_data_test("rejection-comment-visible-backend-test")).to_contain_text("missing edge case")


def test_all_approved_is_ready(pom: CoboldBriefingPOM) -> None:
    pom.create_backend_briefing()
    pom.attach("backend-test")
    pom.switch_role("api-reviewer")
    pom.approve("backend-test")
    expect(pom.by_data_test("briefing-status")).to_have_text("READY")


def test_production_design_requires_tech_lead(pom: CoboldBriefingPOM) -> None:
    pom.fill_briefing_form(
        BriefingFormData(
            change_title="Production design",
            change_description="Change backend and frontend in production.",
            affected_surfaces=("backend", "frontend"),
            risk_flags=("production",),
        )
    )
    pom.request_briefing()
    hld_card = pom.by_data_test("evidence-status-hld").locator("xpath=ancestor::article[1]")
    lld_card = pom.by_data_test("evidence-status-lld").locator("xpath=ancestor::article[1]")
    expect(hld_card).to_contain_text("Tech lead")
    expect(lld_card).to_contain_text("Tech lead")
