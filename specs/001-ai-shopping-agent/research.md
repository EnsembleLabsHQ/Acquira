# Technical Research & Architecture Decisions: Acquira AI Shopping Agent

**Feature Directory**: `specs/001-ai-shopping-agent`  
**Date**: 2026-11-01  
**Status**: Completed  

---

## 1. System Architecture & Service Boundaries

### Decision
A modular two-tier application composed of:
1. **Web Core (`web` / Next.js with App Router, TypeScript)**: Handles UI, user authentication, session management, user preferences, purchasing policy configuration, deterministic transaction state machine, payment/checkout handoff, and PostgreSQL data persistence.
2. **AI & Processing Service (`ai-service` / Python 3.11+ with FastAPI)**: Handles natural-language requirement extraction, Hinglish understanding, marketplace discovery adapter execution, product normalisation, total cost calculation, and explainable ranking.
3. **Data Tier (`db` / PostgreSQL 16)**: Central relational store for users, sessions, preferences, policies, transactions, and immutable audit logs.

### Rationale
- **Separation of Concerns and Trust Boundaries**: Next.js manages user identity, financial authorizations, and database transactions. The AI engine is treated as an *advisory computation service*. Even if the LLM hallucinated, the deterministic policy engine inside Next.js intercepts, validates, and gates all transactions before any checkout action can be triggered.
- **Language Alignment**: Python is unmatched for LLM orchestration (Pydantic AI / Instructor / LangChain), scientific ranking, text parsing, and data scraping/adapter logic. Next.js App Router provides server-side rendering, React Server Components, streaming conversational UI, and server actions.
- **Contract Enforcement**: Service communication between Next.js and FastAPI uses typed REST endpoints with strict Pydantic schemas on the Python side and Zod schemas on the TypeScript side.

### Alternatives Considered
- *Monolithic Next.js (All-in-TypeScript)*: While LangChain.js exists, Python has superior tooling for data normalisation, semantic similarity, and future computer vision or scraping extensions. Monolith would complicate AI library integration.
- *Microservices (Separate Auth, Search, Cart, Payment, AI services)*: Rejected per constitution and plan guidelines. Unnecessary operational complexity for MVP. Two clear services (Web Core + AI Engine) provide optimal modularity.

---

## 2. Frontend Architecture & Editorial Design System

### Decision
- **Framework**: Next.js 15+ (App Router), React 19, TypeScript.
- **Styling**: Tailwind CSS v3.4 / v4 with customized CSS variables for design tokens.
- **Components**: Selectively adopted and customized `shadcn/ui` components (Radix UI primitives under the hood for accessibility and WCAG 2.1 AA compliance).
- **Animation**: `motion/react` (Motion for React, formerly Framer Motion) for subtle page transitions, recommendation card reveals, comparison drawer expansion, and conversational streaming.
- **Accessibility & Reduced Motion**: Full support for `prefers-reduced-motion` in Motion components. Strict keyboard navigation, screen-reader aria attributes, and contrast ratios conforming to WCAG 2.1 AA.
- **Aesthetic Direction**: Editorial ecommerce. Warm neutral stone (`#F9F8F6`), deep charcoal typography (`#1A1A1A`), muted terracotta/bronze accent (`#9E5A38` / `#B86B35`), generous whitespace, serif headings (e.g., Playfair Display or Cormorant Garamond paired with Inter/Plus Jakarta Sans), crisp product imagery borders, and zero neon-blue AI badges or generic SaaS glassmorphism.

### Rationale
- Matches the user's explicit design requirement: a premium shopping assistant that feels like a refined luxury concierge rather than a generic tech demo.
- Radix UI primitives ensure robust keyboard focus management and screen-reader semantics without custom reinvented wheels.

---

## 3. Database & Data Access Strategy

### Decision
- **Engine**: PostgreSQL 16.
- **ORM / Query Builder**: Drizzle ORM in Next.js (TypeScript).
- **Migration Strategy**: Drizzle Kit automated migrations tracked in version control (`drizzle/`).
- **Connection Management**: Connection pooling via `@neondatabase/serverless` or standard `pg` pool with explicit connection limits.

### Rationale
- **Type Safety**: Drizzle ORM provides end-to-end TypeScript types inferred directly from SQL table definitions.
- **Performance & Zero Overhead**: Drizzle avoids heavy ORM runtime magic, producing clean SQL queries ideal for serverless / edge Next.js route handlers.
- **Relational Integrity**: Strong foreign keys, unique constraints (e.g., idempotency keys, duplicate check windows), and JSONB support for unstructured provider metadata.

### Alternatives Considered
- *Prisma ORM*: Excellent tooling, but binary engine overhead and higher memory footprint. Drizzle is lighter and closer to raw SQL while remaining 100% type-safe.
- *MongoDB / Document Store*: Rejected. Acquira's financial transactions, purchasing policies, and audit logs require strict ACID guarantees and foreign-key relational integrity.

---

## 4. Deterministic Financial & Policy Engine

### Decision
Financial authorization and safety gates are implemented entirely in deterministic TypeScript application code in Next.js:
1. **Operating Mode Gate**:
   - Default: `approval-based`. Per-order confirmation summary must be presented and confirmed.
   - `bounded-autonomous`: Permitted ONLY if:
     1. Autonomous mode enabled in user account settings.
     2. Per-order spending limit explicitly set (> 0).
     3. Purchasing policy (categories, sellers) configured.
     4. Percentage price-change threshold explicitly set (>= 0).
     5. Absolute rupee price-change threshold explicitly set (>= 0).
     *(Optional: Cumulative period spending limit checked if configured, per Option B)*.
2. **Spending Limit Enforcement**:
   - `candidate_payable <= user_per_order_limit`.
   - If cumulative period limit is configured: `current_period_spend + candidate_payable <= user_cumulative_limit`.
   - Exceeding either limit halts autonomous execution and requires user approval.
3. **Itemized Cost Model & Missing Charge Handling**:
   - Total payable cost explicitly sums: `base_price_inr + shipping_cost_inr + estimated_taxes_inr + platform_fees_inr`.
   - **Critical Rule**: An unknown, estimated, or unavailable cost component is **NEVER silently assumed to be zero**.
   - If any fee/shipping component is `UNAVAILABLE`, the candidate is marked with `has_unavailable_costs = true` and the total is presented as a confirmed lower bound with an explicit caveat disclosure (FR-012, FR-015).
   - In bounded-autonomous mode, if any cost component remains `UNAVAILABLE` at pre-checkout evaluation, the order total is considered uncertain and the purchase is paused for explicit user review (FR-024).
4. **Price Baseline & Dual Threshold Enforcement**:
   - **Baseline**: Confirmed purchase summary total (approval-based) OR pre-checkout evaluated order total (bounded-autonomous).
   - **Price Increase**: `checkout_payable > baseline` by even ₹0.01 → IMMEDIATE PAUSE and require user confirmation.
   - **Price Decrease**: If `(baseline - checkout_payable) / baseline > (price_change_percentage_threshold / 100)` OR `(baseline - checkout_payable) > price_change_absolute_threshold_inr` → PAUSE and require confirmation. If within both thresholds → proceed without prompting.
5. **Canonical Offer Fingerprint Verification**:
   - **Serialization Standard**: Unambiguous canonical serialization using strict field order: `provider_id`, `canonical_seller_id`, `canonical_variant_sku`, `quantity`.
     - Normalization: String components are trimmed of whitespace and URL percent-encoded via `encodeURIComponent` (Python: `urllib.parse.quote(s, safe='')`) to prevent delimiter collision.
     - Quantity: Formatted as a positive base-10 integer string without leading zeros.
     - Payload: `${encodeURIComponent(provider_id.trim())}:${encodeURIComponent(canonical_seller_id.trim())}:${encodeURIComponent(canonical_variant_sku.trim())}:${quantity}`
   - **Hash Computation**: `authorized_fingerprint = SHA-256(canonical_payload)` as a 64-character lowercase hex digest.
   - **Detection of Hidden Substitutions**: Because the fingerprint uses the provider's immutable machine merchant ID (`canonical_seller_id`) and variant SKU (`canonical_variant_sku`) with URI-encoded delimitation, merchant swaps (e.g. from "Official Store" to a third-party seller with identical display name) or variant shifts (e.g. 8GB vs 16GB model at identical discounted price) produce a different SHA-256 hash.
   - Before checkout dispatch, real-time offer details are re-queried via `getOfferDetails(providerItemId, variantSku)`. If the freshly computed fingerprint differs from the authorized fingerprint, checkout is immediately paused with an explicit disclosure of the changed attributes (FR-050).
6. **Concurrent Idempotency & Duplicate Prevention**:
   - Every purchase request generates a cryptographically random UUID idempotency key stored in PostgreSQL with a `UNIQUE` constraint.
   - Checkout execution opens a database transaction with `SELECT ... FOR UPDATE` row-level locking. Concurrent identical requests either receive 409 Conflict (if in flight) or return the existing authoritative transaction state (if completed).
   - Duplicate prevention queries existing transactions for identical `(user_id, candidate_id, canonical_seller_id, quantity)` in states `PENDING`, `SUBMITTED`, or `CONFIRMED` within a 24-hour window. If found, checkout is blocked with an alert (FR-023).
7. **Timeout Reconciliation Protocol (Zero Blind Retries)**:
   - When an external marketplace checkout/payment call times out or returns an ambiguous network drop, the transaction status is marked `UNCERTAIN`. Automatic blind retries of payment calls are strictly prohibited.
   - A reconciliation handler invokes the adapter's `reconcileCheckout(idempotencyKey, providerOrderId)` to determine authoritative outcome without initiating a new payment. If the order is confirmed by the provider, the status transitions to `CONFIRMED`. If the provider confirms no order was created, it transitions to `FAILED`. If uncertain after maximum reconciliation attempts, the transaction remains `UNCERTAIN` and alerts the user with provider support references.

### Rationale
- Satisfies Principle III, Principle V, and Principle VIII of the Constitution: zero financial reliance on probabilistic LLM outputs, guaranteed transaction states, and strict idempotency.

---

## 5. Marketplace Integration & Capability Registry Architecture

### Decision
- **Capability Registry**: Version-controlled structured file at `config/capability-registry.json` conforming to JSON Schema (`config/capability-registry.schema.json` and `specs/001-ai-shopping-agent/contracts/capability-registry.schema.json`).
- **Provider Status Enum**: `verified`, `unverified`, `unavailable`, `pending-verification`.
- **Adapter Interface (`contracts/marketplace-adapter.ts`)**:
  - `MarketplaceAdapter`:
    - `search(query: RawSearchQuery): Promise<RawProductOffer[]>` — Search marketplace for candidate offers (requires verified `search` capability).
    - `getOfferDetails(providerItemId: string, variantSku?: string): Promise<RawProductOffer>` — Fetch real-time offer details to revalidate price, costs, and canonical identity before purchase.
    - `generateHandoff(offer: RawProductOffer): SafeHandoffDetails` — Generate safe provider handoff when direct checkout is unavailable or unverified.
    - `checkout?(request: CheckoutRequest): Promise<AuthoritativeCheckoutResult>` — Programmatic checkout execution (permitted ONLY if both `checkout` and `payment` are verified).
    - `reconcileCheckout?(idempotencyKey: string, providerOrderId?: string): Promise<AuthoritativeCheckoutResult>` — Authoritatively reconcile an ambiguous or timed-out transaction without initiating a new payment.
    - `trackOrder?(providerOrderId: string): Promise<OrderStatusResult>` — Post-purchase order lifecycle tracking (permitted ONLY if `tracking` is verified).
- **Fallback Architecture**:
  - For candidate marketplaces without verified checkout/payment APIs (e.g., Amazon India, Flipkart initial phase): The adapter returns verified search/normalised data, and when checkout is requested, produces a `SafeHandoffDetails` with direct product URL, canonical seller/variant identifiers, last observed itemized cost breakdown, and step-by-step manual purchase instructions (FR-028).
- **Strict Verification Gate**: The system refuses to attempt programmatic API checkout or payment unless both `checkout` and `payment` capabilities for that provider are explicitly marked `verified` in `config/capability-registry.json`.

---

## 5.1 Payment Execution & Gateway Strategy

### Decision
The architecture strictly decouples **Order Execution** from **Payment Execution** using separate abstractions (`MarketplaceAdapter` and `PaymentAdapter`).

#### 1. Execution Modes
All orders and payments are tagged with explicit execution modes:
- `SIMULATED`: A demo order or payment in a local sandbox; zero real order submission and zero real money movement. Produces synthetic references e.g. `DEMO-RECEIPT-...`.
- `LIVE_PROVIDER`: An actual financial transaction or retailer order through an authorized, verified provider integration.
- `MANUAL_HANDOFF`: The user completes checkout or payment through the supported external provider flow (e.g. UPI Intent URL, dynamic QR code, or merchant redirect).

#### 2. Separation of Concerns & Non-Inference Invariant
- A successful `SIMULATED` payment never implies a real retailer order was created.
- An order placed in `MANUAL_HANDOFF` never implies a payment was captured.
- **Cross-Execution Mode Barrier**: A `SIMULATED` payment can **NEVER** authorize a `LIVE_PROVIDER` retail order. If an order is `LIVE_PROVIDER`, payment must be `LIVE_PROVIDER` and verified.

#### 3. Payment Provider Evaluation & Integration Strategy
1. **Central Bank Digital Currency (CBDC / e₹-R) [Deferred Extension]**:
   - India's sovereign digital rupee on a tokenized ledger.
   - Distinct from UPI and distinct from commercial stored-value wallets.
   - Status: Outside initial mandatory MVP scope per project constitution (A-004) and feature specification (A-004). Direct programmable agent wallet integrations and autonomous debit remain unverified. Not exposed as an active MVP payment method; any future inclusion requires separate specification, risk assessment, verification, and explicit approval.
2. **PhonePe / UPI [Prospective Integration]**:
   - Prospective merchant payment gateway integration.
   - Status: `pending-verification` for merchant onboarding and API access. Unverified capability limitation: no direct autonomous debit API without user authentication verified for automated agents. Standard UPI payment requires interactive user authentication (app-switch or QR presentation).
   - Operational Flow: Uses `generatePaymentHandoff` producing standard UPI Intent deep-links (`upi://pay?...`) or dynamic UPI QR codes for interactive user authentication.
3. **Amazon Pay [Prospective Integration]**:
   - Prospective merchant gateway integration.
   - Status: `pending-verification` for merchant partnership agreement and API credential issuance. Unverified capability limitation: no public programmatic autonomous checkout API verified under standard merchant terms; requires interactive user redirect authorization.
   - Operational Flow: Routes unverified/interactive flows to Safe Payment Handoff.
4. **Mock Payment Gateway (`mock_payment_gateway`) [Active MVP Simulated]**:
   - Default payment implementation for project demonstrations and automated testing.
   - Fully deterministic support for:
     - Simulated payment authorization and capture.
     - Simulated payment decline/failure.
     - Simulated gateway timeout leading to `UNCERTAIN` state.
     - Safe reconciliation lookup via `reconcilePayment(idempotencyKey, providerPaymentId)` without duplicate debit.
     - Synthetic transaction receipts formatted as `DEMO-RECEIPT-{UUID}`.
     - Never touches real banking rails or creates the impression of money movement.

#### 4. Real Payment Safety Checklist
Before any real payment can be initiated:
- Provider and requested capability (`authorize`, `capture`) must be explicitly `verified` in `config/capability-registry.json`.
- Amount, currency (`INR`), payee, and authorized order fingerprint are validated against policy.
- Zero raw payment credentials, UPI PINs, OTPs, or wallet secrets are ever logged or stored.

---

## 6. Authentication, Sessions & Audit Access Control

### Decision
- **Authentication**: Session-based auth with secure, `httpOnly`, `SameSite=Lax`, encrypted JWT/session cookies via NextAuth.js / Auth.js.
- **User Roles**:
  - `user`: Standard shopper. Can view/modify own profile, preferences, purchasing policies, and view own audit history (`session_id` / `user_id`).
  - `operator`: Internal technical support. Blanket access denied. Must submit an authorized case ID to inspect specific anonymized error traces.
  - `regulator`: External compliance inquiry. Export governed by offline legal approval workflow.
- **Privacy & PII Protection**:
  - Prompts to LLM contain zero user names, phone numbers, delivery addresses, payment tokens, or VPAs.
  - Audit log table `audit_events` stores hashes / UUIDs for user identity and sanitizes input text using regex scrubbers for email, phone numbers, and payment details before insertion.

---

## 7. Testing & Reliability Strategy

### Decision
- **Unit Testing**: Vitest for TypeScript domain logic (Policy Engine, Price Threshold Calculator, Fingerprint Hasher, Zod validators) and pytest for Python normalisation & ranking logic.
- **Integration Testing**: Supertest / Next.js route testing with testcontainers-postgres for real database transactions and migrations. Mock marketplace adapters simulating timeouts, network failures, price shifts, and provider errors.
- **Contract Testing**: JSON Schema validation ensuring Next.js and FastAPI payloads stay in sync.
- **End-to-End Scenarios**: Playwright tests executing:
  1. Approval-based search → summary → price increase simulation → pause → approval.
  2. Bounded-autonomous activation → compliant purchase → instant confirmation.
  3. Bounded-autonomous with spending limit exceeded → blocked.
  4. Changed seller/variant at checkout → pause and alert.

---

## 8. Containerization & Local Development

### Decision
Docker Compose configuration with 3 services:
1. `db`: `postgres:16-alpine`, port 5432, healthcheck, volume for persistence.
2. `web`: Node.js 20 Alpine, port 3000, hot-reloading in dev.
3. `ai-service`: Python 3.11 Slim, port 8000, Uvicorn with reload.
Environment variables managed through `.env.example` with zero secrets committed.
