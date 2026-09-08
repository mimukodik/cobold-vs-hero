# language: en

@toy-onecare @ui @briefing
Feature: Reviewer sign-off for briefing evidence

  Scenario: URL is required to attach evidence
    Given planned evidence
    When the developer attaches it without a URL
    Then a URL field error is shown

  Scenario: Attached evidence is not ready
    Given the developer attached required evidence
    Then the verdict remains NOT_READY
    And the API reviewer is responsible for approval

  Scenario: Assigned reviewer approves evidence
    Given attached backend evidence
    When the API reviewer approves it
    Then its state is approved

  Scenario: Reviewer rejection requires a comment
    Given attached backend evidence
    When the API reviewer rejects it without a comment
    Then a reviewer comment field error is shown
    When the reviewer rejects it with a comment
    Then the evidence is planned and the developer sees the comment

  Scenario: All evidence approved is ready
    Given every required evidence item is attached
    When each assigned reviewer approves their item
    Then the verdict is READY

  Scenario: Production design evidence requires tech lead
    Given a production change with design evidence
    Then HLD and LLD are assigned to the Tech lead
