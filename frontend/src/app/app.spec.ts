import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  function flushStatus(): void {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/cobold-vs-hero/status').flush({
      checkedAt: '2026-06-18T20:00:00.000Z',
      services: [
        {
          checkedAt: '2026-06-18T20:00:00.000Z',
          endpoint: 'http://localhost:3000/api/cobold-vs-hero/status',
          runtime: 'nestjs',
          service: 'bff-nestjs',
          status: 'UP',
        },
        {
          checkedAt: '2026-06-18T20:00:00.000Z',
          endpoint: 'http://localhost:8080/api/cobold-vs-hero/status',
          runtime: 'spring-boot',
          service: 'be-java',
          status: 'UP',
        },
      ],
      status: 'UP',
    });
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushStatus();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('review readiness matrix');
  });

  it('should render both service statuses', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushStatus();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('BFF NestJS');
    expect(compiled.textContent).toContain('BE Java');
    expect(compiled.textContent).toContain('spring-boot');
  });

  it('blocks attaching evidence without a URL', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.attachEvidence({
      approverRole: 'api-reviewer',
      id: 'backend-test',
      label: 'Backend test',
      status: 'planned',
    });

    expect(app.evidenceErrors['backend-test']).toContain('URL');
  });
});
