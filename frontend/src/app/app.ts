import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface BriefingResponse {
  briefingId: string;
  signal: string;
  headline: string;
  readinessVerdict: 'READY' | 'NOT_READY';
  requiredEvidence: string[];
  missingEvidence: string[];
  evidenceItems: EvidenceItem[];
  gaps: EvidenceGap[];
  stopCondition: string;
  nextAction: string;
  reviewMatrix: ReviewMatrixRow[];
}

type ActorRole = 'developer' | 'api-reviewer' | 'ui-reviewer' | 'tech-lead';

interface EvidenceItem {
  id: string;
  label: string;
  status: 'planned' | 'attached' | 'approved';
  approverRole: Exclude<ActorRole, 'developer'>;
  url?: string;
  rejectionComment?: string;
}

interface EvidenceGap {
  evidenceId: string;
  nextStep: string;
  responsibleParty: string;
  message: string;
}

interface ReviewMatrixRow {
  surface: string;
  expectedEvidence: string[];
  providedEvidence: string[];
  gap: string;
  nextAction: string;
}

interface ServiceStatus {
  service: string;
  runtime: string;
  status: 'UP' | 'DOWN';
  checkedAt: string;
  endpoint: string;
  detail?: string;
}

interface SystemStatusResponse {
  status: 'UP' | 'DEGRADED';
  checkedAt: string;
  services: ServiceStatus[];
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly bffBaseUrl = new URLSearchParams(window.location.search).get('bffBaseUrl') ?? '';

  changeTitle = 'Status panel mapping';
  changeDescription = 'Add one backend field, one BFF mapper, and one Angular status panel.';
  affectedSurfaces = ['backend', 'bff', 'frontend'];
  riskFlags: string[] = [];
  selectedRole: ActorRole = 'developer';
  evidenceUrls: Record<string, string> = {};
  rejectionComments: Record<string, string> = {};
  evidenceErrors: Record<string, string> = {};

  readonly surfaceOptions = [
    { value: 'backend', label: 'Backend' },
    { value: 'bff', label: 'BFF' },
    { value: 'frontend', label: 'Frontend' },
    { value: 'contract', label: 'Contract' },
    { value: 'testing', label: 'Testing' },
  ];
  readonly roleOptions: { value: ActorRole; label: string }[] = [
    { value: 'developer', label: 'Fejlesztő' },
    { value: 'api-reviewer', label: 'API reviewer' },
    { value: 'ui-reviewer', label: 'UI reviewer' },
    { value: 'tech-lead', label: 'Tech lead' },
  ];
  readonly riskOptions = [
    { value: 'production', label: 'Production' },
    { value: 'customer-data', label: 'Customer data' },
    { value: 'auth', label: 'Auth' },
    { value: 'payment', label: 'Payment' },
    { value: 'unclear-scope', label: 'Unclear scope' },
  ];

  readonly briefing = signal<BriefingResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly systemStatus = signal<SystemStatusResponse | null>(null);
  readonly statusLoading = signal(false);
  readonly statusError = signal('');

  isFormValid(): boolean {
    return !!this.changeTitle && !!this.changeDescription && this.affectedSurfaces.length > 0;
  }

  ngOnInit(): void {
    this.refreshStatus();
  }

  refreshStatus(): void {
    this.statusLoading.set(true);
    this.statusError.set('');

    this.http
      .get<SystemStatusResponse>(this.apiUrl('/api/cobold-vs-hero/status'))
      .subscribe({
        next: (systemStatus) => {
          this.systemStatus.set(systemStatus);
          this.statusLoading.set(false);
        },
        error: () => {
          this.statusError.set('The BFF status endpoint is not reachable.');
          this.statusLoading.set(false);
        },
      });
  }

  requestBriefing(): void {
    if (!this.isFormValid()) {
      this.error.set('Enter a title, description, and at least one affected surface.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.http
      .post<BriefingResponse>(this.apiUrl('/api/cobold-vs-hero/briefing'), {
        affectedSurfaces: this.affectedSurfaces,
        changeDescription: this.changeDescription,
        changeTitle: this.changeTitle,
        riskFlags: this.riskFlags,
      })
      .subscribe({
        next: (briefing) => {
          this.briefing.set(briefing);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('The briefing flow is not reachable. Start the BFF and backend.');
          this.loading.set(false);
        },
      });
  }

  attachEvidence(item: EvidenceItem): void {
    const url = this.evidenceUrls[item.id]?.trim();
    if (!url) {
      this.evidenceErrors = { ...this.evidenceErrors, [item.id]: 'URL megadása kötelező.' };
      return;
    }
    this.transitionEvidence(item.id, 'attach', { actorRole: this.selectedRole, url });
  }

  approveEvidence(item: EvidenceItem): void {
    this.transitionEvidence(item.id, 'approve', { actorRole: this.selectedRole });
  }

  rejectEvidence(item: EvidenceItem): void {
    const comment = this.rejectionComments[item.id]?.trim();
    if (!comment) {
      this.evidenceErrors = { ...this.evidenceErrors, [item.id]: 'A reviewer megjegyzése kötelező.' };
      return;
    }
    this.transitionEvidence(item.id, 'reject', { actorRole: this.selectedRole, comment });
  }

  canReview(item: EvidenceItem): boolean {
    return this.selectedRole === item.approverRole;
  }

  roleLabel(role: ActorRole): string {
    return this.roleOptions.find((option) => option.value === role)?.label ?? role;
  }

  statusLabel(status: EvidenceItem['status']): string {
    return { approved: 'jóváhagyva', attached: 'csatolva', planned: 'tervezett' }[status];
  }

  private transitionEvidence(evidenceId: string, action: 'attach' | 'approve' | 'reject', body: object): void {
    const current = this.briefing();
    if (!current) return;
    this.evidenceErrors = { ...this.evidenceErrors, [evidenceId]: '' };
    this.http
      .post<BriefingResponse>(
        this.apiUrl(`/api/cobold-vs-hero/briefings/${current.briefingId}/evidence/${evidenceId}/${action}`),
        body,
      )
      .subscribe({
        next: (briefing) => this.briefing.set(briefing),
        error: () => {
          this.evidenceErrors = { ...this.evidenceErrors, [evidenceId]: 'A művelet nem hajtható végre.' };
        },
      });
  }

  private apiUrl(path: string): string {
    return `${this.bffBaseUrl.replace(/\/$/, '')}${path}`;
  }

  statusFor(signal: string): string {
    switch (signal) {
      case 'shield-wall':
        return 'Split before review';
      case 'sparring':
        return 'Sharpen before MR';
      default:
        return 'Review-ready slice';
    }
  }

  serviceLabel(service: ServiceStatus): string {
    return service.service === 'be-java' ? 'BE Java' : 'BFF NestJS';
  }

  toggleSelection(values: string[], value: string): void {
    const index = values.indexOf(value);

    if (index >= 0) {
      values.splice(index, 1);
      return;
    }

    values.push(value);
  }

  hasSelection(values: string[], value: string): boolean {
    return values.includes(value);
  }
}
