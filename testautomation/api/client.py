from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass
from typing import Any


# Cloudflare bot protection on the preview zone rejects the default
# Python-urllib user agent with 403, so every request must identify itself.
USER_AGENT = "cobold-testautomation"


@dataclass(frozen=True)
class BriefingRequest:
    change_title: str
    change_description: str
    affected_surfaces: list[str]
    risk_flags: list[str]

    def to_payload(self) -> dict[str, str | list[str]]:
        return {
            "changeTitle": self.change_title,
            "changeDescription": self.change_description,
            "affectedSurfaces": self.affected_surfaces,
            "riskFlags": self.risk_flags,
        }


class CoboldBriefingClient:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or os.getenv("COBOLD_API_BASE_URL") or "http://localhost:3000").rstrip("/")

    def get_status(self) -> dict[str, Any]:
        http_request = urllib.request.Request(
            f"{self.base_url}/api/cobold-vs-hero/status",
            headers={"user-agent": USER_AGENT},
            method="GET",
        )

        with urllib.request.urlopen(http_request, timeout=5) as response:
            if response.status != 200:
                raise AssertionError(f"Expected HTTP 200, got {response.status}")
            return json.loads(response.read().decode("utf-8"))

    def create_briefing(self, request: BriefingRequest) -> dict[str, Any]:
        return self._post("/api/cobold-vs-hero/briefing", request.to_payload())

    def transition_evidence(
        self, briefing_id: str, evidence_id: str, action: str, payload: dict[str, str]
    ) -> dict[str, Any]:
        return self._post(
            f"/api/cobold-vs-hero/briefings/{briefing_id}/evidence/{evidence_id}/{action}", payload
        )

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        http_request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=body,
            headers={"content-type": "application/json", "user-agent": USER_AGENT},
            method="POST",
        )

        with urllib.request.urlopen(http_request, timeout=5) as response:
            if response.status != 200:
                raise AssertionError(f"Expected HTTP 200, got {response.status}")
            return json.loads(response.read().decode("utf-8"))
