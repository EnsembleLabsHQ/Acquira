# Quickstart & Verification Guide: Acquira AI Shopping Agent

**Feature Directory**: `specs/001-ai-shopping-agent`  
**Purpose**: Runnable validation scenarios proving architecture, safety gates, and flows end-to-end.  
**Execution Status**: Planned test specifications. These scenarios define the test suites to be constructed during the task implementation phase. In this planning phase, test suites have not yet been executed.

---

## 1. Prerequisites & Environment Setup

### Required Tooling
- **Docker & Docker Compose**: v2.20+
- **Node.js**: v20.x LTS with npm / pnpm
- **Python**: v3.11+ with pip / poetry

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
# Database (PostgreSQL 16)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/acquira"

# AI Service (Python FastAPI)
AI_SERVICE_URL="http://localhost:8000"
LLM_API_KEY="test-sandbox-key" # or mock provider

# Next.js Auth & App
NEXTAUTH_SECRET="insecure-dev-secret-replace-in-prod"
NEXTAUTH_URL="http://localhost:3000"
PORT=3000
```

### Launch Infrastructure
```bash
# 1. Start PostgreSQL, Next.js Web, and FastAPI AI Engine
docker compose up -d --build

# 2. Run Database Migrations (Drizzle ORM)
docker compose exec web npm run db:migrate

# 3. Seed Capability Registry & Mock Provider Data
docker compose exec web npm run db:seed
```

---

## 2. Planned Verification Scenarios (Mapped to Implementation Tasks)

### Scenario 1: Natural-Language Intake & Hinglish Normalization (User Story 1, FR-001 – FR-004)
- **Goal**: Verify requirement extraction in English and Roman-script Hinglish with clear clarification triggers.
- **Planned Test Command**:
  ```bash
  docker compose exec ai-service pytest tests/unit/test_extractor.py -k "test_hinglish_extraction"
  ```
- **Validation Contract**:
  - Request: `{"raw_query": "Mujhe college ke liye laptop chahiye under 60000 with 16GB RAM and good battery"}`
  - Assertions:
    - `is_resolved`: `true`
    - `extracted_category`: `"laptop"`
    - `budget_max_inr`: `60000.00`
    - `specifications.ram`: `"16GB"`
    - `detected_language`: `"hinglish"`

---

### Scenario 2: Itemized Cost Model & Missing Charge Handling (FR-011, FR-012, FR-016)
- **Goal**: Verify that unknown or unavailable fees/shipping charges are NEVER treated as zero and trigger required disclosures.
- **Planned Test Command**:
  ```bash
  docker compose exec ai-service pytest tests/unit/test_normalizer_costs.py
  ```
- **Validation Contract**:
  - Raw offer with base price ₹10,000, shipping `UNAVAILABLE`, platform fee ₹49.
  - Assertions:
    - `total_payable_inr`: `10049.00` (lower bound sum of known components)
    - `has_unavailable_costs`: `true`
    - `unavailable_components`: `["shipping"]`
    - `cost_disclosures`: Contains `"Shipping cost is unavailable from seller; total represents confirmed lower bound"`
    - In ranking: Flagged as `LOW_DATA_GAPS` confidence.
    - In autonomous evaluation: Pauses checkout due to uncertain payable amount (FR-024).

---

### Scenario 3: Approval-Based Purchase with Price-Increase Re-Approval (User Story 3, FR-019, FR-022)
- **Goal**: Verify that *any* upward price difference (+₹0.01) between confirmed summary and checkout halts the flow.
- **Planned Test Command**:
  ```bash
  docker compose exec web npm test tests/integration/approval-price-increase.test.ts
  ```
- **Validation Contract**:
  - User confirms summary total of ₹74,990.
  - Provider simulates checkout price shifting to ₹75,000 (+₹10 increase).
  - Assertions:
    - Checkout is halted immediately.
    - Transaction state remains `PENDING` / `PAUSED_REAPPROVAL`.
    - User shown difference (+₹10) and must re-approve before checkout executes.

---

### Scenario 4: Bounded-Autonomous Activation & Compliant Order (User Story 4, FR-021)
- **Goal**: Verify autonomous execution when all 5 mandatory conditions are satisfied (per-order limit set, thresholds set).
- **Planned Test Command**:
  ```bash
  docker compose exec web npm test tests/integration/autonomous-compliant-purchase.test.ts
  ```
- **Validation Contract**:
  - User policy configured: `per_order_limit_inr = 50000.00`, `price_change_percentage_threshold = 5.00`, `price_change_absolute_threshold_inr = 200.00`.
  - Candidate order: ₹4,500 book.
  - Assertions:
    - Order executes without per-order prompt.
    - Authoritative confirmation received with provider order ID.
    - Transaction state: `CONFIRMED`.

---

### Scenario 5: Cumulative Spending Budget Gating (User Story 4, FR-021 Option B)
- **Goal**: Verify deterministic blocking when order exceeds the optional cumulative period budget.
- **Planned Test Command**:
  ```bash
  docker compose exec web npm test tests/integration/spending-limit-enforcement.test.ts
  ```
- **Validation Contract**:
  - User policy: `per_order_limit_inr = 20000`, optional `cumulative_period_limit_inr = 50000` (Monthly).
  - Current monthly spend: ₹45,000.
  - Candidate order: ₹15,000 (below per-order limit, but ₹45,000 + ₹15,000 = ₹60,000 > ₹50,000).
  - Assertions:
    - Autonomous checkout is BLOCKED.
    - Alert notification sent: Cumulative budget exceeded by ₹10,000.

---

### Scenario 6: Canonical Offer Fingerprint & Substitution Re-Approval (FR-050)
- **Goal**: Verify that changes in merchant ID, variant SKU, or quantity halt checkout even if display name and price are identical.
- **Planned Test Command**:
  ```bash
  docker compose exec web npm test tests/integration/changed-offer-fingerprint.test.ts
  ```
- **Validation Contract**:
  - Authorized offer: `provider_id: "mock_provider"`, `canonical_seller_id: "SELLER_1"`, `canonical_variant_sku: "SKU_8GB"`, `quantity: 1`, Price ₹1,200.
  - Canonical serialization payload: `${encodeURIComponent("mock_provider")}:${encodeURIComponent("SELLER_1")}:${encodeURIComponent("SKU_8GB")}:1`
  - Authorized fingerprint: SHA-256 lowercase hex of canonical payload.
  - Checkout re-fetch returns: `provider_id: "mock_provider"`, `canonical_seller_id: "SELLER_2"`, `canonical_variant_sku: "SKU_8GB"`, `quantity: 1`, Display Name "Official Store", Price ₹1,200.
  - Assertions:
    - Freshly calculated SHA-256 fingerprint differs from authorized fingerprint.
    - Checkout halted immediately with reason `OFFER_FINGERPRINT_MISMATCH`.
    - User prompted for explicit re-approval.

---

### Scenario 7: Concurrent Idempotency & Duplicate Prevention (FR-023, FR-027, SC-002)
- **Goal**: Verify that rapid concurrent checkout requests using the same idempotency key never produce duplicate orders or charges, and separate keys cannot bypass 24-hour duplicate protection.
- **Planned Test Command**:
  ```bash
  docker compose exec web npm test tests/integration/concurrent-idempotency.test.ts
  ```
- **Validation Contract**:
  - Fire 5 parallel HTTP checkout requests with identical `idempotency_key`.
  - Assertions:
    - Exactly 1 request acquires the `SELECT ... FOR UPDATE` lock and initiates payment/order execution.
    - The other 4 requests receive 409 Conflict while in-flight or return the exact same cached authoritative confirmation once completed.
    - Exactly 1 order record and 1 payment record exist in PostgreSQL.
    - Retrying with a different idempotency key for identical user/product/quantity within 24 hours is blocked by duplicate-order prevention.

---

### Scenario 8: Simulated Payment Execution, Decline & Order Separation (FR-020, FR-029)
- **Goal**: Verify deterministic mock payment gateway behavior: successful simulated payment + simulated order, simulated decline, and clear separation between payment capture and order confirmation.
- **Planned Test Command**:
  ```bash
  docker compose exec web npm test tests/integration/payment-execution-modes.test.ts
  ```
- **Validation Contract**:
  - **Case A (Simulated Success)**:
    - Mock payment gateway executes in `SIMULATED` mode.
    - Generates synthetic reference `DEMO-RECEIPT-{UUID}` and demo receipt flag (`is_demo_receipt: true`).
    - Order transitions to `CONFIRMED` with `DEMO-ORDER-{UUID}` and `is_demo_order: true`.
    - Zero real money moved; zero real provider APIs invoked.
  - **Case B (Simulated Decline)**:
    - Mock payment gateway simulates card/UPI decline (e.g. simulated insufficient balance).
    - Payment transitions to `FAILED` with failure reason.
    - Order execution does NOT proceed; order remains unconfirmed or aborted.
    - Assert: No order confirmation without authoritative payment capture.
  - **Case C (Cross-Execution Mode Barrier)**:
    - Test forces a `SIMULATED` payment token into a `LIVE_PROVIDER` marketplace checkout request.
    - Checkout service throws strict validation error: `SIMULATED payment cannot authorize LIVE_PROVIDER order`.

---

### Scenario 9: Ambiguous Timeout Reconciliation (FR-030, FR-031, SC-006)
- **Goal**: Verify that network drops or timeouts during payment capture or order dispatch transition to `UNCERTAIN` and are safely reconciled without blind retries.
- **Planned Test Command**:
  ```bash
  docker compose exec web npm test tests/integration/timeout-reconciliation.test.ts
  ```
- **Validation Contract**:
  - Mock payment gateway or marketplace adapter simulates network drop mid-flight.
  - Assertions:
    - Payment/Transaction marked `UNCERTAIN` (not `FAILED`, not `CONFIRMED`).
    - Zero automatic payment retries.
    - Background reconciliation worker invokes `reconcilePayment(idempotencyKey)` and `reconcileCheckout(idempotencyKey)`.
    - If provider acknowledges transaction: transitions to `CONFIRMED`/`CAPTURED`. If provider confirms no record: transitions to `FAILED`.

---

### Scenario 10: Capability Registry Gating & Safe Payment Handoff (FR-026, FR-028)
- **Goal**: Verify that unverified or unavailable payment/marketplace capabilities route to Safe Handoff and never dispatch unauthorized live requests.
- **Planned Test Command**:
  ```bash
  docker compose exec web npm test tests/integration/capability-gating.test.ts
  ```
- **Validation Contract**:
  - **Case A (Prospective Payment Provider Handoff — PhonePe / UPI)**:
    - User selects prospective payment method (PhonePe / UPI).
    - System checks `config/capability-registry.json` where autonomous capture is `unavailable` without interactive user authentication.
    - Request generates `SafePaymentHandoffDetails` with dynamic UPI Intent deep-link (`upi://pay?...`) and QR payload for user authentication, never attempting autonomous debit.
  - **Case B (Deferred Currency Scope Exclusion — CBDC / e₹-R)**:
    - UI payment selection excludes out-of-scope digital currencies in compliance with Constitution (A-004).
    - Direct API requests attempting to execute out-of-scope currencies are rejected with 400 Bad Request and logged as blocked policy events.
  - **Case C (Unverified Marketplace Provider Handoff)**:
    - User selects Amazon India or Flipkart offer where `checkout` is `unavailable`.
    - Checkout service generates `SafeHandoffDetails` with direct product URL, canonical seller/variant identifiers, and manual purchase checklist.

---

### Scenario 11: Privacy-Preserving Audit Logging & Access Control (FR-041, FR-042, FR-044)
- **Goal**: Verify audit event creation, PII masking, user-facing query, and privileged operator restrictions.
- **Planned Test Command**:
  ```bash
  docker compose exec web npm test tests/integration/audit-logging.test.ts
  ```
- **Validation Contract**:
  - Authenticated user queries `/api/audit-logs` and retrieves own action events.
  - Database verification: All addresses, phone numbers, and payment tokens in `audit_events` are scrubbed/masked.
  - Operator query without a valid case justification token returns 403 Forbidden.
