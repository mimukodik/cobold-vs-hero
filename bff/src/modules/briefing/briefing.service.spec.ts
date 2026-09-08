import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { BriefingService } from './briefing.service';

const backendBriefing = {
  briefingId: 'briefing-1',
  evidenceItems: [
    {
      approverRole: 'api-reviewer',
      id: 'backend-test',
      label: 'Backend test',
      status: 'attached',
      url: 'https://example.test/backend',
    },
  ],
  gaps: [
    {
      evidenceId: 'backend-test',
      message: 'jóváhagyásra vár: API reviewer',
      nextStep: 'jóváhagyásra vár',
      responsibleParty: 'API reviewer',
    },
  ],
  headline: 'Evidence approval is incomplete.',
  heroNextStep: 'jóváhagyásra vár: API reviewer',
  missingEvidence: ['backend-test'],
  readinessVerdict: 'NOT_READY',
  requiredEvidence: ['backend-test'],
  reviewMatrix: [],
  signal: 'sparring',
  stopCondition: 'Approval required.',
};

test('attach endpoint forwards the URL and maps the backend response', async () => {
  let requestUrl = '';
  let requestBody = '';
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = String(init?.body);
    return Response.json(backendBriefing);
  };

  const result = await new BriefingService().attachEvidence('briefing-1', 'backend-test', {
    actorRole: 'developer',
    url: 'https://example.test/backend',
  });

  assert.match(requestUrl, /briefings\/briefing-1\/evidence\/backend-test\/attach$/);
  assert.deepEqual(JSON.parse(requestBody), {
    actorRole: 'developer',
    url: 'https://example.test/backend',
  });
  assert.equal(result.readinessVerdict, 'NOT_READY');
  assert.equal(result.nextAction, backendBriefing.heroNextStep);
});

test('approve endpoint forwards the reviewer role', async () => {
  let requestBody = '';
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body);
    return Response.json({
      ...backendBriefing,
      evidenceItems: [{ ...backendBriefing.evidenceItems[0], status: 'approved' }],
      gaps: [],
      heroNextStep: 'Proceed with the review.',
      missingEvidence: [],
      readinessVerdict: 'READY',
      signal: 'truce',
    });
  };

  const result = await new BriefingService().approveEvidence('briefing-1', 'backend-test', {
    actorRole: 'api-reviewer',
  });

  assert.deepEqual(JSON.parse(requestBody), { actorRole: 'api-reviewer' });
  assert.equal(result.readinessVerdict, 'READY');
});

test('reject endpoint forwards the mandatory reviewer comment', async () => {
  let requestUrl = '';
  let requestBody = '';
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = String(init?.body);
    return Response.json({
      ...backendBriefing,
      evidenceItems: [
        {
          ...backendBriefing.evidenceItems[0],
          rejectionComment: 'Add the missing edge case.',
          status: 'planned',
          url: undefined,
        },
      ],
    });
  };

  const result = await new BriefingService().rejectEvidence('briefing-1', 'backend-test', {
    actorRole: 'api-reviewer',
    comment: 'Add the missing edge case.',
  });

  assert.match(requestUrl, /reject$/);
  assert.equal(JSON.parse(requestBody).comment, 'Add the missing edge case.');
  assert.equal(result.evidenceItems[0].rejectionComment, 'Add the missing edge case.');
});

test('attach rejects a missing URL with a field error', async () => {
  await assert.rejects(
    new BriefingService().attachEvidence('briefing-1', 'backend-test', {
      actorRole: 'developer',
      url: ' ',
    }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.deepEqual(error.getResponse(), {
        errors: { url: 'URL is required' },
        message: 'Validation failed',
      });
      return true;
    },
  );
});

test('reject rejects a missing comment with a field error', async () => {
  await assert.rejects(
    new BriefingService().rejectEvidence('briefing-1', 'backend-test', {
      actorRole: 'api-reviewer',
      comment: '',
    }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.deepEqual(error.getResponse(), {
        errors: { comment: 'Reviewer comment is required' },
        message: 'Validation failed',
      });
      return true;
    },
  );
});
