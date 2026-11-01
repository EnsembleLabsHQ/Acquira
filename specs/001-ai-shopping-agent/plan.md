# Implementation Plan: Acquira AI Shopping Agent

**Branch**: `001-ai-shopping-agent` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)  
**Revision**: 1.5.0 (Canonical Payment-Transaction Relationship, Setup Boundary Disambiguation, Planning Authorization Status)  
**Input**: Feature Specification (`specs/001-ai-shopping-agent/spec.md`) [Draft] and Project Constitution (`.specify/memory/constitution.md`)  
**Plan Status**: Planning Complete — Implementation Pending Explicit User Approval  

---

## Summary

Acquira is an autonomous, web-based AI shopping agent targeting the Indian ecommerce market. It accepts natural-language shopping requests (in English and Roman-script Hinglish), extracts structured requirements, queries marketplace sources with verified search capabilities, normalises offers by total payable cost, and computes an explainable, trade-off-aware recommendation.

To ensure absolute financial and transaction integrity, the architecture strictly decouples **probabilistic AI reasoning** (handled in an advisory Python FastAPI service) from **deterministic purchase authorization** (executed by a TypeScript policy engine in Next.js). Purchases operate by default in approval-based mode, with bounded-autonomous purchasing unlocked only after explicit user configuration of five mandatory prerequisites (including a mandatory per-order spending limit and dual price-change thresholds).

---

## Technical Context

**Language/Version**: 
- Web Application & Core Backend: TypeScript 5.4+ on Node.js 20 LTS
- AI Processing Engine: Python 3.11+

**Primary Dependencies**:
- Frontend: Next.js 15+ (App Router), React 19, Tailwind CSS, `shadcn/ui` (Radix UI primitives), `motion/react` (Motion for React)
- Backend: Next.js Server Components, Server Actions, Route Handlers
- AI Engine: FastAPI, Pydantic v2, Instructor / LiteLLM / LangChain for structured extraction
- ORM / DB Access: Drizzle ORM with Drizzle Kit migrations

**Storage**:
- PostgreSQL 16 (connection pooling via `pg` driver)

**Testing**:
- TypeScript: Vitest for domain logic, Supertest for API routes, Playwright for E2E flows
- Python: pytest, pytest-asyncio, HTTPX for API tests
- Integration: Testcontainers for PostgreSQL containerized testing with mock marketplace adapters

**Target Platform**:
- Linux Docker containers, deployed on standard cloud infrastructure
- Modern responsive web browsers (mobile and desktop, WCAG 2.1 Level AA)

**Project Type**:
- Full-stack web application with dedicated internal AI computation service

**Performance Goals**:
- <60 seconds from request to explainable recommendation (SC-001)
- <3 minutes for complete approval-based checkout flow (SC-005)
- <500ms p95 latency for deterministic policy and price-change verification checks

**Constraints**:
- Absolute separation between AI reasoning and financial execution: LLMs are never granted direct tool permissions to trigger payment or write financial authorizations
- Zero credentials or API keys committed to source control or exposed in client bundles/prompts
- No scraping of unverified sources; unverified providers gracefully fall back to safe provider handoffs
- Currency restricted strictly to Indian Rupee (INR) for initial release
- Itemized cost model: Base price, shipping, taxes, and platform fees are explicitly modeled. Unknown or unavailable costs are **never silently treated as zero**.

**Scale/Scope**:
- MVP initial release targeting Indian consumer shopping
- 50 Functional Requirements (FR-001 to FR-050), 10 Measurable Success Criteria (SC-001 to SC-010)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-evaluated post Phase 1 design.*

| Principle | Requirement | Plan Status | Architectural Validation |
| :--- | :--- | :--- | :--- |
| **I. User Value & Explainability** | Explainable recommendations, trade-offs surfaced, uncertainty disclosed | **PASS** | `ai-service` computes structured `ranking_rationale` and `trade_offs_summary`; data freshness timestamp and cost disclosures exposed on all candidate offers. |
| **II. Security & Privacy by Design** | Protect credentials, PII scrubbing, no secrets in logs/prompts | **PASS** | Prompts scrubbed of PII; secrets in `.env`; `audit_events` table masks addresses, VPAs, and card numbers via regex sanitizers. |
| **III. Safe Purchasing & Financial Integrity** | Deterministic policy enforcement, approval-based default, dual thresholds, offer fingerprinting | **PASS** | Next.js Policy Engine enforces limits and dual price thresholds in deterministic TypeScript logic. 5 mandatory gates required for autonomous mode. |
| **IV. Verified Integrations** | No assumed provider support; capability registry as source of truth | **PASS** | `config/capability-registry.json` tracks status; unverified providers trigger `SafeHandoffDetails` with deep-links and manual instructions. |
| **V. Transactional Correctness** | State machine (`PENDING`, `SUBMITTED`, `CONFIRMED`, `FAILED`, `TIMED_OUT`, `UNCERTAIN`), idempotency | **PASS** | PostgreSQL `transactions` and `transaction_state_history` with unique `idempotency_key`; timeouts marked `UNCERTAIN` with zero auto-retry and reconciliation protocol. |
| **VI. Data Quality & Transparent Comparisons** | Total payable cost (`base + shipping + taxes + platform fees`), deterministic normalisation | **PASS** | Normalisation logic in Python calculates `total_payable_inr` and flags unavailable components; deterministic sorting. |
| **VII. Modular Architecture** | 7 defined interface boundaries, stack selection deferred to plan | **PASS** | Clean separation: `MarketplaceAdapter`, `PolicyEngine`, `AiProcessingService`, `TransactionManager` behind typed contracts. |
| **VIII. Testability & Reliability** | Automated tests for critical paths, sandbox/mock providers | **PASS** | Vitest and pytest test suites with mock marketplace adapters simulating price shifts, timeouts, and variant substitutions. |
| **IX. Maintainability & Code Quality** | Typed interfaces, externalized config, pinned dependencies | **PASS** | Strict TypeScript and Pydantic v2 typing across all trust boundaries; dependencies pinned in `package.json` and `pyproject.toml`. |
| **X. Human Oversight & Responsible Autonomy** | Visible permissions, escalate ambiguous actions, no self-escalation | **PASS** | Settings interface exposes operating mode and limits; deviations from evaluated baselines or canonical fingerprints trigger user escalation. |
| **XI. Observability & Auditability** | Privacy-conscious audit log, queryable history, least privilege | **PASS** | Append-only `audit_events` table; user-facing `/api/audit-logs` endpoint; internal operator access requires explicit authorized case ID. |
| **XII. Accessibility & Usability** | WCAG 2.1 AA, responsive editorial UI, plain-language errors | **PASS** | Radix UI primitives, `motion/react` with `prefers-reduced-motion` guards, high-contrast editorial typography, plain-language error states. |

---

## Project Structure

### Documentation & Spec Artifacts (this feature)

```text
specs/001-ai-shopping-agent/
├── spec.md                     # Feature specification (Draft, 50 FRs, 10 SCs)
├── plan.md                     # This implementation plan (/speckit-plan output)
├── research.md                 # Technical research, architecture decisions, and design tokens
├── data-model.md               # PostgreSQL schemas, relationships, indexes, and state machine
├── quickstart.md               # Runnable verification guide and planned test scenarios
├── checklists/
│   └── requirements.md         # Specification quality checklist (16/16 passing)
└── contracts/
    ├── ai-service-api.yaml     # OpenAPI 3.1 contract between Next.js and FastAPI
    ├── marketplace-adapter.ts  # TypeScript interface for marketplace providers
    ├── payment-adapter.ts      # TypeScript interface for payment providers (Mock, UPI, Amazon Pay)
    └── capability-registry.schema.json # JSON Schema for config/capability-registry.json
```

### Source Code Repository Layout

```text
Acquira/
├── config/
│   └── capability-registry.json    # Version-controlled marketplace capability records
├── docker-compose.yml              # Multi-container orchestration (db, web, ai-service)
├── .env.example                    # Template environment variables (zero secrets)
│
├── web/                            # Next.js 15+ Web Application & Core Backend
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/                    # Next.js App Router pages and route handlers
│   │   │   ├── layout.tsx          # Root editorial layout, font imports, metadata
│   │   │   ├── page.tsx            # Concierge chat & discovery landing view
│   │   │   ├── session/[id]/       # Shopping session conversational route
│   │   │   ├── settings/           # Policy & autonomous purchasing configuration
│   │   │   ├── history/            # Audit history view
│   │   │   └── api/                # API Route Handlers
│   │   │       ├── auth/           # Session authentication endpoints
│   │   │       ├── chat/           # Streaming chat interaction endpoint
│   │   │       ├── checkout/       # Purchase authorization and checkout endpoint
│   │   │       └── audit-logs/     # Privacy-filtered audit event query endpoint
│   │   ├── components/
│   │   │   ├── ui/                 # Custom-styled shadcn/ui primitives (dialog, sheet, etc.)
│   │   │   ├── editorial/          # Bespoke design components (product cards, trade-off drawers)
│   │   │   ├── chat/               # Conversational message list, input, voice fallback
│   │   │   └── purchasing/         # Purchase summary modal, approval triggers, re-approval dialogs
│   │   ├── lib/
│   │   │   ├── policy/             # Deterministic Purchasing Policy Engine
│   │   │   │   ├── spending-limits.ts # Per-order and optional cumulative spend validators
│   │   │   │   ├── price-thresholds.ts # Dual percentage & absolute INR threshold evaluator
│   │   │   │   ├── fingerprint.ts  # Canonical SHA-256 offer fingerprint generator
│   │   │   │   └── duplicate-check.ts # 24-hour transaction deduplication validator
│   │   │   ├── marketplace/        # Provider adapter registry and client
│   │   │   │   ├── registry.ts     # Loads and validates config/capability-registry.json
│   │   │   │   ├── adapters/       # Concrete marketplace adapters (mock, amazon, flipkart)
│   │   │   │   └── handoff.ts      # Safe provider handoff generator
│   │   │   ├── payment/            # Payment gateway client and adapters
│   │   │   │   ├── payment-service.ts # Payment orchestrator, idempotency & reconciliation
│   │   │   │   ├── adapters/       # Concrete payment adapters (mock-gateway, phonepe, amazon-pay)
│   │   │   │   └── payment-handoff.ts # UPI Intent / QR / gateway redirect generator
│   │   │   ├── ai-client/          # Typed HTTP client communicating with ai-service
│   │   │   ├── audit/              # Privacy-preserving audit event logger with PII masking
│   │   │   └── db/                 # Drizzle database client and schema definitions
│   │   │       ├── schema/         # Drizzle table schemas (users, transactions, payments, etc.)
│   │   │       └── migrations/     # Generated Drizzle SQL migration files
│   └── tests/
│       ├── unit/                   # Vitest unit tests for policy engine, thresholds, and mock gateway
│       ├── integration/            # Supertest API tests and database flow tests
│       └── e2e/                    # Playwright end-to-end browser scenarios
│
└── ai-service/                     # Python 3.11+ AI Processing & Normalization Service
    ├── Dockerfile
    ├── pyproject.toml
    ├── app/
    │   ├── main.py                 # FastAPI application entrypoint
    │   ├── api/                    # API routers (/extract-requirements, /discover-and-rank)
    │   ├── core/                   # Configuration, logging, and security
    │   ├── services/
    │   │   ├── extractor.py        # Natural language and Hinglish intent parser
    │   │   ├── normalizer.py       # Deterministic product offer normalizer (ItemizedCostStructure)
    │   │   └── ranker.py           # Multi-attribute scoring and trade-off synthesizer
    │   └── models/                 # Pydantic schemas mirroring OpenAPI contract
    └── tests/
        └── unit/                   # pytest test suite for parser, normalizer, and ranker
```

---

## Architecture & Safety Requirements

### 1. Service Boundaries & Communication
- **Next.js (`web`)**: The authoritative system. Controls database persistence, user sessions, transaction state machines, and payment execution.
- **Python FastAPI (`ai-service`)**: Purely computational/advisory. Accepts raw user text or raw provider offers; outputs structured requirements, normalized candidates, and trade-off explanations.
- **Contract Boundary**: Communication occurs strictly over internal HTTP via `/contracts/ai-service-api.yaml`. Every payload is validated with Zod in Next.js and Pydantic v2 in FastAPI.

### 2. Itemized Cost Model & Missing Charge Handling
- Total payable cost explicitly sums: `base_price_inr + shipping_cost_inr + estimated_taxes_inr + platform_fees_inr`.
- **Non-Zero Rule for Unknowns**: An unknown or unavailable cost component is **NEVER silently assumed to be zero**.
- Each component tracks its status: `KNOWN`, `ESTIMATED`, or `UNAVAILABLE`.
- If any fee/shipping component is `UNAVAILABLE`, the candidate is marked with `has_unavailable_costs = true` and the total is presented as a confirmed lower bound with an explicit caveat disclosure (FR-012, FR-015).
- In bounded-autonomous mode, if any cost component remains `UNAVAILABLE` at pre-checkout evaluation, the order total is considered uncertain and the purchase is paused for explicit user review (FR-024).

### 3. Canonical Checkout Identity & Offer Fingerprinting
- **Canonical Identity Elements**:
  1. `provider_id`: Unique marketplace adapter identifier
  2. `canonical_seller_id`: Unique merchant ID (independent of display name)
  3. `canonical_variant_sku`: Unique product variant SKU (independent of product title)
  4. `quantity`: Authorized order quantity
- **Canonical Serialization & Fingerprint Formula**:
  - Field order: `provider_id`, `canonical_seller_id`, `canonical_variant_sku`, `quantity`.
  - Normalization: String components are trimmed of whitespace and URL percent-encoded via `encodeURIComponent` (Python: `urllib.parse.quote(s, safe='')`) to eliminate delimiter ambiguity or collision. Quantity is formatted as a positive base-10 integer string without leading zeros.
  - Serialization payload:
    `${encodeURIComponent(provider_id.trim())}:${encodeURIComponent(canonical_seller_id.trim())}:${encodeURIComponent(canonical_variant_sku.trim())}:${quantity}`
  - Hash algorithm: SHA-256 over UTF-8 bytes of canonical payload, output as a 64-character lowercase hexadecimal string (`authorized_fingerprint`).
- **Revalidation & Substitution Detection**: Immediately before checkout, the deterministic backend calls `adapter.getOfferDetails(provider_item_id, canonical_variant_sku)` to re-fetch canonical metadata.
  - If the freshly computed fingerprint differs from the authorized fingerprint (e.g., merchant swap or variant shift at identical price), checkout is halted immediately and explicit re-approval is required (FR-050).
  - If current price increases above `authorized_baseline_inr` by even ₹0.01, checkout is paused immediately (FR-022).

### 4. Deterministic Financial Safety & Spending Limits
- **Approval-Based (Default)**: Summary presented with itemized costs. Confirmation required before checkout starts.
- **Bounded-Autonomous**: Gated behind the 5 mandatory prerequisites: (1) autonomous enabled, (2) per-order spending limit set, (3) purchasing policy set, (4) percentage threshold set, (5) absolute INR threshold set.
- **Spending Limits Enforcement**:
  - `candidate_payable <= per_order_limit_inr`.
  - If optional cumulative period limit is configured: `current_period_spend + candidate_payable <= cumulative_period_limit_inr`.
  - Exceeding either limit halts autonomous execution and requires user approval.

### 5. Concurrent Idempotency, Duplicate Prevention & Timeout Reconciliation
- **Concurrent Request Idempotency**:
  - PostgreSQL unique index on `transactions.idempotency_key`.
  - In Next.js checkout handler, a database transaction is opened:
    `SELECT id, status FROM transactions WHERE idempotency_key = $1 FOR UPDATE;`
  - Concurrent identical requests either receive 409 Conflict (if in flight) or return the existing authoritative transaction state (if completed).
- **Duplicate Prevention**:
  - Queries existing transactions for identical `(user_id, candidate_id, canonical_seller_id, quantity)` in states `PENDING`, `SUBMITTED`, or `CONFIRMED` within 24 hours. If found, checkout is blocked with an alert (FR-023).
- **State Machine**:
  - Explicit states: `PENDING` → `SUBMITTED` → `CONFIRMED` | `FAILED` | `TIMED_OUT` | `UNCERTAIN`.
- **Timeout Reconciliation (Zero Blind Retries)**:
  - When an external marketplace checkout/payment call times out or returns an ambiguous network drop, the transaction status is marked `UNCERTAIN`. Automatic blind retries of payment calls are strictly prohibited.
  - A reconciliation background worker invokes `adapter.reconcileCheckout(idempotencyKey, providerOrderId)` to determine authoritative outcome without initiating a new payment. If the order is confirmed by the provider, the status transitions to `CONFIRMED`. If the provider confirms no order was created, it transitions to `FAILED`. If uncertain after maximum reconciliation attempts, the transaction remains `UNCERTAIN` and alerts the user with provider support references.

### 6. Data Model Consistency & Referential Integrity
- `users.deleted_at`: Soft-delete flag for GDPR / DPDP right-to-be-forgotten requests (`is_anonymized: TRUE`).
- `transactions(user_id)`, `transactions(candidate_id)`, `payments(transaction_id)` (with `UNIQUE`), `transaction_state_history(transaction_id)`, `payment_state_history(payment_id)`, and `audit_events(user_id)` use `ON DELETE RESTRICT` to guarantee financial ledgers, state transition logs, and dispute records are never cascade-deleted on user account deletion or transaction mutation.
- **Canonical Payment-Transaction Relationship**: `payments.transaction_id` establishes a unidirectional 1-to-1 canonical foreign key to `transactions.id`. The redundant `transactions.payment_id` column is eliminated, dissolving circular foreign-key dependencies and guaranteeing strictly ordered migration execution (`transactions` created before `payments`).
- Unresolved legal/security retention durations are tracked as explicit production-readiness dependencies (`DEP-004`, `DEP-006`).

### 7. Marketplace Verification & Safe Handoff
- `config/capability-registry.json` gates all provider actions. Unverified sources produce `SafeHandoffDetails` (deep-links, itemized prices, manual steps) rather than attempting unverified programmatic checkout.

### 8. Payment Execution Architecture & Gateway Strategy
- **Separation of Order and Payment Execution**:
  - `MarketplaceAdapter` governs catalog search and order placement (`SIMULATED`, `LIVE_PROVIDER`, `MANUAL_HANDOFF`).
  - `PaymentAdapter` governs monetary authorization, capture, and reconciliation (`SIMULATED`, `LIVE_PROVIDER`, `MANUAL_HANDOFF`).
  - Non-inference invariant: A successful `SIMULATED` payment never implies a real retailer order was created, and an order placed in `MANUAL_HANDOFF` never implies a payment was captured.
  - **Cross-Execution Mode Barrier**: A `SIMULATED` payment can **NEVER** authorize a `LIVE_PROVIDER` retail order. If an order is `LIVE_PROVIDER`, payment must be `LIVE_PROVIDER` and verified.
- **Payment Providers & Gateway Strategy**:
  1. **CBDC / e₹-R (Deferred Future Extension)**: Outside the initial mandatory MVP scope per project constitution (A-004) and feature specification (A-004). Direct programmatic wallet integrations and autonomous debit remain unverified. CBDC is not exposed as an active MVP payment method; any future inclusion is subject to a separate specification, risk assessment, capability verification, and explicit approval.
  2. **PhonePe / UPI (Prospective Integration)**: Prospective merchant PG integration. Unverified capability limitation: no direct autonomous debit API without interactive user authentication is verified for automated agents under standard merchant terms. Standard UPI flow requires interactive user authentication (app-switch or QR presentation); autonomous capture without user authentication is unavailable. Unverified payment flows must route to Safe Payment Handoff (`SafePaymentHandoffDetails` generating UPI Intent URL / QR code).
  3. **Amazon Pay (Prospective Integration)**: Prospective merchant integration. Unverified capability limitation: no public programmatic autonomous checkout API is verified under standard merchant terms. Interactive user authorization redirect is required; autonomous background debit is unavailable. Routes to Safe Payment Handoff.
  4. **Mock Payment Gateway (`mock_payment_gateway`)**: Default active simulated payment implementation for demonstrations and automated testing. Deterministically supports simulated authorization/capture, simulated decline, simulated timeout (`UNCERTAIN`), and status reconciliation via `reconcilePayment(idempotencyKey, providerPaymentId)`. Produces synthetic references (`DEMO-RECEIPT-...`).
- **Capability Gating & Credential Hygiene**:
  - Live payments require explicit `verified` status in `config/capability-registry.json`.
  - Zero raw payment credentials, UPI PINs, OTPs, or sensitive payment secrets are ever accepted, logged, or persisted.

---

## Requirement Traceability Matrix

### Functional Requirements (FR-001 – FR-050)

| Requirement ID | Summary | Architectural Component | Target Artifact / Contract | Planned Verification Scenario |
| :--- | :--- | :--- | :--- | :--- |
| **FR-001** | NL product request & requirement extraction | `ai-service/extractor` | `contracts/ai-service-api.yaml` (`/extract-requirements`) | Quickstart Scenario 1 (`test_extractor.py`) |
| **FR-002** | Targeted clarifying questions | `ai-service/extractor` | `ExtractRequirementsResponse.clarification_question` | Quickstart Scenario 1 |
| **FR-003** | Contradictory requirements conflict surfacing | `ai-service/extractor` | `ExtractRequirementsResponse.is_resolved: false` | Unit test (`test_extractor.py`) |
| **FR-004** | English & Roman-script Hinglish input support | `ai-service/extractor` | `ExtractRequirementsResponse.detected_language` | Quickstart Scenario 1 |
| **FR-005** | No search until requirements confirmed | `web/session-manager` | `product_requests.is_resolved` column | Integration test (`session-flow.test.ts`) |
| **FR-006** | Only query verified search sources | `web/marketplace/registry` | `config/capability-registry.json` | Integration test (`registry-gating.test.ts`) |
| **FR-007** | Version-controlled structured capability registry | `config/` | `config/capability-registry.json` | Registry schema validation check |
| **FR-008** | Fallback search link when no verified source | `web/marketplace/handoff` | `contracts/marketplace-adapter.ts` (`SafeHandoffDetails`) | Integration test (`provider-handoff.test.ts`) |
| **FR-009** | Configurable staleness threshold | `ai-service/ranker` | `DiscoverAndRankRequest.staleness_threshold_seconds` | Unit test (`test_normalizer_costs.py`) |
| **FR-010** | Deterministic normalization schema | `ai-service/normalizer` | `product_candidates` table (`data-model.md`) | Unit test (`test_normalizer_costs.py`) |
| **FR-011** | Total payable cost (`base + shipping + taxes + fees`) | `ai-service/normalizer` | `ItemizedCostStructure` (`contracts/marketplace-adapter.ts`) | Quickstart Scenario 2 |
| **FR-012** | Unavailable cost component labeled, never zero | `ai-service/normalizer` | `CostComponent.status: UNAVAILABLE` | Quickstart Scenario 2 |
| **FR-013** | Comparison dimensions (cost, specs, rating, delivery) | `web/components/editorial` | `product_candidates` table (`data-model.md`) | E2E test (`comparison-view.test.ts`) |
| **FR-014** | Normalization independently testable | `ai-service/normalizer` | `ai-service/tests/test_normalizer_costs.py` | Unit test (`test_normalizer_costs.py`) |
| **FR-015** | Recommendation rationale, trade-offs, disclosures | `ai-service/ranker` | `DiscoverAndRankResponse` (`contracts/ai-service-api.yaml`) | Integration test (`discover-and-rank.test.ts`) |
| **FR-016** | Non-definitive recommendation when data missing | `ai-service/ranker` | `NormalizedCandidate.ranking_confidence: LOW_DATA_GAPS` | Quickstart Scenario 2 |
| **FR-017** | Deterministic ranking logic | `ai-service/ranker` | `NormalizedCandidate.rank_position` | Unit test (`test_ranker.py`) |
| **FR-018** | Approval-based default purchase mode | `web/lib/policy` | `purchasing_policies.is_autonomous_enabled: false` | Integration test (`approval-price-increase.test.ts`) |
| **FR-019** | Purchase summary breakdown before checkout | `web/components/purchasing` | `web/components/purchasing/summary-modal.tsx` | Quickstart Scenario 3 |
| **FR-020** | Explicit confirmation required in approval mode | `web/app/api/checkout` | `transactions.status: PENDING` | Quickstart Scenario 3 |
| **FR-021** | 5 mandatory prerequisites for autonomous mode | `web/lib/policy` | `web/lib/policy/spending-limits.ts` | Quickstart Scenario 4 & 5 |
| **FR-022** | Baseline comparison, dual thresholds, hard cap | `web/lib/policy` | `web/lib/policy/price-thresholds.ts` | Quickstart Scenario 3 |
| **FR-023** | Duplicate purchase detection within 24h | `web/lib/policy` | `web/lib/policy/duplicate-check.ts` | Integration test (`duplicate-order.test.ts`) |
| **FR-024** | Uncertain price/auth escalates to user | `web/lib/policy` | `web/lib/policy/price-thresholds.ts` | Quickstart Scenario 2 |
| **FR-025** | No autonomous inference from conversational cues | `web/lib/policy` | `web/lib/policy/spending-limits.ts` | Unit test (`policy-engine.test.ts`) |
| **FR-026** | Only checkout via verified providers | `web/marketplace/registry` | `config/capability-registry.json` | Integration test (`registry-gating.test.ts`) |
| **FR-027** | Idempotency keys used for checkout | `web/app/api/checkout` | `transactions.idempotency_key` (unique index) | Quickstart Scenario 7 |
| **FR-028** | Safe provider handoff when checkout unverified | `web/marketplace/handoff` | `contracts/marketplace-adapter.ts` (`generateHandoff`) | Integration test (`provider-handoff.test.ts`) |
| **FR-029** | No success claim without authoritative confirmation | `web/app/api/checkout` | `transactions.provider_order_id` | Quickstart Scenario 4 |
| **FR-030** | Timeouts marked UNCERTAIN, zero blind retries | `web/app/api/checkout` | `transactions.status: UNCERTAIN` | Quickstart Scenario 8 |
| **FR-031** | Explicit transaction state machine (6 states) | `web/lib/db/schema` | `transactions` and `transaction_state_history` | Quickstart Scenario 8 |
| **FR-032** | Verified order tracking with timestamp | `web/marketplace/adapters` | `MarketplaceAdapter.trackOrder` | Integration test (`order-tracking.test.ts`) |
| **FR-033** | Unverified tracking fallback URL + reference | `web/marketplace/adapters` | `OrderStatusResult.tracking_url` | Integration test (`order-tracking.test.ts`) |
| **FR-034** | Failed tracking displays last known status + link | `web/components/chat` | `web/components/chat/tracking-card.tsx` | Integration test (`order-tracking.test.ts`) |
| **FR-035** | User persistent preferences configuration | `web/app/settings` | `purchasing_policies.preferred_payment_methods` | Integration test (`settings.test.ts`) |
| **FR-036** | View, modify, delete preferences/policies anytime | `web/app/settings` | `web/app/settings/page.tsx` | E2E test (`settings.test.ts`) |
| **FR-037** | View mode, limits, thresholds, policies in one place| `web/app/settings` | `web/app/settings/page.tsx` | E2E test (`settings.test.ts`) |
| **FR-038** | Deactivating autonomous mode takes immediate effect | `web/app/settings` | `purchasing_policies.is_autonomous_enabled: false` | Integration test (`policy-engine.test.ts`) |
| **FR-039** | Zero credentials in prompts, logs, reports | `web/lib/audit` | `web/lib/audit/sanitizer.ts` | Quickstart Scenario 9 |
| **FR-040** | Personal data encrypted in transit | Infrastructure / Web | TLS / HTTPS, encrypted session cookies | Infrastructure validation |
| **FR-041** | Account data deletion/anonymization flow | `web/app/api/users` | `users.deleted_at`, `users.is_anonymized` | Integration test (`account-deletion.test.ts`) |
| **FR-042** | Privacy-conscious audit log, user view own history | `web/app/api/audit-logs` | `audit_events` table (`data-model.md`) | Quickstart Scenario 9 |
| **FR-043** | Secrets scanning enabled on repository | CI / Tooling | Pre-commit / GitHub Actions secrets scanner | Tooling check |
| **FR-044** | Audit log records session, inputs, outcome, time | `web/lib/audit` | `audit_events` table (`data-model.md`) | Quickstart Scenario 9 |
| **FR-045** | Audit logs queryable by session, action, time | `web/app/api/audit-logs` | `audit_events` indexes (`data-model.md`) | Quickstart Scenario 9 |
| **FR-046** | Log pipelines designed into initial architecture | `web/lib/audit` | `web/lib/audit/logger.ts` | Quickstart Scenario 9 |
| **FR-047** | WCAG 2.1 Level AA accessibility compliance | `web/components` | Radix UI primitives, Axe-core audit suite | E2E accessibility audit |
| **FR-048** | Responsive interface (desktop and mobile) | `web/components` | Tailwind CSS responsive layout | E2E viewport tests |
| **FR-049** | Plain-language error messages, no raw traces | `web/components/ui` | `web/components/ui/error-card.tsx` | Integration test (`error-handling.test.ts`) |
| **FR-050** | Detect seller/variant/quantity change via fingerprint| `web/lib/policy` | `web/lib/policy/fingerprint.ts`, `transactions.authorized_fingerprint` | Quickstart Scenario 6 |

---

### Success Criteria (SC-001 – SC-010)

> [!NOTE]
> Verification methods listed below represent planned test specifications defined in `quickstart.md`. In this architectural and planning phase, test suites have not yet been executed. Status indicates complete architectural and design coverage.

| Success Criterion | Target Metric | Architectural Component | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SC-001** | Recommendation in <60 seconds | `ai-service/ranker`, `web/api/chat` | Performance test (`sc001-recommendation-latency.test.ts`) | **COVERED** |
| **SC-002** | 0 purchases without authorization | `web/lib/policy/spending-limits.ts` | Integration test across all purchase paths | **COVERED** |
| **SC-003** | 100% price increases, threshold-exceeding decreases, and changed offers paused | `web/lib/policy/price-thresholds.ts`, `web/lib/policy/fingerprint.ts` | Quickstart Scenario 3 & 6 | **COVERED** |
| **SC-004** | 100% checkout/payments via verified providers only | `web/marketplace/registry.ts` | Quickstart Scenario 6 / Integration test | **COVERED** |
| **SC-005** | Approval purchase flow <3 minutes | `web/components/purchasing` | E2E flow test (`sc005-approval-duration.test.ts`) | **COVERED** |
| **SC-006** | 100% uncertain outcomes marked UNCERTAIN, 0 reported success | `web/app/api/checkout`, `transactions` | Quickstart Scenario 8 | **COVERED** |
| **SC-007** | WCAG 2.1 Level AA compliance on all surfaces | `web/components` | Automated Axe-core audit in Playwright E2E | **COVERED** |
| **SC-008** | 100% of consequential actions logged in audit trail | `web/lib/audit/logger.ts`, `audit_events` | Quickstart Scenario 9 | **COVERED** |
| **SC-009** | 0 credentials/raw PII in logs or user outputs | `web/lib/audit/sanitizer.ts` | Automated log-scanning test suite | **COVERED** |
| **SC-010** | Settings view/update in <2 minutes | `web/app/settings/page.tsx` | E2E usability test | **COVERED** |

---

## Technical Risks, Mitigations & Milestones

| Risk | Impact | Architectural Mitigation |
| :--- | :--- | :--- |
| **Marketplace API unavailability / anti-scraping** | High | Abstract `MarketplaceAdapter` interface; graceful fallback to `SafeHandoffDetails` deep-links; capability registry gates programmatic calls. |
| **Price / Fee fluctuation between recommendation and cart** | High | Pre-checkout real-time price verification; dual threshold check + hard cap on price increases; itemized cost tracking. |
| **LLM hallucination of product specifications** | Medium | Structured Pydantic extraction with strict validation against candidate product raw catalog data. |
| **Duplicate charges on network drop** | High | Idempotency keys enforced in PostgreSQL unique index; `SELECT ... FOR UPDATE` row locks; `UNCERTAIN` state blocks automatic retries. |
| **Unresolved legal retention durations** | Medium | Codified as explicit production-readiness dependency (`DEP-004`, `DEP-006`). Interim minimum-storage policy implemented with soft-delete anonymization. |

#### Staged Implementation Milestones
- **Milestone 1**: Infrastructure, Docker Compose, PostgreSQL schemas, Drizzle migrations, and `capability-registry.json`.
- **Milestone 2**: Python AI Service (`/extract-requirements`, Hinglish parsing, and itemized cost normalisation).
- **Milestone 3**: Next.js Concierge UI (editorial theme, chat interface, Motion animations, accessible product cards).
- **Milestone 4**: Deterministic Policy Engine (spending limits, dual thresholds, canonical fingerprinting, dupe checks).
- **Milestone 5**: Transaction State Machine, Safe Provider Handoff, Concurrent Idempotency, and Timeout Reconciliation.
- **Milestone 6**: Privacy-Preserving Audit Logging, User Settings, and Automated Test Suite.

---

## Complexity Tracking

> *No constitutional violations exist. All 12 principles pass cleanly.*

| Architectural Decision | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| **Separate Python FastAPI service** | Superior ecosystem for LLM orchestration, structured parsing, and Hinglish understanding | Pure TypeScript monolith would restrict AI library choices and make future computer vision or data normalisation pipelines difficult to maintain |
| **Drizzle ORM over Prisma** | Zero binary engine overhead, native SQL queries, lightweight edge/serverless compatibility | Prisma binary engine introduces memory overhead and slower cold starts in containerized Next.js route handlers |
| **Version-controlled JSON Capability Registry** | Transparent, auditable compliance with Principle IV (Verified Integrations) without runtime DB dependency | A runtime DB table would introduce bootstrap chicken-and-egg dependency and make capability verification diffs unreviewable in pull requests |
| **`ON DELETE RESTRICT` for transactions & audit logs** | Guarantees financial auditability and dispute resolution under account deletion | Cascading hard deletes would permanently destroy transaction history and violate regulatory compliance |
