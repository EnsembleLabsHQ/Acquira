# Feature Specification: Acquira — AI Shopping Agent

**Feature Directory**: `specs/001-ai-shopping-agent`

**Created**: 2026-11-01

**Status**: Draft

---

## Clarifications

### Session 2026-11-01

- Q: When the final checkout amount is higher than the applicable authorized baseline but below both configured price-change thresholds, should checkout still be blocked? → A: Yes — any upward deviation above the applicable authorized baseline (the confirmed purchase summary total in approval-based mode, or the pre-checkout evaluated order total in bounded-autonomous mode) requires user approval regardless of thresholds. The two configurable thresholds govern the price-decrease direction only: if a price decrease exceeds either threshold relative to the baseline, approval is required; decreases below both thresholds proceed without interruption.
- Q: Who may access audit-log records? → A: Users may view their own purchase and approval history. All other access (internal support, regulatory) must be explicitly authorized, scoped to least-privilege, and itself auditable; no blanket internal access is permitted by default. Detailed access-control rules, entitlements, and legal-hold procedures are deferred to legal and security review.
- Q: If the seller, product variant, or quantity changes between purchase confirmation and checkout (independent of price), should checkout be blocked? → A: Yes — any change to seller, product variant, or quantity is a mandatory re-approval trigger, independently of price-change thresholds.
- Q: When a user writes in Roman-script Hinglish, should Acquira respond in Hinglish? → A: Conversational responses should generally match the user's input language style; natural Hinglish is used for Roman-script Hinglish input where reliable. Product names, specifications, prices, and units are always presented in English or standard numerals for accuracy. English is the fallback when language matching is uncertain. Full Hindi-script input is out of MVP scope.
- Q: Must specific numerical threshold values be defined in this specification? → A: No. Both thresholds are mandatory user-configured fields with no system-assumed defaults. The spec records that both are required before bounded-autonomous mode can be activated, and that configured values are validated and enforced deterministically. No numbers belong in the specification.
- Q: Are cumulative period spending limits mandatory for bounded-autonomous mode? → A: Option B — A per-order spending limit is mandatory before bounded-autonomous mode can be activated. A cumulative period spending limit (e.g., daily or monthly budget) is an optional additional guardrail. If configured, Acquira enforces it deterministically during bounded-autonomous purchasing. Not configuring a cumulative period limit does not prevent mode activation. No default cumulative limits exist.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Natural-Language Product Request and Clarification (Priority: P1)

A user opens Acquira and types a shopping request in natural language
(e.g., "I need a laptop under ₹60,000 for college, good battery life, at least 16 GB RAM").
Acquira identifies any missing or ambiguous requirements, asks targeted clarification
questions when necessary, and confirms understanding before proceeding to search.

**Why this priority**: This is the entry point to every user journey. If Acquira cannot
reliably interpret requests and resolve ambiguity, no downstream capability has value.

**Independent Test**: Can be fully tested by submitting a natural-language request and
verifying that the system either extracts a complete set of requirements or asks a
targeted, relevant clarifying question — without proceeding to search until requirements
are sufficiently resolved.

**Acceptance Scenarios**:

1. **Given** a user submits a clear request with all required attributes, **When** Acquira
   processes it, **Then** it extracts and confirms the requirements without asking
   unnecessary questions.
2. **Given** a user submits an ambiguous request (e.g., missing budget or key
   specification), **When** Acquira processes it, **Then** it asks exactly the missing
   question(s) in plain language, not a generic "tell me more".
3. **Given** a user provides contradictory requirements (e.g., "best OLED TV under ₹10,000"),
   **When** Acquira processes it, **Then** it surfaces the conflict and asks the user how
   to resolve it rather than silently ignoring one constraint.
4. **Given** a user provides a request in Roman-script Hinglish, **When** Acquira
   processes it, **Then** it correctly interprets the intent, extracts the requirements,
   and responds conversationally in natural Hinglish where practical. Product names,
   prices, specifications, and units in the response are always in English or standard
   numerals, regardless of input language.

---

### User Story 2 — Marketplace Discovery, Comparison, and Explainable Recommendation (Priority: P1)

After requirements are confirmed, Acquira discovers candidate products from sources with
verified search capabilities, normalises offer data (including total payable cost),
compares candidates on relevant dimensions, and presents a recommendation with a
transparent explanation of the factors, trade-offs, assumptions, and data-freshness
limitations that shaped it.

**Why this priority**: This is Acquira's core differentiating value. Accurate, comparable,
and explainable recommendations are the reason a user chooses Acquira over a manual search.

**Independent Test**: Can be fully tested by providing a resolved requirement set, triggering
discovery, and verifying that the output includes at least two comparable options, a
total-cost breakdown, a freshness indicator, and a plain-language explanation of the
recommendation rationale — even when no purchase integration exists.

**Acceptance Scenarios**:

1. **Given** resolved requirements and at least one source with a verified search capability,
   **When** Acquira discovers products, **Then** it returns candidates with normalised data
   including product name, seller, base price, shipping cost, taxes/fees where available,
   and total payable amount.
2. **Given** multiple candidates, **When** Acquira compares them, **Then** it uses total
   payable cost (not listed price alone) as the primary price dimension and surfaces other
   relevant dimensions (specifications, seller rating, return policy, estimated delivery,
   warranty) as available.
3. **Given** a recommendation is produced, **When** it is presented to the user, **Then**
   it includes: the recommended option, the key reasons it was recommended, trade-offs
   versus alternatives, any data that was unavailable or estimated, and the freshness
   date of the underlying product data.
4. **Given** product data was retrieved more than a configurable staleness threshold ago,
   **When** Acquira presents the recommendation, **Then** it flags the data as potentially
   stale and, where permitted, offers to refresh before committing to a purchase.
5. **Given** no source with a verified search capability for the requested category exists,
   **When** Acquira processes the request, **Then** it tells the user which sources were
   checked, why they could not be used, and what the user can do instead (e.g., manual
   search link).

---

### User Story 3 — Approval-Based Purchase Flow (Priority: P1)

After selecting a recommended product, the user follows the approval-based purchase flow.
Acquira presents a complete purchase summary for review (product, seller, total cost,
payment method), waits for explicit user confirmation, and only then initiates checkout
and payment via a verified integration or provides a safe handoff to the marketplace.

**Why this priority**: Financial integrity requires that no purchase is initiated without
explicit authorisation. This is the default mode and a non-negotiable safety control per
the constitution.

**Independent Test**: Can be fully tested against a mocked checkout integration by
verifying that no checkout action is initiated without an explicit confirmation step, that
the summary presented matches the final charged amount, and that any price change detected
between summary and checkout pauses the flow for re-approval.

**Acceptance Scenarios**:

1. **Given** a user selects a product and enters the approval-based purchase flow, **When**
   Acquira presents the purchase summary, **Then** it shows: product name, seller, quantity,
   itemised cost (base + shipping + taxes + fees), total payable amount, selected payment
   method, and estimated delivery window.
2. **Given** the purchase summary is presented, **When** the user explicitly confirms,
   **Then** Acquira initiates checkout. If the user declines or does not respond, no
   checkout action occurs.
3. **Given** the user confirms and checkout is initiated, **When** the final payable amount
   at checkout **exceeds** the total shown in the confirmed purchase summary by any amount
   (regardless of whether either price-change threshold is exceeded), **Then** checkout is
   paused, the user is shown the new amount, the difference, and explicit re-approval is
   required. **Given** the final payable amount is **lower** than the confirmed summary
   total and the decrease exceeds either configured price-change threshold, **Then**
   checkout is also paused for re-approval. A price decrease below both thresholds
   proceeds without re-approval.
4. **Given** the user confirms and checkout is initiated, **When** a duplicate-purchase
   condition is detected (identical product, seller, and quantity with a recent pending or
   confirmed transaction), **Then** checkout is blocked and the user is warned.
5. **Given** a verified checkout integration exists and the user confirms, **When** checkout
   completes, **Then** Acquira reports the outcome only after receiving authoritative
   confirmation from the provider (order ID, confirmation number, or equivalent). It does
   not report success based on the absence of an error.
6. **Given** no verified checkout integration exists for the selected marketplace, **When**
   the user confirms intent to purchase, **Then** Acquira provides a deep-link or
   clear manual-purchase instructions for that marketplace rather than failing silently.
7. **Given** the user confirms and checkout is initiated, **When** the seller, product
   variant, or quantity at checkout differs from the confirmed purchase summary (regardless
   of price impact), **Then** checkout is paused, the specific change is disclosed to the
   user in plain language, and explicit re-approval is required before proceeding.

---

### User Story 4 — Bounded-Autonomous Purchase Flow (Priority: P2)

A user who has explicitly enabled bounded-autonomous mode and fully configured their spending
limits and purchasing policies can ask Acquira to complete a purchase meeting all configured
criteria without requiring per-order approval. Acquira executes the purchase only when every
policy check passes and an authoritative outcome is received.

**Why this priority**: This is a high-value differentiating capability but it is gated behind
explicit user configuration and carries higher risk. Approval-based mode must be complete and
proven first.

**Independent Test**: Can be tested against a mocked integration by verifying that:
(a) autonomous mode is inactive until all five mandatory conditions are met (including mandatory per-order spending limit, with or without an optional cumulative period limit); (b) a policy-compliant order
executes without prompting; (c) a policy-violating order (exceeding the per-order limit or a configured cumulative period limit) is blocked and the user is notified;
(d) any price increase above the pre-checkout evaluated order total always pauses execution for user approval;
(e) a price decrease exceeding either configured threshold relative to the evaluated order total also pauses for user approval;
(f) a price decrease below both thresholds proceeds without prompting;
(g) any change to seller, product variant, or quantity between evaluation and checkout always pauses
execution for re-approval.

**Acceptance Scenarios**:

1. **Given** a user has not yet enabled bounded-autonomous mode, **When** any purchase
   action is requested, **Then** the system operates in approval-based mode regardless of
   the user's conversational phrasing.
2. **Given** bounded-autonomous mode is enabled but no per-order spending limit has been configured,
   **When** a purchase is triggered, **Then** the system refuses to proceed autonomously
   and prompts the user to configure a per-order spending limit.
3. **Given** all five mandatory conditions for bounded-autonomous mode are satisfied (regardless of
   whether an optional cumulative period spending limit is configured) and the candidate
   order complies with all configured limits and policies, **When** Acquira initiates
   purchase, **Then** it executes without per-order approval and sends the user a
   post-purchase notification with the outcome.
4. **Given** the candidate order would exceed the configured per-order spending limit,
   **When** policy enforcement evaluates it, **Then** the purchase is blocked and the user
   is notified with the reason and the actual amount versus the configured limit.
5. **Given** the final payable amount at checkout exceeds the evaluated order total by any
   amount, or a price decrease exceeds either configured threshold between policy evaluation
   and checkout, **When** Acquira detects it, **Then** it pauses, notifies the user with the
   price difference, and requires explicit approval before continuing.
6. **Given** an uncertain transaction outcome (timeout, no confirmation received), **When**
   it occurs, **Then** the transaction is recorded as UNCERTAIN, autonomous retry is
   prohibited, and the user is notified to check their order status.
7. **Given** the seller, product variant, or quantity at checkout differs from the evaluated
   order (regardless of price impact), **When** Acquira detects it, **Then** checkout is paused,
   the user is shown the specific change in plain language, and explicit approval is required
   before proceeding.
8. **Given** a user has configured an optional cumulative period spending limit (e.g., daily or monthly
   budget) and the candidate order would cause cumulative spending in that period to exceed the limit,
   **When** policy enforcement evaluates it, **Then** autonomous checkout is blocked, not initiated,
   and the user is notified with the reason, current cumulative spend, and the configured limit.

---

### User Story 5 — Transaction Status and Order Tracking (Priority: P2)

For purchases completed through a verified integration, Acquira allows the user to check
order status and tracking information from within the conversation. For purchases completed
via provider handoff, it provides a link to the provider's tracking page.

**Why this priority**: Post-purchase transparency builds trust. However, it depends on
verified tracking integrations, which are not guaranteed to exist.

**Independent Test**: Can be tested with a mocked tracking integration by verifying that
status requests return current data with a freshness timestamp, and that unavailable
integrations produce a provider-link fallback rather than an error or fabricated status.

**Acceptance Scenarios**:

1. **Given** a purchase was completed via a verified integration and a tracking capability
   is confirmed for that provider, **When** the user requests order status, **Then** Acquira
   retrieves and displays the current status with a data-freshness timestamp.
2. **Given** a purchase was completed via provider handoff (no integration), **When** the
   user requests order status, **Then** Acquira provides the provider's order-tracking URL
   and the reference number supplied during handoff.
3. **Given** a tracking API call fails or times out, **When** the user requests order status,
   **Then** Acquira indicates that status is currently unavailable (not fabricated),
   displays the last known status with its timestamp, and provides the provider tracking URL
   as a fallback.

---

### User Story 6 — User Preferences and Purchasing Policy Configuration (Priority: P2)

A user can configure persistent preferences (preferred sellers, avoided brands, preferred
payment methods) and, if they choose, activate bounded-autonomous mode by setting spending
limits and purchasing policies. The user can view, modify, and deactivate any configuration
at any time.

**Why this priority**: Personalisation improves recommendation relevance. Autonomous-mode
configuration is a prerequisite for User Story 4 and must be handled safely.

**Independent Test**: Can be tested by configuring preferences, triggering a product search,
and verifying that the configured preferences influence the recommendation. Autonomous-mode
configuration can be tested by verifying the five-condition gate independently.

**Acceptance Scenarios**:

1. **Given** a user sets a preferred payment method, **When** Acquira presents the purchase
   summary, **Then** the preferred method is pre-selected (if supported by the provider).
2. **Given** a user configures bounded-autonomous mode, **When** they view their settings,
   **Then** the mandatory per-order spending limit, optional cumulative period spending limit,
   and both price-change thresholds (percentage and absolute rupee) are displayed accurately
   without system defaults; the per-order limit and both price-change thresholds must be
   explicitly set before activation, while the cumulative period limit remains optional.
3. **Given** a user deactivates bounded-autonomous mode, **When** the next purchase is
   triggered, **Then** the system immediately reverts to approval-based mode for all
   subsequent actions.
4. **Given** a user requests deletion of their account data, **When** the request is
   processed, **Then** all personal data including preferences, policies, order history,
   and audit identifiers are deleted or anonymised within a defined period, and the user
   receives confirmation.

---

### User Story 7 — Audit History and Transparency (Priority: P3)

A user can view a log of Acquira's consequential actions on their behalf: searches
performed, recommendations made, policy decisions, approvals given, purchases attempted,
and outcomes received. The log is presented in plain language, not raw technical data.

**Why this priority**: Auditability builds user trust and is required by the constitution.
It is lower priority than the transactional flows it depends on.

**Independent Test**: Can be tested by performing a complete search-to-purchase flow and
verifying that every major decision (search, recommendation, approval, outcome) appears
in the audit log in a format the user can understand.

**Acceptance Scenarios**:

1. **Given** a completed purchase flow, **When** the user opens their audit history,
   **Then** each event (search, recommendation, user approval, checkout initiation,
   outcome) is listed with a timestamp and a plain-language description.
2. **Given** a policy decision (e.g., purchase blocked due to limit exceeded), **When**
   the user views the audit history, **Then** the block event is recorded with the reason
   and the policy that triggered it.
3. **Given** a user's audit history, **When** Acquira renders it, **Then** no raw personal
   data (full address, payment card number, UPI VPA) is displayed; masked or reference
   identifiers are used instead.
4. **Given** any request for audit-log access by internal personnel or external authorities,
   **When** evaluated by the system, **Then** blanket access is denied by default; access is
   granted only when explicitly authorized for the specific request, strictly scoped to the
   minimum necessary records, and the access event itself is recorded in the audit log.

---

### Edge Cases

- What happens when all configured sources return zero results for the user's requirements?
  → Acquira informs the user which sources were tried, notes the capability status for each,
  and suggests modifying the requirements or checking additional sources manually.
- What happens when a source returns results but all data fields critical for comparison
  (price, specifications) are missing for multiple candidates?
  → Acquira proceeds with available data, explicitly labels missing fields as "unavailable",
  and does not exclude candidates solely due to missing non-critical fields.
- What happens when the user submits a purchase intent mid-conversation without a preceding
  discovery flow?
  → Acquira does not initiate checkout. It asks the user to describe what they want to
  purchase and starts the full discovery-and-approval flow from the beginning.
- What happens when a checkout API call returns neither a success nor a failure response
  (timeout or ambiguous response)?
  → The transaction is marked UNCERTAIN. No success is reported. Autonomous retry is blocked.
  The user is notified and advised to check their account or contact the provider.
- What happens when the same order appears to be submitted twice (duplicate detection
  triggers)?
  → The second submission is blocked before checkout. The user is shown the existing
  pending/confirmed transaction and asked to confirm whether they intend a separate purchase.
- What happens when a configured spending limit (mandatory per-order limit or optional cumulative period budget) is reached or exceeded?
  → Policy enforcement blocks autonomous checkout and notifies the user with the specific limit exceeded and spend details. The user may either proceed via manual approval or adjust the limit in settings.
- What happens when a marketplace previously listed as "pending-verification" is selected
  for purchase?
  → Acquira declines to use an unverified integration for any transactional action and
  informs the user of the capability status. A fallback link is provided.
- What happens when the seller, product variant, or quantity changes between the confirmed
  purchase summary and the moment of checkout?
  → Checkout is paused regardless of price impact. The user is shown the exact change(s)
  in plain language and must explicitly re-approve before checkout proceeds. This applies
  in both approval-based and bounded-autonomous modes.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Natural-Language Input and Clarification

- **FR-001**: The system MUST accept product requests expressed in natural language and extract structured requirements (product category, budget, specifications, preferences) from them.
- **FR-002**: When a requirement is missing and no safe default exists, the system MUST ask a targeted clarifying question specific to the missing attribute, not a generic open-ended prompt.
- **FR-003**: The system MUST detect contradictory requirements (e.g., a specification set that cannot simultaneously be satisfied within the stated budget) and surface the conflict to the user rather than silently prioritising one constraint.
- **FR-004**: The system MUST accept product requests submitted in English and Roman-script Hinglish (mixed Hindi-English). For Roman-script Hinglish input, conversational responses SHOULD use natural Hinglish phrasing where reliable; English MUST be used as the fallback when language matching is uncertain or would reduce clarity. Product names, specifications, prices, and units MUST always be presented in English or standard numerals regardless of the user's input language. Full Hindi-script input is explicitly out of scope for the MVP.
- **FR-005**: The system MUST NOT proceed from the clarification phase to product discovery until all requirements considered necessary for a meaningful search are either provided by the user or confirmed by the user as intentionally left open.

#### Marketplace Discovery

- **FR-006**: The system MUST only query sources whose search capability is recorded as `verified` in the capability registry. Sources recorded as `unverified`, `unavailable`, or `pending-verification` MUST NOT be queried for transactional purposes.
- **FR-007**: The capability registry MUST be maintained as a version-controlled structured file in the repository. Each entry MUST record: provider name, capability identifier, verification status, evidence or source, verification date, and material limitations.
- **FR-008**: When no verified source can service the requested product category, the system MUST inform the user which sources were evaluated, their capability status, and provide at minimum one alternative action (e.g., a direct search link for a major Indian marketplace).
- **FR-009**: The system MUST apply a configurable staleness threshold to all retrieved product data. Data retrieved beyond this threshold MUST be flagged as potentially stale. Exact threshold values are to be defined during planning based on product category norms.

#### Product Normalisation and Comparison

- **FR-010**: The system MUST normalise retrieved product data into a common schema before comparison. Normalisation MUST be deterministic: identical raw input MUST always produce identical normalised output.
- **FR-011**: The system MUST calculate and use total payable cost (base price + shipping + applicable taxes + platform fees) as the primary price dimension for all comparisons. Listed price alone MUST NOT be used as the comparison basis.
- **FR-012**: Where a cost component (e.g., shipping, tax) is unavailable, the system MUST label it as "unavailable" in the comparison rather than assuming zero or estimating a value without disclosure.
- **FR-013**: Product comparisons MUST include dimensions relevant to the category; at minimum these MUST include: total payable cost, key specifications matched to the user's requirements, seller rating or credibility indicator (if available), and estimated delivery window (if available).
- **FR-014**: Data normalisation logic MUST be independently testable in isolation from the discovery and recommendation subsystems.

#### Recommendations and Explainability

- **FR-015**: Every recommendation MUST include: the recommended product, the primary reasons for the recommendation, notable trade-offs versus the next-best alternatives, any data fields that were unavailable or estimated, and the freshness date of the underlying product data.
- **FR-016**: The system MUST NOT present a recommendation as definitive when key comparison data is unavailable for a material subset of candidates. In such cases, it MUST disclose which data is missing and what impact this has on the confidence of the recommendation.
- **FR-017**: The ranking logic MUST be deterministic: given the same normalised input and user preferences, the system MUST always produce the same ranked output.

#### Purchase Authorisation and Safety

- **FR-018**: The default purchase mode MUST be approval-based. No purchase may be initiated in any other mode unless the user has explicitly activated bounded-autonomous mode and all required configuration is complete.
- **FR-019**: In approval-based mode, the system MUST present a purchase summary before initiating any checkout or payment action. The summary MUST include: product name, seller, quantity, itemised cost breakdown, total payable amount, payment method, and estimated delivery window.
- **FR-020**: In approval-based mode, checkout MUST NOT be initiated unless the user has provided explicit confirmation in response to the presented summary. Conversational intent (e.g., "yes", "sure", "go ahead" in isolation, without a preceding summary confirmation prompt) MUST NOT be treated as purchase authorisation.
- **FR-021**: Bounded-autonomous mode MUST remain disabled until ALL of the following mandatory conditions have been explicitly configured by the user: (1) autonomous mode enabled in account settings, (2) a per-order spending limit set, (3) a purchasing policy (approved categories, marketplaces, seller constraints) configured, (4) a percentage-based price-change threshold configured, (5) an absolute-rupee price-change threshold configured. A cumulative period spending limit (e.g., daily or monthly budget) is an OPTIONAL additional guardrail; omitting a cumulative limit MUST NOT prevent activation of bounded-autonomous mode if all five mandatory conditions are satisfied. Whenever a cumulative period spending limit is configured, the system MUST enforce it deterministically during bounded-autonomous purchasing. Exceeding either the per-order limit or a configured cumulative period limit MUST block autonomous checkout and require user approval. The system MUST enforce all conditions and limits in deterministic application logic, not in LLM instructions. No default values are assumed for any spending limit or threshold.
- **FR-022**: The comparison baseline for all price-change checks is the applicable authorized baseline: (a) in **approval-based mode**, the total payable amount shown in the user's final purchase confirmation summary (the amount the user explicitly reviewed and approved); (b) in **bounded-autonomous mode**, the total payable amount established when the candidate order is evaluated and authorized against configured limits and policies immediately prior to checkout initiation. The system MUST enforce two independently configurable thresholds — one expressed as a percentage and one expressed as an absolute amount in Indian Rupees — that govern the price-**decrease** direction: if the final payable amount at checkout is lower than the applicable baseline and the decrease exceeds **either** configured threshold, the transaction MUST pause and seek explicit user approval; a price decrease below both thresholds proceeds without interruption. For price **increases**: the final payable amount at checkout MUST NOT exceed the applicable authorized baseline by any amount — if any upward difference exists, the transaction MUST pause and seek explicit user approval regardless of whether either threshold would have been exceeded. Both thresholds are mandatory user-configured fields; no system-assumed numerical defaults exist. Configured threshold values MUST be validated on save and enforced deterministically at checkout. The exact rounding rules and treatment of missing or stale price data at checkout MUST be defined during the planning phase.
- **FR-023**: Before initiating any checkout action, the system MUST check for a duplicate-purchase condition: an identical pending or recently confirmed transaction for the same product, seller, and quantity within a configurable deduplication window. If detected, checkout MUST be blocked and the user notified.
- **FR-024**: If the authorisation state or the final payable amount is uncertain for any reason at the time of checkout initiation, the system MUST NOT proceed autonomously. It MUST escalate to the user.
- **FR-025**: Autonomous purchasing MUST NOT be inferred from natural-language conversational cues. Only explicit account-level configuration constitutes authorisation.

#### Checkout, Payment, and Provider Handoff

- **FR-026**: The system MUST only initiate checkout or payment via a provider whose checkout and payment capabilities are both recorded as `verified` in the capability registry.
- **FR-027**: Where a verified checkout integration exists, the system MUST use idempotency keys or equivalent mechanisms where the provider supports them to prevent duplicate charges.
- **FR-028**: Where no verified checkout integration exists, the system MUST provide a safe provider handoff: a direct deep-link to the product page on the marketplace, the total payable amount last observed, and any reference information needed to identify the item.
- **FR-029**: The system MUST NOT claim that a payment or order placement succeeded without having received an authoritative confirmation from the provider (e.g., an order ID or confirmation reference). Absence of an error MUST NOT be treated as confirmation of success.
- **FR-030**: The system MUST handle provider timeouts and non-responses by marking the transaction as UNCERTAIN. An UNCERTAIN transaction MUST NOT be automatically retried for a consequential action (checkout, payment). The user MUST be notified and must take explicit action to resolve the uncertainty.

#### Transaction State and Order Tracking

- **FR-031**: Every transaction MUST be recorded with an explicit state. Valid states are: PENDING, SUBMITTED, CONFIRMED, FAILED, TIMED_OUT, and UNCERTAIN. State transitions MUST be logged.
- **FR-032**: Where a provider's order-tracking capability is recorded as `verified`, the system MUST retrieve and present current order status on user request, including a data-freshness timestamp.
- **FR-033**: Where no verified tracking integration exists, the system MUST provide the provider's order-tracking URL and the order or reference number obtained during checkout or handoff.
- **FR-034**: If a tracking API call fails or times out, the system MUST display the last known status with its timestamp and provide the fallback tracking URL. It MUST NOT display a fabricated or estimated status.

#### User Preferences and Policy Configuration

- **FR-035**: The system MUST allow users to configure persistent preferences including: preferred payment methods, preferred or avoided sellers or brands, and preferred product-quality tiers.
- **FR-036**: The system MUST allow users to view, modify, and delete any configured preference or policy at any time.
- **FR-037**: The system MUST allow users to view their current operating mode (approval-based or bounded-autonomous), all active spending limits, configured price-change thresholds, and all active purchasing policies from a single accessible location.
- **FR-038**: Deactivating bounded-autonomous mode MUST take effect immediately. The next purchase action after deactivation MUST operate in approval-based mode, regardless of any in-flight configuration changes.

#### Privacy, Security, and Data Management

- **FR-039**: Credentials (API keys, payment tokens, UPI handles) MUST NOT appear in prompts sent to the language model, application logs, generated reports, or any user-facing output.
- **FR-040**: Personal data (name, address, payment credentials, order history) MUST be transmitted over encrypted channels only.
- **FR-041**: The system MUST provide a verifiable account-data deletion or anonymisation flow. On confirmed deletion request, all personal data MUST be deleted or irreversibly anonymised within a period to be defined in the data-retention policy (see Open Questions — OQ-002).
- **FR-042**: The audit log MUST capture every consequential agent action. Log entries MUST use anonymised or pseudonymous identifiers for personal data; raw personal data MUST NOT be written to the audit log. Users MUST be able to view their own audit records, including their purchase history, approval decisions, and policy enforcement events. Any access to audit records by parties other than the account holder (e.g., internal operators, regulatory authorities) MUST be explicitly authorized for each use case, scoped to the minimum necessary records, and itself logged as an auditable access event; no blanket internal access to user audit records is permitted by default. Detailed access-control rules, entitlement workflow, retention policy, deletion schedule, and legal-hold procedures are to be defined after legal and security review (see OQ-002).
- **FR-043**: Secrets scanning MUST be enabled on the source repository and MUST block merges that introduce credentials.

#### Auditability and Observability

- **FR-044**: The audit log MUST record at minimum: user session identifier, action type, action inputs (sanitised), action outcome, policy decisions with reasons, and UTC timestamp.
- **FR-045**: Audit logs MUST be queryable by session, action type, and time range.
- **FR-046**: Log pipelines MUST be designed as part of the initial system architecture, not added retrospectively.

#### Accessibility and Usability

- **FR-047**: The web interface MUST conform to WCAG 2.1 Level AA for all user-facing surfaces at production release.
- **FR-048**: The interface MUST be responsive and usable on both desktop and mobile form factors without horizontal scrolling or obscured controls.
- **FR-049**: Error messages and fallback states presented to the user MUST be in plain language explaining what happened and what the user can do next. Raw error codes, stack traces, or internal identifiers MUST NOT be shown to the user.
- **FR-050**: The system MUST detect any change to the seller identity, product variant, or quantity between the confirmed purchase summary and the moment of checkout initiation. If any such change is detected, checkout MUST be paused regardless of price impact, the user MUST be shown the specific change(s) in plain language, and explicit re-approval is required before proceeding. This requirement applies in both approval-based and bounded-autonomous modes.

---

### Key Entities

- **User**: A registered account holder with identity, preferences, purchasing policies, spending limits, and operating mode. Has an audit trail of actions.
- **Product Request**: A structured or partially structured set of requirements extracted from a natural-language input. Contains category, budget, specifications, preferences, and resolved/unresolved status.
- **Product Candidate**: A single product offer from a single source. Contains normalised product data: name, seller, category, specifications, base price, shipping cost, tax/fee amounts, total payable cost, seller rating, return policy, estimated delivery window, data freshness timestamp, and source.
- **Recommendation**: A ranked set of product candidates with explanations, trade-offs, data-quality disclosures, and freshness information.
- **Transaction**: A purchase attempt with an explicit state machine. Contains: product candidate reference, purchase mode used, authorized offer fingerprint (seller identity, product variant, quantity, and authorized price baseline — the confirmed summary total for approval-based purchases or the evaluated order total for bounded-autonomous purchases), final charged amount, provider reference, state, all state-transition events, and idempotency key (where applicable).
- **Audit Event**: An immutable log record capturing a single consequential agent action. Contains: session ID, action type, sanitised inputs, outcome, policy decisions, and UTC timestamp.
- **Capability Registry Entry**: A versioned record of a provider's capability. Contains: provider name, capability identifier, verification status, evidence source, verification date, and material limitations.
- **Purchasing Policy**: A user-configured rule set governing autonomous purchases. Contains: enabled flag, mandatory per-order spending limit, optional cumulative period spending limit (e.g., daily or monthly budget, enforced whenever configured), approved categories, approved marketplaces, seller constraints, and mandatory user-configured percentage-based and absolute-rupee price-change thresholds.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a clear product request can receive a ranked recommendation with trade-offs and total-cost breakdown in under 60 seconds from request submission, when at least one verified source returns results.
- **SC-002**: No purchase is initiated — in any mode — without a preceding authorisation step being satisfied. This is verifiable in automated tests across all purchase paths.
- **SC-003**: 100% of transactions where the final payable amount exceeds the applicable authorized baseline (the confirmed purchase summary total in approval-based mode, or the pre-checkout evaluated order total in bounded-autonomous mode) by any amount, or where a price decrease exceeds either configured threshold against that baseline, or where the seller, product variant, or quantity changes prior to checkout, are paused and require explicit user authorization before proceeding. This is verifiable by test.
- **SC-004**: 100% of checkout and payment initiations use only providers recorded as `verified` in the capability registry. This is verifiable by test.
- **SC-005**: A user can complete an approval-based purchase flow (from confirmed recommendation to checkout initiation) in under 3 minutes under normal conditions.
- **SC-006**: Uncertain transaction outcomes (timeout, ambiguous response) result in UNCERTAIN state with user notification 100% of the time. No uncertain outcome is reported as successful. Verifiable by test.
- **SC-007**: All user-facing pages and flows achieve WCAG 2.1 AA compliance as measured by automated and manual accessibility audits at production release.
- **SC-008**: Audit logs capture 100% of consequential agent actions within the session. Verifiable by end-to-end test comparing actions performed to audit-log entries.
- **SC-009**: No credentials, raw personal data, or internal secrets appear in application logs or user-facing output. Verifiable by automated log-scanning tests.
- **SC-010**: A user can view, modify, or remove any preference, policy, or spending limit in under 2 minutes from the settings interface.

---

## Assumptions

- **A-001**: The initial release targets the Indian market. Indian Rupee (INR) is the only supported currency at launch. Multi-currency support is out of scope for the MVP.
- **A-002**: The initial target users are individual consumers shopping for personal-use products on major Indian e-commerce platforms. Business procurement is out of scope for the MVP.
- **A-003**: Amazon India, Flipkart, and other Indian marketplaces are treated as candidate integrations. No marketplace API capability (search, cart, checkout, payment, tracking) is assumed to be available; each must be individually verified before use.
- **A-004**: CBDC and other digital-currency payment integrations are out of scope for the initial mandatory release.
- **A-005**: The initial release is a web-based product. Native mobile apps are out of scope for the MVP.
- **A-006**: Users are assumed to have a stable internet connection. Offline functionality is out of scope.
- **A-007**: Acquira requires user registration and authentication to store preferences, policies, audit history, and transaction records. Guest (unauthenticated) purchasing is out of scope for the MVP.
- **A-008**: Where a verified checkout integration exists, the integration is assumed to handle the actual payment processing. Acquira orchestrates the flow but does not process payment card data directly.
- **A-009**: Product data staleness thresholds will vary by category (e.g., electronics prices change faster than furniture prices). The exact threshold values per category are deferred to the planning phase.
- **A-010**: Detailed audit-log retention durations, account-closure deletion schedules, and legal-hold procedures (FR-041, FR-042) are deferred pending formal legal and security review prior to production acceptance testing (DEP-004, DEP-006) and do not block architecture planning. Until that review is completed, the system MUST operate under an interim policy of storing only the minimum personal data operationally necessary, providing user-facing access to own history, and requiring explicit per-case authorization for any privileged access.
- **A-011**: Price-change thresholds are mandatory user-configured fields; no system-assumed numerical defaults exist. Both a percentage-based and an absolute-rupee threshold must be explicitly set by the user before bounded-autonomous mode can be activated. Configured values are validated on save and enforced deterministically.
- **A-012**: The deduplication window for duplicate-purchase detection (FR-023) is a configurable value. A reasonable default (e.g., 24 hours for the same item, seller, and quantity) will be proposed during planning.
- **A-013**: "Verified" in the context of the capability registry means the capability has been confirmed through official provider documentation or a validated sandbox test, not through assumption or inference.

---

## MVP Scope

### In Scope (MVP)

- Natural-language product request intake and structured requirement extraction.
- Targeted clarification when requirements are missing or contradictory.
- English and Roman-script Hinglish input; responses match input language style where reliable; product data always in English/numerals.
- Full Hindi-script input out of MVP scope.
- Marketplace discovery using verified search capabilities only.
- Product normalisation, total-cost calculation, and multi-dimension comparison.
- Explainable ranked recommendations with trade-off disclosure and data freshness.
- Capability registry (version-controlled structured file) for all provider capabilities.
- Approval-based purchase flow (the only default purchase mode).
- Dual price-change threshold check (percentage + absolute rupee, user-configured, no defaults) before checkout.
- Changed-offer detection (seller, variant, quantity) triggering mandatory re-approval.
- Duplicate-purchase detection before checkout.
- Transaction state machine with explicit UNCERTAIN state handling.
- Verified checkout integration or safe provider handoff (deep-link + reference).
- Transaction outcome reporting based on authoritative provider confirmation only.
- Verified order-tracking integration or provider tracking URL fallback.
- User preference configuration (payment method, seller/brand preferences).
- Bounded-autonomous mode configuration (gated behind the five mandatory prerequisites; per-order spending limit required, cumulative period spending limit optional).
- Audit log for all consequential agent actions (sanitised personal data).
- Account data deletion or anonymisation flow.
- Web interface, WCAG 2.1 AA compliant, responsive for desktop and mobile.
- Secrets scanning on the repository.

### Explicitly Out of Scope (MVP)

- Native mobile applications (iOS, Android).
- Guest (unauthenticated) purchasing.
- Multi-currency support (INR only at launch).
- CBDC and digital-currency payment integrations.
- Business or bulk procurement flows.
- Offline functionality.
- Direct payment card processing by Acquira (payment handled by verified provider integrations).
- Any marketplace integration not individually verified before release.
- Price negotiation or bidding with sellers.
- Product review or rating submission.
- Social or shared shopping features.
- Voice input (may be considered post-MVP).

---

## Open Questions

These questions have a material impact on the specification and require product decisions before planning begins.

**OQ-001 — Price-change threshold values** *(resolved — 2026-11-01)*
All sub-questions are now settled:
- **Comparison baseline**: the applicable authorized baseline — the total shown in the user's final purchase confirmation summary for approval-based purchases, or the pre-checkout evaluated order total for bounded-autonomous purchases (FR-022).
- **Directional rule**: any price increase above the authorized baseline → always requires user approval; price decreases → governed by the two thresholds against that baseline (FR-022).
- **Threshold values**: user-configured mandatory fields; no system-assumed defaults. Both must be set before bounded-autonomous mode can be activated (FR-021, FR-022).
- **Changed-offer re-approval**: seller, product variant, or quantity changes also trigger mandatory re-approval independently (FR-050).
- **Remaining deferred items**: rounding rules and treatment of missing/stale price data at checkout — to be defined during planning (no blocking impact on current spec quality).

**OQ-002 — Audit-log and data-retention policy** *(partially resolved — 2026-11-01)*
- **User-facing access**: resolved — users may view their own audit records (FR-042).
- **Internal and regulatory access**: deferred to legal and security review. Any future access must be explicitly authorized, least-privilege, and itself auditable; no blanket internal access (FR-042).
- **Retention durations**: deferred pending legal review (IT Act, DPDP Act, consumer-protection rules). FR-041 and A-010 capture the interim policy (retain minimum necessary).
- **Deletion and legal-hold rules**: deferred to legal review.

**OQ-003 — Language support scope** *(resolved — 2026-11-01)*
- Input: English and Roman-script Hinglish (FR-004).
- Response style: match input language where reliable; English fallback when uncertain (FR-004).
- Structured output (product names, prices, specs, units): always English or standard numerals (FR-004).
- Full Hindi-script input: out of MVP scope (FR-004, MVP Scope).

**OQ-004 — Cumulative period spending limit requirement for bounded-autonomous mode** *(resolved — 2026-11-01)*
Resolved per Option B:
- **Mandatory vs. Optional**: The per-order spending limit is mandatory before bounded-autonomous mode can be activated. A cumulative period spending limit (e.g., daily or monthly budget) is an optional additional guardrail.
- **Activation Gate**: Omitting a cumulative period spending limit does not prevent activation of bounded-autonomous mode if all five mandatory prerequisites in FR-021 are satisfied.
- **Enforcement**: Whenever a cumulative period spending limit is configured by the user, the system MUST enforce it deterministically during bounded-autonomous purchasing. If a candidate order would cause cumulative spend to exceed the limit, autonomous checkout is blocked and user approval is required.
- **No Defaults**: No system-assumed default exists for either per-order or cumulative spending limits.

---

## Dependencies

- **DEP-001**: A capability registry must be populated (even partially) before any marketplace discovery or transactional flow can be verified. Registry population is a prerequisite for integration testing.
- **DEP-002**: A verified marketplace integration with search capability is required before User Stories 2 and 3 can be demonstrated with live data (mocked integrations may be used for development and testing).
- **DEP-003**: A verified checkout and payment integration is required before the approval-based purchase flow can be demonstrated end-to-end with a real provider.
- **DEP-004**: The remaining open items in OQ-002 (retention durations, deletion schedule, legal-hold rules for internal/regulatory access) must be resolved via legal and security review before the audit-log and data-deletion features can be fully acceptance-tested. User-facing access is now specified (FR-042) and does not block planning.
- **DEP-005**: OQ-001 is fully resolved. Rounding rules and missing/stale-price treatment at checkout remain to be defined during planning but do not block spec quality or planning initiation.
- **DEP-006**: Legal and regulatory assessment of the DPDP Act, IT Act, and applicable consumer-protection rules must be completed before the data-retention policy is finalised.
