/**
 * Acquira Payment Integration Interface Contract
 * 
 * Defines the contract that all payment adapters must satisfy.
 * Establishes strict separation between Payment Execution and Order Execution.
 * 
 * CRITICAL SAFETY RULES:
 * 1. A SIMULATED payment must NEVER authorize a LIVE_PROVIDER retail checkout.
 * 2. Unverified or unavailable real payment capabilities MUST route to MANUAL_HANDOFF or fail cleanly.
 * 3. Raw payment credentials, UPI PINs, OTPs, or wallet secrets MUST NEVER be accepted or stored.
 * 4. CBDC (e₹-R) and digital currencies are outside initial mandatory MVP scope (Constitution A-004); any future inclusion is subject to separate specification, risk assessment, verification, and explicit approval.
 */

export type PaymentExecutionMode = 'SIMULATED' | 'LIVE_PROVIDER' | 'MANUAL_HANDOFF';

export type PaymentMethodType = 
  | 'UPI_PHONEPE'          // PhonePe PG / UPI Collect or Intent (Prospective, safe handoff)
  | 'AMAZON_PAY'           // Amazon Pay Merchant Gateway (Prospective, safe handoff)
  | 'MOCK_SANDBOX';        // Deterministic simulation gateway for tests/demos (Active MVP simulated)

export type PaymentStatus = 
  | 'INITIATED' 
  | 'PENDING' 
  | 'AUTHORIZED' 
  | 'CAPTURED' 
  | 'FAILED' 
  | 'UNCERTAIN';

export interface PaymentCapabilityRecord {
  provider_id: string;
  provider_name: string;
  capability: 'authorize' | 'capture' | 'reconcile' | 'refund';
  status: 'verified' | 'unverified' | 'unavailable' | 'pending-verification';
  evidence_source: string;
  verification_date: string; // ISO YYYY-MM-DD
  limitations?: string[];
}

export interface PaymentAuthorizationRequest {
  idempotency_key: string;
  order_id: string;
  amount_inr: number;
  currency: 'INR';
  execution_mode: PaymentExecutionMode;
  payment_method: PaymentMethodType;
  metadata?: Record<string, string>;
}

export interface PaymentCaptureRequest {
  idempotency_key: string;
  authorization_id: string;
  amount_inr: number;
  currency: 'INR';
  execution_mode: PaymentExecutionMode;
}

export interface AuthoritativePaymentResult {
  success: boolean;
  status: PaymentStatus;
  execution_mode: PaymentExecutionMode;
  payment_method: PaymentMethodType;
  provider_payment_id?: string; // Synthetic e.g. "DEMO-RECEIPT-UUID" for SIMULATED, real gateway ref for LIVE_PROVIDER
  charged_amount_inr?: number;
  currency: 'INR';
  timestamp: string; // ISO 8601
  is_demo_receipt: boolean;
  failure_reason?: string;
  reconciliation_status?: 'RECONCILED_SUCCESS' | 'RECONCILED_FAILED' | 'PENDING_RECONCILIATION';
}

export interface SafePaymentHandoffDetails {
  provider_id: string;
  payment_method: PaymentMethodType;
  amount_inr: number;
  currency: 'INR';
  intent_deep_link?: string; // e.g., upi://pay?... for UPI apps
  qr_code_payload?: string;  // Dynamic BharatQR / UPI QR payload
  redirect_url?: string;     // Hosted gateway checkout URL
  merchant_reference: string;
  manual_instructions: string[];
}

/**
 * Common Payment Adapter Interface
 */
export interface PaymentAdapter {
  readonly providerId: string;
  readonly providerName: string;
  readonly defaultExecutionMode: PaymentExecutionMode;

  /**
   * Authorize payment against provider (Requires verified 'authorize' capability)
   */
  authorize?(request: PaymentAuthorizationRequest): Promise<AuthoritativePaymentResult>;

  /**
   * Capture authorized payment (Requires verified 'capture' capability)
   */
  capture?(request: PaymentCaptureRequest): Promise<AuthoritativePaymentResult>;

  /**
   * Reconcile an ambiguous or timed-out payment without submitting a duplicate charge
   */
  reconcilePayment?(idempotencyKey: string, providerPaymentId?: string): Promise<AuthoritativePaymentResult>;

  /**
   * Generate safe payment handoff (e.g. UPI Intent / hosted redirect / QR) when direct capture is unverified or unavailable
   */
  generatePaymentHandoff?(request: PaymentAuthorizationRequest): SafePaymentHandoffDetails;
}
