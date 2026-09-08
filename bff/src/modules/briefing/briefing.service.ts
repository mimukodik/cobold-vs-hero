import { BadRequestException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  AttachEvidenceRequestDto,
  BackendStatusResponseDto,
  BackendBriefingResponseDto,
  BriefingRequestDto,
  BriefingResponseDto,
  RejectEvidenceRequestDto,
  ReviewEvidenceRequestDto,
  ServiceStatusDto,
  SystemStatusResponseDto,
} from './briefing.dto';
import { logInfo, logWarn } from '../../observability/logger';

@Injectable()
export class BriefingService {
  private readonly backendBaseUrl = process.env.BACKEND_BASE_URL ?? 'http://localhost:8080';
  private readonly bffPort = Number(process.env.PORT ?? 3000);

  async createBriefing(request: BriefingRequestDto): Promise<BriefingResponseDto> {
    logInfo('bff.briefing.requested', {
      affectedSurfaceCount: request.affectedSurfaces.length,
      riskFlagCount: request.riskFlags.length,
    });

    const response = await fetch(`${this.backendBaseUrl}/api/cobold-vs-hero/briefing`, {
      body: JSON.stringify(request),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      logWarn('bff.backend.briefing.failed', { statusCode: response.status });
      throw new ServiceUnavailableException(`Backend returned ${response.status}`);
    }

    const backendResponse = (await response.json()) as BackendBriefingResponseDto;
    logInfo('bff.briefing.completed', {
      missingEvidenceCount: backendResponse.missingEvidence.length,
      reviewMatrixRows: backendResponse.reviewMatrix.length,
      signal: backendResponse.signal,
    });

    return this.mapBriefing(backendResponse);
  }

  async attachEvidence(
    briefingId: string,
    evidenceId: string,
    request: AttachEvidenceRequestDto,
  ): Promise<BriefingResponseDto> {
    if (!request.url?.trim()) {
      throw new BadRequestException({ errors: { url: 'URL is required' }, message: 'Validation failed' });
    }
    return this.transition(briefingId, evidenceId, 'attach', request);
  }

  async approveEvidence(
    briefingId: string,
    evidenceId: string,
    request: ReviewEvidenceRequestDto,
  ): Promise<BriefingResponseDto> {
    return this.transition(briefingId, evidenceId, 'approve', request);
  }

  async rejectEvidence(
    briefingId: string,
    evidenceId: string,
    request: RejectEvidenceRequestDto,
  ): Promise<BriefingResponseDto> {
    if (!request.comment?.trim()) {
      throw new BadRequestException({ errors: { comment: 'Reviewer comment is required' }, message: 'Validation failed' });
    }
    return this.transition(briefingId, evidenceId, 'reject', request);
  }

  private async transition(
    briefingId: string,
    evidenceId: string,
    action: 'attach' | 'approve' | 'reject',
    request: AttachEvidenceRequestDto | ReviewEvidenceRequestDto | RejectEvidenceRequestDto,
  ): Promise<BriefingResponseDto> {
    const response = await fetch(
      `${this.backendBaseUrl}/api/cobold-vs-hero/briefings/${briefingId}/evidence/${evidenceId}/${action}`,
      {
        body: JSON.stringify(request),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new HttpException(detail || `Backend returned ${response.status}`, response.status);
    }
    return this.mapBriefing((await response.json()) as BackendBriefingResponseDto);
  }

  private mapBriefing(backendResponse: BackendBriefingResponseDto): BriefingResponseDto {
    return {
      briefingId: backendResponse.briefingId,
      evidenceItems: backendResponse.evidenceItems,
      gaps: backendResponse.gaps,
      headline: backendResponse.headline,
      missingEvidence: backendResponse.missingEvidence,
      nextAction: backendResponse.heroNextStep,
      readinessVerdict: backendResponse.readinessVerdict,
      requiredEvidence: backendResponse.requiredEvidence,
      reviewMatrix: backendResponse.reviewMatrix,
      signal: backendResponse.signal,
      stopCondition: backendResponse.stopCondition,
    };
  }

  async getStatus(): Promise<SystemStatusResponseDto> {
    const checkedAt = new Date().toISOString();
    const bffStatus: ServiceStatusDto = {
      checkedAt,
      endpoint: `http://localhost:${this.bffPort}/api/cobold-vs-hero/status`,
      runtime: 'nestjs',
      service: 'bff-nestjs',
      status: 'UP',
    };
    const backendStatus = await this.getBackendStatus();
    logInfo('bff.status.checked', { backendStatus: backendStatus.status });

    return {
      checkedAt,
      services: [bffStatus, backendStatus],
      status: backendStatus.status === 'UP' ? 'UP' : 'DEGRADED',
    };
  }

  async checkReadiness(): Promise<void> {
    const backendStatus = await this.getBackendStatus();

    if (backendStatus.status !== 'UP') {
      logWarn('bff.readiness.failed', { detail: backendStatus.detail });
      throw new ServiceUnavailableException(backendStatus.detail ?? 'Backend is not ready');
    }
  }

  private async getBackendStatus(): Promise<ServiceStatusDto> {
    const endpoint = `${this.backendBaseUrl}/api/cobold-vs-hero/status`;

    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(1500) });

      if (!response.ok) {
        logWarn('bff.backend.status.failed', { statusCode: response.status });
        return this.backendDownStatus(endpoint, `Backend returned ${response.status}`);
      }

      const backend = (await response.json()) as BackendStatusResponseDto;

      return {
        checkedAt: backend.checkedAt,
        endpoint,
        runtime: backend.runtime,
        service: backend.service,
        status: backend.status === 'UP' ? 'UP' : 'DOWN',
      };
    } catch (error) {
      logWarn('bff.backend.status.error', {
        errorMessage: error instanceof Error ? error.message : 'Status check failed',
      });
      return this.backendDownStatus(endpoint, error instanceof Error ? error.message : 'Status check failed');
    }
  }

  private backendDownStatus(endpoint: string, detail: string): ServiceStatusDto {
    return {
      checkedAt: new Date().toISOString(),
      detail,
      endpoint,
      runtime: 'spring-boot',
      service: 'be-java',
      status: 'DOWN',
    };
  }
}
