<!--
SYNC IMPACT REPORT (remove before committing)
=============================================
Version change: 1.0.0 → 1.0.1
Bump rationale: PATCH — six approved policy decisions incorporated as targeted
  clarifications and tightenings of existing principles. No principles added,
  removed, or fundamentally redefined. Specific changes:
    - Principle III: autonomous mode explicitly disabled-by-default; price-change
      threshold language replaced with configurable percentage-based AND absolute-
      rupee dual-threshold requirement; comparison baseline and rounding deferred to
      specification; uncertainty → refuse-to-proceed rule added.
    - Principle IV: capability registry now specified as a version-controlled
      structured file; required fields enumerated; runtime-DB upgrade path noted.
    - Principle XI: hard-coded retention language removed; policy deferred to
      specification phase with required fields enumerated.
    - Scope and Autonomy Boundaries: CBDC language tightened (no implication of
      current availability; future inclusion requires full spec+risk process);
      ratification date annotation clarified as proposed pending team approval.
    - Governance: amendment procedure extended with step to assess impact on
      dependent specifications and implementation artefacts.

Modified principles:
  - III. Safe Purchasing and Financial Integrity (price-change + autonomous-default)
  - IV. Verified Integrations (capability registry format)
  - XI. Observability and Auditability (log retention)

Sections with targeted edits (no rename):
  - Scope and Autonomy Boundaries (CBDC + ratification wording)
  - Governance → Amendment procedure (impact-on-dependents step added)

Added sections: none
Removed sections: none

Follow-up TODOs:
  - TODO(RATIFICATION_DATE): 2026-11-01 is the *proposed* adoption date. Update to
    the actual date once team approval is confirmed.
  - TODO(PRICE_CHANGE_THRESHOLDS): Exact percentage threshold, absolute-rupee
    threshold, comparison baseline, rounding rules, and treatment of price
    decreases MUST be defined during the specification phase (Principle III).
  - TODO(REGISTRY_FILE_FORMAT): The structured file format (JSON, YAML, TOML, etc.)
    and path MUST be confirmed during planning unless the project already has
    a convention (Principle IV).
  - TODO(AUDIT_LOG_RETENTION): Retention duration, access controls, deletion/
    anonymisation schedule, and legal-hold rules MUST be defined during specification
    after assessing IT Act, DPDP Act, consumer protection, and operational
    requirements (Principle XI).
-->

# Acquira Constitution

## Core Principles

### I. User Value and Explainability

Every recommendation Acquira produces MUST be relevant to the user's stated intent,
grounded in verifiable product data, and accompanied by an explanation of the key
factors that drove it.

- The agent MUST surface trade-offs (price vs. quality, speed vs. cost, brand vs.
  off-brand) whenever they materially affect the recommendation.
- Uncertainty or data gaps MUST be communicated explicitly rather than silently
  resolved by the model.
- Assumptions made during search, normalisation, or ranking MUST be disclosed in the
  response or an auditable log.
- Vague or ambiguous user requests MUST trigger a clarification prompt rather than a
  guess.

### II. Security and Privacy by Design

User personal data — including names, addresses, payment credentials, UPI handles,
order history, and browsing preferences — is sensitive and MUST be protected at every
layer of the system.

- Secrets (API keys, tokens, payment credentials) MUST NOT appear in prompts, log
  output, source control, generated reports, or any user-facing surface.
- Personal data MUST be stored with the minimum retention necessary and MUST be
  deletable on user request.
- Data MUST be transmitted over encrypted channels only.
- Access controls MUST follow the principle of least privilege: each subsystem
  receives only the permissions it needs for its defined role.
- Third-party integrations MUST be evaluated for their data-handling practices before
  enabling them.

### III. Safe Purchasing and Financial Integrity

Purchase authorisation and financial safety controls MUST be enforced in deterministic
application logic — not delegated to or overridden by the LLM.

- **Approval-based mode** (default): every purchase MUST require explicit user review
  and confirmation before any payment or checkout action is initiated. This is the
  only permitted mode until the user explicitly configures bounded-autonomous mode.
- **Bounded-autonomous mode**: autonomous purchasing is permissible ONLY when ALL of
  the following conditions are satisfied — the system MUST remain in approval-based
  mode if any condition is unmet:
  1. The user has explicitly enabled autonomous purchasing in their account settings.
  2. A spending limit (per-order and/or cumulative period) has been explicitly
     configured by the user. No default spending limit is assumed.
  3. A purchasing policy (approved categories, marketplaces, seller constraints) has
     been explicitly configured by the user.
  4. The candidate order falls within all configured limits and policies.
  5. All applicable integration safety checks have passed.
- **Conversational intent is not authorisation.** Inferring permission to purchase
  from natural-language conversation alone is prohibited; explicit configuration is
  required.
- **Price-change handling**: the system MUST support two independently configurable
  price-change thresholds — a percentage-based threshold and an absolute-rupee
  threshold. If either threshold is exceeded between the moment of authorisation and
  checkout, the transaction MUST pause and re-seek explicit user approval. The precise
  threshold values, the comparison baseline (e.g., recommended price vs. authorised
  amount), rounding rules, and the treatment of price decreases MUST be defined during
  the specification phase; no numerical defaults are assumed by this constitution.
- If the authorisation state or the final payable amount is uncertain for any reason,
  the system MUST NOT proceed autonomously; it MUST escalate to the user.
- Duplicate-purchase detection MUST be applied before any checkout is initiated.
- The system MUST refuse to initiate payment if authoritative confirmation of a prior
  identical transaction is pending or unavailable.

### IV. Verified Integrations

No marketplace, payment provider, UPI service, or order-tracking API capability MAY
be assumed to be available — it MUST be individually verified before use.

- Integration capabilities (search, add-to-cart, checkout, payment, tracking) MUST be
  catalogued in a **version-controlled structured file** (the capability registry)
  maintained alongside the codebase. Each entry MUST record at minimum:
  - The provider name and capability identifier.
  - Verification status: one of `verified`, `unverified`, `unavailable`, or
    `pending-verification`. Assumptions MUST NOT be recorded as `verified`.
  - The evidence or source that justified the `verified` status (e.g., official API
    documentation reference, sandbox test result).
  - The verification date.
  - Any material limitations, rate limits, or ToS constraints on the capability.
- The file format and path within the repository MUST be confirmed during planning;
  a runtime database representation MAY be introduced later if justified by
  operational requirements, but the version-controlled file remains the source of
  truth for governance purposes.
- Where direct integration is unavailable, the agent MUST provide a graceful fallback
  (e.g., deep-link to the marketplace, display a manual-purchase guide) rather than
  failing silently or fabricating a result.
- Integration terms of service MUST be reviewed and respected; automating actions
  prohibited by a provider's ToS is not permitted.
- Prototype integrations MUST be clearly labelled and MUST NOT be exposed in
  production flows without a production-readiness review.

### V. Transactional Correctness

The system MUST maintain explicit, auditable transaction states and MUST NOT claim
success for any payment or order placement without authoritative confirmation from the
provider.

- Every transaction MUST transition through a defined state machine
  (e.g., PENDING → SUBMITTED → CONFIRMED | FAILED | TIMED_OUT).
- Idempotency keys MUST be used wherever the integration supports them to prevent
  duplicate charges.
- Uncertain outcomes (network timeout, provider non-response) MUST surface as
  UNCERTAIN states requiring reconciliation — never as successes.
- Reconciliation procedures MUST be defined and tested for each integration adapter.

### VI. Data Quality and Transparent Comparisons

Product comparisons MUST be based on normalised, current data and MUST consider all
cost and quality factors relevant to the user's decision.

- Total cost (base price + shipping + taxes + fees) MUST be used for comparisons, not
  listed price alone.
- Comparisons MUST incorporate relevant dimensions appropriate to the product
  category, which MAY include: specifications, seller credibility, ratings and review
  count, warranty terms, return and refund policy, stock availability, and estimated
  delivery date.
- Data freshness MUST be communicated; stale data (beyond a configurable threshold)
  MUST be flagged or refreshed before a recommendation is finalised.
- Product data normalisation logic MUST be deterministic and independently testable.

### VII. Modular Architecture

Acquira MUST be built behind clear, stable interfaces that allow individual providers
and subsystems to be replaced, upgraded, or disabled without cascading changes.

- The following subsystems MUST each have a defined interface boundary:
  marketplace discovery, product normalisation, ranking and recommendation,
  purchase policy enforcement, checkout orchestration, payment processing, and
  order tracking.
- Cross-subsystem communication MUST go through these interfaces, not through direct
  internal coupling.
- The technology stack MUST NOT be mandated by this constitution; stack selection is
  deferred to the planning phase after requirements and integration feasibility are
  assessed.

### VIII. Testability and Reliability

Automated tests are a non-negotiable quality gate for all critical business logic.

- The following MUST have automated test coverage before a feature is considered
  complete:
  - Purchase policy enforcement (all grant/deny paths, including the disabled-by-
    default autonomous mode).
  - Transaction state machine transitions.
  - Failure and timeout paths for every integration adapter.
  - Price-change threshold detection logic (both percentage and absolute-rupee paths)
    and duplicate-purchase detection logic.
  - Product normalisation and ranking determinism.
- Sandbox or mocked integrations MUST be used where live API access is unavailable
  or would incur real cost.
- Integration adapters MUST be testable in isolation via their interface contracts.
- End-to-end tests SHOULD cover at least one approval-based and one
  bounded-autonomous purchase flow using mocked providers.

### IX. Maintainability and Code Quality

The codebase MUST remain legible, well-documented, and maintainable as the team and
feature set grow.

- Code MUST use typed interfaces or equivalent type-safety mechanisms where supported
  by the chosen stack.
- Public interfaces, modules, and non-obvious logic MUST be documented at the point
  of definition.
- Configuration (API endpoints, feature flags, spending thresholds, price-change
  thresholds, timeouts) MUST be externalised and MUST NOT be hard-coded.
- Dependencies MUST be pinned and reviewed for licence compatibility and security
  advisories before adoption.
- All changes to critical paths (purchasing, payment, policy enforcement) REQUIRE peer
  code review before merge.

### X. Human Oversight and Responsible Autonomy

The agent's permission boundaries and autonomy level MUST be visible to, and
controllable by, the user at all times.

- The user MUST be able to inspect the agent's current operating mode (approval-based
  or bounded-autonomous), configured policies, and spending limits at any time.
- Any action the agent cannot confidently classify as within its authorised scope MUST
  be escalated to the user rather than improvised.
- High-risk actions (purchases above a threshold, first-time use of a new provider,
  actions involving sensitive personal data changes) MUST require explicit user
  confirmation regardless of operating mode.
- The agent MUST NOT acquire permissions, escalate its own authority, or modify its
  own policy configuration autonomously.

### XI. Observability and Auditability

Every consequential agent decision MUST be logged in a structured, queryable, and
privacy-conscious audit trail.

- The audit log MUST capture: user intent (sanitised), search queries issued,
  candidates considered, ranking rationale, policy decisions, approval outcomes, and
  transaction state transitions.
- Personal data in logs MUST be minimised; identifiers MUST be used instead of raw
  personal details wherever feasible.
- **Audit-log retention policy**: the retention duration, access controls, deletion or
  anonymisation schedule, and any applicable legal-hold rules MUST be defined during
  the specification phase after assessing applicable legal and regulatory requirements
  (including but not limited to the IT Act, the DPDP Act, and consumer-protection
  rules), privacy and data-minimisation principles, security needs, and operational
  requirements. No specific duration is mandated by this constitution. The resulting
  policy MUST NOT claim a particular duration is legally required without verified
  evidence.
- Log ingestion and query pipelines MUST be part of the system design from the first
  production-bound iteration — not retrofitted.

### XII. Accessibility and Usability

The Acquira user interface MUST be understandable, responsive, and accessible to
users with diverse needs and devices.

- Conversational interfaces MUST provide clear, plain-language responses without
  requiring technical knowledge of the agent's internals.
- Product comparison views, approval prompts, and order-tracking summaries MUST be
  legible on both desktop and mobile viewports.
- The UI MUST conform to WCAG 2.1 AA accessibility standards as a minimum bar for
  production release.
- Error messages and fallback states MUST explain what happened and what the user can
  do next — never expose raw error codes or stack traces.

## Scope and Autonomy Boundaries

This section defines explicit constraints on what Acquira MUST and MUST NOT do,
distinguishing prototype capabilities from production-readiness requirements.

**What Acquira is authorised to do:**
- Discover and retrieve product listings from verified, integrated marketplaces.
- Normalise, compare, and rank products on behalf of the user.
- Present recommendations with explanations and solicit user decisions.
- Initiate checkout and payment flows on behalf of the user, subject to Principle III.
- Track orders via integrated provider APIs where available.

**Hard limits (apply at all phases):**
- Acquira MUST NOT initiate any payment or checkout action without satisfying the
  authorisation conditions in Principle III.
- Acquira MUST NOT infer purchase permission from conversational intent alone.
- Acquira MUST NOT access, modify, or transmit user credentials outside of
  purpose-bound, user-consented integration flows.
- Acquira MUST NOT claim to support a marketplace or payment capability that has not
  been individually verified and recorded as `verified` in the capability registry
  (Principle IV).
- **CBDC and digital-currency payments** are outside the initial mandatory scope.
  They MUST NOT be implied as currently available. Future inclusion requires
  individual verification of the integration's availability, authorisation,
  security properties, and applicable legal and provider requirements, followed by
  the normal specification, risk-assessment, and approval process defined in the
  Governance section.

**Prototype vs. production distinction:**
- Prototype features MAY operate with mocked integrations, limited error handling, and
  manual configuration — but MUST be clearly labelled and MUST NOT be reachable in
  production user flows.
- A production-readiness checklist (covering security review, integration
  verification, performance testing, and accessibility audit) MUST be completed before
  any feature graduates from prototype to production.

**Proposed ratification status:**
- This constitution was drafted on 2026-11-01 and is proposed for adoption as of that
  date, pending team review and approval.
  TODO(RATIFICATION_DATE): Update to the confirmed date once team approval is
  obtained. Do not state that team ratification has occurred until it is confirmed.

## Development Standards

The following standards govern how work is planned, executed, and reviewed on Acquira.

**Planning:**
- Features MUST begin with a specification (via `/speckit-specify`) before planning
  or implementation work starts.
- Technology stack selection MUST be documented in the plan phase and ratified before
  implementation begins.
- Integration capabilities MUST be assessed for feasibility and ToS compliance before
  a feature plan is approved.

**Implementation:**
- All work MUST be traceable to a feature specification and task entry.
- Critical-path changes (purchasing, payment, policy enforcement, data handling) MUST
  NOT be merged without a passing automated test suite and peer review.
- Environment-specific configuration MUST use the project's designated
  configuration-management approach (to be defined in the plan phase).

**Quality gates:**
- Unit and integration tests MUST pass in CI before merge.
- Secrets scanning MUST be enabled on the repository.
- Dependency vulnerability scanning SHOULD be run on every dependency update.
- Prototype features MUST be gated behind feature flags in shared environments.

**Versioning and change management:**
- Breaking changes to public integration interfaces MUST be versioned and announced
  with a migration path.
- Database schema changes MUST be managed via reversible migrations.

## Governance

This constitution is the authoritative governance document for Acquira development.
It supersedes any conflicting conventions in READMEs, wikis, or oral agreements.

**Authority and compliance:**
- All contributors MUST read and acknowledge this constitution before contributing to
  the codebase.
- All pull/merge requests MUST include a statement confirming that the change does not
  violate any principle herein, or explicitly documents a requested amendment.
- Automated linting and security checks serve as partial compliance verification but
  do not substitute for human judgement on principle adherence.

**Amendment procedure:**
1. Propose the amendment in writing, citing the principle(s) affected, the motivation,
   and the compliance impact.
2. Assess the impact on dependent specifications and implementation artefacts: identify
   any feature specs, plans, or task lists that reference the affected principle(s)
   and note which artefacts will require corresponding updates.
3. Allow a minimum review period of 48 hours for team feedback.
4. Obtain approval from at least one project maintainer (or the project owner during
   the solo/prototype phase).
5. Update this file following the versioning policy below, record the change in the
   Sync Impact Report header, and commit with the suggested message format.
6. Apply corresponding updates to any dependent specifications or artefacts identified
   in step 2, or create tracked issues if those updates cannot be completed immediately.
7. Communicate the ratified amendment and any dependent-artefact impacts to all active
   contributors.

**Versioning policy:**
- MAJOR bump: a principle is removed, fundamentally redefined, or the scope of the
  agent's autonomy is materially changed.
- MINOR bump: a new principle or section is added, or existing guidance is materially
  expanded.
- PATCH bump: clarifications, wording improvements, typo fixes, or non-semantic
  refinements.

**Violation handling:**
- Identified violations MUST be raised as issues in the project tracker within 24
  hours of discovery.
- Violations in critical paths (purchasing, payment, security) MUST block the
  associated feature or release until resolved.
- Violations in non-critical paths SHOULD be resolved within the current sprint cycle.
- Repeated or wilful violations MUST be escalated to the project owner.

**Constitution review cadence:**
- This constitution MUST be reviewed at the start of each major project phase
  (post-prototype, pre-beta, pre-production launch) and at least once every six
  months thereafter.
- The review MUST assess whether principles remain adequate, whether any TODOs have
  been resolved, and whether new risks require new principles.

**Version**: 1.0.1 | **Ratified**: 2026-11-01 (proposed) | **Last Amended**: 2026-11-01
