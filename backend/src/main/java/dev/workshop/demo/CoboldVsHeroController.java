package dev.workshop.demo;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/cobold-vs-hero")
@CrossOrigin(origins = "http://localhost:4200")
class CoboldVsHeroController {

	private static final Logger LOGGER = LoggerFactory.getLogger(CoboldVsHeroController.class);
	private static final String DEVELOPER = "developer";
	private static final String API_REVIEWER = "api-reviewer";
	private static final String UI_REVIEWER = "ui-reviewer";
	private static final String TECH_LEAD = "tech-lead";
	private static final Set<String> TECH_LEAD_RISKS = Set.of("production", "auth");

	private static final Map<String, List<String>> EVIDENCE_BY_SURFACE = Map.of(
			"backend", List.of("backend-test"),
			"bff", List.of("bruno-smoke"),
			"frontend", List.of("browser-screenshot"),
			"contract", List.of("bruno-smoke"),
			"testing", List.of("dps-testautomation"));

	private static final Map<String, List<String>> EVIDENCE_BY_RISK = Map.of(
			"production", List.of("dps-testautomation", "browser-screenshot", "rollback"),
			"customer-data", List.of("dps-testautomation"),
			"auth", List.of("dps-testautomation"),
			"payment", List.of("dps-testautomation", "browser-screenshot"),
			"unclear-scope", List.of("hld", "lld"));

	private final int serverPort;
	private final Map<String, BriefingState> briefings = new ConcurrentHashMap<>();

	CoboldVsHeroController(@Value("${server.port:8080}") int serverPort) {
		this.serverPort = serverPort;
	}

	@GetMapping("/status")
	StatusResponse status() {
		return new StatusResponse("be-java", "spring-boot", "UP", Instant.now().toString(), serverPort);
	}

	@PostMapping("/briefing")
	BriefingResponse createBriefing(@Valid @RequestBody BriefingRequest request) {
		String briefingId = UUID.randomUUID().toString();
		LinkedHashMap<String, EvidenceItem> evidence = new LinkedHashMap<>();
		for (String id : requiredEvidenceFor(request)) {
			evidence.put(id, new EvidenceItem(id, labelFor(id), "planned", approverFor(id, request.riskFlags()), null, null));
		}
		BriefingState state = new BriefingState(briefingId, request, evidence);
		briefings.put(briefingId, state);
		LOGGER.info("backend.briefing created briefingId={} evidenceCount={}", briefingId, evidence.size());
		return responseFor(state);
	}

	@PostMapping("/briefings/{briefingId}/evidence/{evidenceId}/attach")
	BriefingResponse attachEvidence(
			@PathVariable String briefingId,
			@PathVariable String evidenceId,
			@Valid @RequestBody AttachEvidenceRequest request) {
		requireRole(request.actorRole(), DEVELOPER);
		BriefingState state = briefing(briefingId);
		EvidenceItem item = evidence(state, evidenceId);
		requireStatus(item, "planned", "attach");
		state.evidence().put(evidenceId, item.withAttachment(request.url()));
		return responseFor(state);
	}

	@PostMapping("/briefings/{briefingId}/evidence/{evidenceId}/approve")
	BriefingResponse approveEvidence(
			@PathVariable String briefingId,
			@PathVariable String evidenceId,
			@Valid @RequestBody ReviewEvidenceRequest request) {
		BriefingState state = briefing(briefingId);
		EvidenceItem item = evidence(state, evidenceId);
		requireRole(request.actorRole(), item.approverRole());
		requireStatus(item, "attached", "approve");
		state.evidence().put(evidenceId, item.withStatus("approved"));
		return responseFor(state);
	}

	@PostMapping("/briefings/{briefingId}/evidence/{evidenceId}/reject")
	BriefingResponse rejectEvidence(
			@PathVariable String briefingId,
			@PathVariable String evidenceId,
			@Valid @RequestBody RejectEvidenceRequest request) {
		BriefingState state = briefing(briefingId);
		EvidenceItem item = evidence(state, evidenceId);
		requireRole(request.actorRole(), item.approverRole());
		requireStatus(item, "attached", "reject");
		state.evidence().put(evidenceId, item.withRejection(request.comment()));
		return responseFor(state);
	}

	private BriefingState briefing(String briefingId) {
		BriefingState state = briefings.get(briefingId);
		if (state == null) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Briefing not found");
		}
		return state;
	}

	private EvidenceItem evidence(BriefingState state, String evidenceId) {
		EvidenceItem item = state.evidence().get(evidenceId);
		if (item == null) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Evidence item not found");
		}
		return item;
	}

	private void requireRole(String actual, String expected) {
		if (!expected.equals(actual)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Action requires role: " + roleLabel(expected));
		}
	}

	private void requireStatus(EvidenceItem item, String expected, String action) {
		if (!expected.equals(item.status())) {
			throw new ResponseStatusException(
					HttpStatus.CONFLICT,
					"Cannot " + action + " evidence in state " + item.status());
		}
	}

	private BriefingResponse responseFor(BriefingState state) {
		List<EvidenceItem> evidenceItems = new ArrayList<>(state.evidence().values());
		List<String> requiredEvidence = evidenceItems.stream().map(EvidenceItem::id).toList();
		List<String> missingEvidence = evidenceItems.stream()
				.filter(item -> !"approved".equals(item.status()))
				.map(EvidenceItem::id)
				.toList();
		List<EvidenceGap> gaps = evidenceItems.stream()
				.filter(item -> !"approved".equals(item.status()))
				.map(this::gapFor)
				.toList();
		boolean ready = gaps.isEmpty();
		String signal = ready ? "truce" : state.request().riskFlags().stream().anyMatch(Set.of("production", "payment", "auth")::contains)
				? "shield-wall"
				: "sparring";

		return new BriefingResponse(
				state.id(),
				signal,
				ready ? "Review-ready starter slice." : "Evidence approval is incomplete.",
				ready ? "READY" : "NOT_READY",
				requiredEvidence,
				missingEvidence,
				evidenceItems,
				gaps,
				ready ? "All required evidence is approved." : "Do not request final review until every required evidence item is approved.",
				ready ? "Proceed with the review." : gaps.get(0).message(),
				reviewMatrixFor(state));
	}

	private EvidenceGap gapFor(EvidenceItem item) {
		if ("planned".equals(item.status())) {
			return new EvidenceGap(item.id(), "csatolásra vár", "Fejlesztő", "csatolásra vár: Fejlesztő");
		}
		String responsible = roleLabel(item.approverRole());
		return new EvidenceGap(item.id(), "jóváhagyásra vár", responsible, "jóváhagyásra vár: " + responsible);
	}

	private List<ReviewMatrixRow> reviewMatrixFor(BriefingState state) {
		return state.request().affectedSurfaces().stream().map(surface -> {
			List<String> expected = EVIDENCE_BY_SURFACE.getOrDefault(surface, List.of());
			List<String> approved = expected.stream()
					.filter(id -> "approved".equals(state.evidence().get(id).status()))
					.toList();
			List<String> pending = expected.stream().filter(id -> !approved.contains(id)).toList();
			String gap = pending.isEmpty() ? "covered" : "pending approval: " + String.join(", ", pending);
			return new ReviewMatrixRow(surface, expected, approved, gap,
					pending.isEmpty() ? "Keep approved evidence visible." : "Complete evidence approval.");
		}).toList();
	}

	private List<String> requiredEvidenceFor(BriefingRequest request) {
		LinkedHashSet<String> required = new LinkedHashSet<>();
		request.affectedSurfaces().forEach(surface -> required.addAll(EVIDENCE_BY_SURFACE.getOrDefault(surface, List.of())));
		if (request.affectedSurfaces().size() > 1) {
			required.add("hld");
			required.add("lld");
		}
		request.riskFlags().forEach(risk -> required.addAll(EVIDENCE_BY_RISK.getOrDefault(risk, List.of())));
		return new ArrayList<>(required);
	}

	private String approverFor(String evidenceId, List<String> riskFlags) {
		return switch (evidenceId) {
			case "browser-screenshot" -> UI_REVIEWER;
			case "hld", "lld" -> riskFlags.stream().anyMatch(TECH_LEAD_RISKS::contains) ? TECH_LEAD : API_REVIEWER;
			case "rollback" -> TECH_LEAD;
			default -> API_REVIEWER;
		};
	}

	private String labelFor(String evidenceId) {
		return switch (evidenceId) {
			case "backend-test" -> "Backend test";
			case "bruno-smoke" -> "Bruno smoke test";
			case "browser-screenshot" -> "Browser screenshot";
			case "hld" -> "High-level design";
			case "lld" -> "Low-level design";
			case "rollback" -> "Rollback plan";
			case "dps-testautomation" -> "API test automation";
			default -> evidenceId;
		};
	}

	private String roleLabel(String role) {
		return switch (role) {
			case DEVELOPER -> "Fejlesztő";
			case API_REVIEWER -> "API reviewer";
			case UI_REVIEWER -> "UI reviewer";
			case TECH_LEAD -> "Tech lead";
			default -> role;
		};
	}

	record BriefingRequest(
			@NotBlank String changeTitle,
			@NotBlank String changeDescription,
			@NotEmpty List<String> affectedSurfaces,
			@NotNull List<String> riskFlags) {
	}

	record AttachEvidenceRequest(@NotBlank String actorRole, @NotBlank String url) {
	}

	record ReviewEvidenceRequest(@NotBlank String actorRole) {
	}

	record RejectEvidenceRequest(@NotBlank String actorRole, @NotBlank String comment) {
	}

	record BriefingResponse(
			String briefingId,
			String signal,
			String headline,
			String readinessVerdict,
			List<String> requiredEvidence,
			List<String> missingEvidence,
			List<EvidenceItem> evidenceItems,
			List<EvidenceGap> gaps,
			String stopCondition,
			String heroNextStep,
			List<ReviewMatrixRow> reviewMatrix) {
	}

	record EvidenceItem(
			String id,
			String label,
			String status,
			String approverRole,
			String url,
			String rejectionComment) {

		EvidenceItem withAttachment(String attachmentUrl) {
			return new EvidenceItem(id, label, "attached", approverRole, attachmentUrl, null);
		}

		EvidenceItem withStatus(String nextStatus) {
			return new EvidenceItem(id, label, nextStatus, approverRole, url, rejectionComment);
		}

		EvidenceItem withRejection(String comment) {
			return new EvidenceItem(id, label, "planned", approverRole, null, comment);
		}
	}

	record EvidenceGap(String evidenceId, String nextStep, String responsibleParty, String message) {
	}

	record ReviewMatrixRow(
			String surface,
			List<String> expectedEvidence,
			List<String> providedEvidence,
			String gap,
			String nextAction) {
	}

	record BriefingState(String id, BriefingRequest request, LinkedHashMap<String, EvidenceItem> evidence) {
	}

	record StatusResponse(String service, String runtime, String status, String checkedAt, int port) {
	}
}
