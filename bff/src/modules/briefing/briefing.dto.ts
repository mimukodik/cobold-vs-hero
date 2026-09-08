export interface BriefingRequestDto {
  changeTitle: string;
  changeDescription: string;
  affectedSurfaces: string[];
  riskFlags: string[];
}

export type ActorRole = 'developer' | 'api-reviewer' | 'ui-reviewer' | 'tech-lead';

export interface AttachEvidenceRequestDto {
  actorRole: ActorRole;
  url: string;
}

export interface ReviewEvidenceRequestDto {
  actorRole: ActorRole;
}

export interface RejectEvidenceRequestDto extends ReviewEvidenceRequestDto {
  comment: string;
}

export interface EvidenceItemDto {
  id: string;
  label: string;
  status: 'planned' | 'attached' | 'approved';
  approverRole: Exclude<ActorRole, 'developer'>;
  url?: string;
  rejectionComment?: string;
}

export interface EvidenceGapDto {
  evidenceId: string;
  nextStep: string;
  responsibleParty: string;
  message: string;
}

export interface BackendReviewMatrixRowDto {
  surface: string;
  expectedEvidence: string[];
  providedEvidence: string[];
  gap: string;
  nextAction: string;
}

export interface BackendBriefingResponseDto {
  briefingId: string;
  signal: string;
  headline: string;
  readinessVerdict: 'READY' | 'NOT_READY';
  requiredEvidence: string[];
  missingEvidence: string[];
  evidenceItems: EvidenceItemDto[];
  gaps: EvidenceGapDto[];
  stopCondition: string;
  heroNextStep: string;
  reviewMatrix: BackendReviewMatrixRowDto[];
}

export interface BackendStatusResponseDto {
  service: string;
  runtime: string;
  status: string;
  checkedAt: string;
  port: number;
}

export interface ReviewMatrixRowDto {
  surface: string;
  expectedEvidence: string[];
  providedEvidence: string[];
  gap: string;
  nextAction: string;
}

export interface BriefingResponseDto {
  briefingId: string;
  signal: string;
  headline: string;
  readinessVerdict: 'READY' | 'NOT_READY';
  requiredEvidence: string[];
  missingEvidence: string[];
  evidenceItems: EvidenceItemDto[];
  gaps: EvidenceGapDto[];
  stopCondition: string;
  nextAction: string;
  reviewMatrix: ReviewMatrixRowDto[];
}

export interface ServiceStatusDto {
  service: string;
  runtime: string;
  status: 'UP' | 'DOWN';
  checkedAt: string;
  endpoint: string;
  detail?: string;
}

export interface SystemStatusResponseDto {
  status: 'UP' | 'DEGRADED';
  checkedAt: string;
  services: ServiceStatusDto[];
}
