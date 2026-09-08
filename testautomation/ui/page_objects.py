from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlencode, urlsplit, urlunsplit

from playwright.sync_api import Locator, Page, expect


@dataclass(frozen=True)
class BriefingFormData:
    change_title: str
    change_description: str
    affected_surfaces: tuple[str, ...] | None = None
    risk_flags: tuple[str, ...] | None = None


class CoboldBriefingPOM:
    SURFACE_OPTIONS = ("backend", "bff", "frontend", "contract", "testing")
    RISK_OPTIONS = ("production", "customer-data", "auth", "payment", "unclear-scope")

    def __init__(self, page: Page, ui_base_url: str, bff_base_url: str | None = None) -> None:
        self.page = page
        self.ui_base_url = ui_base_url.rstrip("/")
        self.bff_base_url = bff_base_url.rstrip("/") if bff_base_url else None

    def open(self) -> None:
        self.page.goto(self._app_url(), wait_until="networkidle")
        expect(self.by_data_test("briefing-form")).to_be_visible()

    def assert_runtime_status_up(self) -> None:
        expect(self.by_data_test("status-page")).to_be_visible()
        expect(self.by_data_test("system-status")).to_have_text("UP")
        expect(self.by_data_test("service-status-bff-nestjs")).to_contain_text("UP")
        expect(self.by_data_test("service-status-be-java")).to_contain_text("UP")

    def fill_briefing_form(self, data: BriefingFormData) -> None:
        self.by_data_test("change-title-input").fill(data.change_title)
        self.by_data_test("change-description-input").fill(data.change_description)
        if data.affected_surfaces is not None:
            self._set_option_group("surface", self.SURFACE_OPTIONS, data.affected_surfaces)
        if data.risk_flags is not None:
            self._set_option_group("risk", self.RISK_OPTIONS, data.risk_flags)

    def request_briefing(self) -> None:
        self.by_data_test("request-briefing-button").click()
        expect(self.by_data_test("briefing-signal")).to_be_visible()

    def assert_visible_signal(self, signal: str) -> None:
        expect(self.by_data_test("briefing-signal")).to_have_text(signal)

    def assert_missing_evidence_mentions(self, expected_text: str) -> None:
        expect(self.by_data_test("missing-evidence")).to_contain_text(expected_text)

    def assert_stop_condition_mentions(self, expected_text: str) -> None:
        expect(self.by_data_test("briefing-stop-condition")).to_contain_text(expected_text)

    def assert_matrix_mentions(self, expected_text: str) -> None:
        expect(self.by_data_test("review-matrix")).to_contain_text(expected_text)

    def assert_matrix_rows_covered(self, surfaces: tuple[str, ...]) -> None:
        for surface in surfaces:
            expect(self.by_data_test(f"matrix-row-{surface}")).to_contain_text("covered")

    def create_backend_briefing(self) -> None:
        self.fill_briefing_form(
            BriefingFormData(
                change_title="Backend evidence approval",
                change_description="Review one focused backend test.",
                affected_surfaces=("backend",),
            )
        )
        self.request_briefing()

    def attach(self, evidence_id: str, url: str = "https://example.test/evidence") -> None:
        self.by_data_test(f"evidence-url-{evidence_id}").fill(url)
        self.by_data_test(f"attach-evidence-{evidence_id}").click()
        expect(self.by_data_test(f"evidence-status-{evidence_id}")).to_have_text("csatolva")

    def switch_role(self, role: str) -> None:
        self.by_data_test("role-switcher").select_option(role)

    def approve(self, evidence_id: str) -> None:
        self.by_data_test(f"approve-evidence-{evidence_id}").click()

    def reject(self, evidence_id: str, comment: str | None = None) -> None:
        if comment is not None:
            self.by_data_test(f"rejection-comment-{evidence_id}").fill(comment)
        self.by_data_test(f"reject-evidence-{evidence_id}").click()

    def by_data_test(self, value: str) -> Locator:
        return self.page.locator(f'[data-test="{value}"]')

    def _set_option_group(self, group: str, options: tuple[str, ...], selected_values: tuple[str, ...]) -> None:
        selected = set(selected_values)
        for option in options:
            self.by_data_test(f"{group}-{option}").set_checked(option in selected)

    def _app_url(self) -> str:
        if not self.bff_base_url:
            return self.ui_base_url

        split_url = urlsplit(self.ui_base_url)
        query = urlencode({"bffBaseUrl": self.bff_base_url})
        return urlunsplit((split_url.scheme, split_url.netloc, split_url.path, query, split_url.fragment))
