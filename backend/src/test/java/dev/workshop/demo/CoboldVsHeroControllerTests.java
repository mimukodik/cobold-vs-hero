package dev.workshop.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class CoboldVsHeroControllerTests {

	private final CoboldVsHeroController controller = new CoboldVsHeroController(8080);

	@Test
	void stateMachineAllowsPlannedToAttachedToApproved() {
		CoboldVsHeroController.BriefingResponse briefing = backendBriefing(List.of());

		CoboldVsHeroController.BriefingResponse attached = controller.attachEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.AttachEvidenceRequest("developer", "https://example.test/backend"));
		assertThat(item(attached, "backend-test").status()).isEqualTo("attached");
		assertThat(attached.readinessVerdict()).isEqualTo("NOT_READY");
		assertThat(attached.gaps()).first().extracting(CoboldVsHeroController.EvidenceGap::message)
				.isEqualTo("jóváhagyásra vár: API reviewer");

		CoboldVsHeroController.BriefingResponse approved = controller.approveEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.ReviewEvidenceRequest("api-reviewer"));
		assertThat(item(approved, "backend-test").status()).isEqualTo("approved");
		assertThat(approved.readinessVerdict()).isEqualTo("READY");
	}

	@Test
	void rejectsInvalidTransitionsAndWrongRoles() {
		CoboldVsHeroController.BriefingResponse briefing = backendBriefing(List.of());

		assertStatus(HttpStatus.CONFLICT, () -> controller.approveEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.ReviewEvidenceRequest("api-reviewer")));
		assertStatus(HttpStatus.FORBIDDEN, () -> controller.attachEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.AttachEvidenceRequest("api-reviewer", "https://example.test/backend")));

		controller.attachEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.AttachEvidenceRequest("developer", "https://example.test/backend"));
		assertStatus(HttpStatus.FORBIDDEN, () -> controller.approveEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.ReviewEvidenceRequest("ui-reviewer")));
		assertStatus(HttpStatus.CONFLICT, () -> controller.attachEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.AttachEvidenceRequest("developer", "https://example.test/backend-2")));
	}

	@Test
	void rejectionReturnsAttachedEvidenceToPlannedWithComment() {
		CoboldVsHeroController.BriefingResponse briefing = backendBriefing(List.of());
		controller.attachEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.AttachEvidenceRequest("developer", "https://example.test/backend"));

		CoboldVsHeroController.BriefingResponse rejected = controller.rejectEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.RejectEvidenceRequest("api-reviewer", "Add the missing edge case."));

		assertThat(item(rejected, "backend-test").status()).isEqualTo("planned");
		assertThat(item(rejected, "backend-test").rejectionComment()).isEqualTo("Add the missing edge case.");
		assertThat(rejected.readinessVerdict()).isEqualTo("NOT_READY");
	}

	@Test
	void attachedEvidenceIsNotReadyAndAllApprovedEvidenceIsReady() {
		CoboldVsHeroController.BriefingResponse briefing = backendBriefing(List.of());
		CoboldVsHeroController.BriefingResponse attached = controller.attachEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.AttachEvidenceRequest("developer", "https://example.test/backend"));

		assertThat(attached.readinessVerdict()).isEqualTo("NOT_READY");
		assertThat(attached.signal()).isEqualTo("sparring");

		CoboldVsHeroController.BriefingResponse approved = controller.approveEvidence(
				briefing.briefingId(), "backend-test",
				new CoboldVsHeroController.ReviewEvidenceRequest("api-reviewer"));
		assertThat(approved.readinessVerdict()).isEqualTo("READY");
		assertThat(approved.signal()).isEqualTo("truce");
		assertThat(approved.gaps()).isEmpty();
	}

	@Test
	void productionAndAuthenticationRisksRequireTechLeadForDesignEvidence() {
		for (String risk : List.of("production", "auth")) {
			CoboldVsHeroController.BriefingResponse briefing = controller.createBriefing(
					new CoboldVsHeroController.BriefingRequest(
							"Risky multi-surface change", "Change backend and frontend behavior.",
							List.of("backend", "frontend"), List.of(risk)));

			assertThat(item(briefing, "hld").approverRole()).isEqualTo("tech-lead");
			assertThat(item(briefing, "lld").approverRole()).isEqualTo("tech-lead");
		}

		CoboldVsHeroController.BriefingResponse peerReview = controller.createBriefing(
				new CoboldVsHeroController.BriefingRequest(
						"Normal multi-surface change", "Change backend and frontend behavior.",
						List.of("backend", "frontend"), List.of()));
		assertThat(item(peerReview, "hld").approverRole()).isEqualTo("api-reviewer");
	}

	private CoboldVsHeroController.BriefingResponse backendBriefing(List<String> risks) {
		return controller.createBriefing(new CoboldVsHeroController.BriefingRequest(
				"Backend change", "Add focused backend behavior.", List.of("backend"), risks));
	}

	private CoboldVsHeroController.EvidenceItem item(
			CoboldVsHeroController.BriefingResponse response, String id) {
		return response.evidenceItems().stream().filter(item -> id.equals(item.id())).findFirst().orElseThrow();
	}

	private void assertStatus(HttpStatus status, Runnable action) {
		assertThatThrownBy(action::run)
				.isInstanceOfSatisfying(ResponseStatusException.class,
						error -> assertThat(error.getStatusCode()).isEqualTo(status));
	}
}
