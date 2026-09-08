import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  AttachEvidenceRequestDto,
  BriefingRequestDto,
  BriefingResponseDto,
  RejectEvidenceRequestDto,
  ReviewEvidenceRequestDto,
  SystemStatusResponseDto,
} from './briefing.dto';
import { BriefingService } from './briefing.service';

@Controller('/api/cobold-vs-hero')
export class BriefingController {
  constructor(private readonly briefingService: BriefingService) {}

  @Post('/briefing')
  @HttpCode(200)
  createBriefing(@Body() request: BriefingRequestDto): Promise<BriefingResponseDto> {
    return this.briefingService.createBriefing(request);
  }

  @Post('/briefings/:briefingId/evidence/:evidenceId/attach')
  @HttpCode(200)
  attachEvidence(
    @Param('briefingId') briefingId: string,
    @Param('evidenceId') evidenceId: string,
    @Body() request: AttachEvidenceRequestDto,
  ): Promise<BriefingResponseDto> {
    return this.briefingService.attachEvidence(briefingId, evidenceId, request);
  }

  @Post('/briefings/:briefingId/evidence/:evidenceId/approve')
  @HttpCode(200)
  approveEvidence(
    @Param('briefingId') briefingId: string,
    @Param('evidenceId') evidenceId: string,
    @Body() request: ReviewEvidenceRequestDto,
  ): Promise<BriefingResponseDto> {
    return this.briefingService.approveEvidence(briefingId, evidenceId, request);
  }

  @Post('/briefings/:briefingId/evidence/:evidenceId/reject')
  @HttpCode(200)
  rejectEvidence(
    @Param('briefingId') briefingId: string,
    @Param('evidenceId') evidenceId: string,
    @Body() request: RejectEvidenceRequestDto,
  ): Promise<BriefingResponseDto> {
    return this.briefingService.rejectEvidence(briefingId, evidenceId, request);
  }

  @Get('/status')
  getStatus(): Promise<SystemStatusResponseDto> {
    return this.briefingService.getStatus();
  }

  @Get('/readiness')
  @HttpCode(204)
  checkReadiness(): Promise<void> {
    return this.briefingService.checkReadiness();
  }
}
