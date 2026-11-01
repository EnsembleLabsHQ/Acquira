/**
 * Acquira Marketplace Integration Interface Contract
 * 
 * Defines the contract that all shopping source adapters must satisfy.
 * Ensures marketplace providers and LLMs can be swapped without touching core purchasing logic.
 */

export type CapabilityStatus = 'verified' | 'unverified' | 'unavailable' | 'pending-verification';

export interface ProviderCapabilityRecord {
  provider_id: string;
  provider_name: string;
  capability: 'search' | 'cart' | 'checkout' | 'payment' | 'tracking';
  status: CapabilityStatus;
  evidence_source: string;
  verification_date: string; // ISO YYYY-MM-DD
  limitations?: string[];
}

/**
 * Cost availability status.
 * CRITICAL RULE: Unknown or unavailable cost components MUST NEVER be silently treated as zero.
 */
export type CostAvailabilityStatus = 'KNOWN' | 'ESTIMATED' | 'UNAVAILABLE';

export interface CostComponent {
  amount?: number; // Present only if KNOWN or ESTIMATED; undefined if UNAVAILABLE
  status: CostAvailabilityStatus;
  description?: string; // e.g., "Free delivery over ₹499", "Estimated standard GST", "Convenience fee"
}

export interface ItemizedCostStructure {
  base_price_inr: number; // Base product price (must be KNOWN to evaluate offer)
  shipping: CostComponent;
  taxes: CostComponent;
  platform_fees: CostComponent; // Explicit platform/handling/convenience fee
  
  /**
   * Calculated total payable amount (base + known/estimated shipping + taxes + fees).
   * If any component is UNAVAILABLE, this represents the minimum confirmed lower bound,
   * and `has_unavailable_costs` MUST be true.
   */
  total_payable_inr?: number;
  has_unavailable_costs: boolean;
  unavailable_components: ('shipping' | 'taxes' | 'platform_fees')[];
  cost_disclosures: string[]; // Plain-language disclosures of estimated or unavailable charges
}

export interface RawSearchQuery {
  category: string;
  keywords: string[];
  budget_max_inr?: number;
  specifications?: Record<string, string | number | boolean>;
}

export interface RawProductOffer {
  provider_id: string;
  provider_item_id: string; // Provider's public catalog reference (e.g. ASIN, FSN)
  canonical_seller_id: string; // Unique merchant/seller ID (independent of display name)
  canonical_variant_sku: string; // Specific variant SKU/model (independent of product title)
  title: string;
  product_url: string;
  seller_name: string; // Display name for UI presentation
  seller_rating?: number;
  cost: ItemizedCostStructure;
  raw_specifications: Record<string, unknown>;
  retrieved_at: string; // ISO 8601 timestamp
  is_stale?: boolean;
}

export interface SafeHandoffDetails {
  provider_id: string;
  direct_product_url: string;
  product_title: string;
  seller_name: string;
  canonical_seller_id: string;
  canonical_variant_sku: string;
  last_observed_cost: ItemizedCostStructure;
  manual_purchase_instructions: string[];
}

/**
 * Canonical offer fingerprint payload for tamper-proof authorization.
 *
 * Canonical Serialization Standard:
 * 1. Field order: provider_id, canonical_seller_id, canonical_variant_sku, quantity
 * 2. Normalization: String components are trimmed and URL-percent-encoded (encodeURIComponent)
 *    to prevent delimiter collisions or parameter ambiguity.
 *    Quantity is represented as a base-10 positive integer string without leading zeros.
 * 3. Serialization payload:
 *    `${encodeURIComponent(provider_id.trim())}:${encodeURIComponent(canonical_seller_id.trim())}:${encodeURIComponent(canonical_variant_sku.trim())}:${quantity}`
 * 4. Hash Algorithm: SHA-256 over UTF-8 bytes of the canonical payload, output as a 64-character lowercase hexadecimal string.
 */
export interface CanonicalOfferIdentity {
  provider_id: string;
  canonical_seller_id: string;
  canonical_variant_sku: string;
  quantity: number;
}

export type OrderExecutionMode = 'SIMULATED' | 'LIVE_PROVIDER' | 'MANUAL_HANDOFF';

export interface CheckoutRequest {
  idempotency_key: string;
  candidate_id: string;
  canonical_identity: CanonicalOfferIdentity;
  authorized_baseline_inr: number;
  expected_cost: ItemizedCostStructure;
  order_execution_mode: OrderExecutionMode;
  payment_execution_mode: 'SIMULATED' | 'LIVE_PROVIDER' | 'MANUAL_HANDOFF';
  payment_id: string;
  payment_reference: string;
}

export interface AuthoritativeCheckoutResult {
  success: boolean;
  provider_order_id?: string;
  order_execution_mode: OrderExecutionMode;
  is_demo_order: boolean; // True if SIMULATED
  final_charged_amount_inr?: number;
  final_cost_breakdown?: ItemizedCostStructure;
  timestamp: string;
  status: 'CONFIRMED' | 'FAILED' | 'TIMED_OUT' | 'UNCERTAIN';
  failure_reason?: string;
}

export interface OrderStatusResult {
  provider_order_id: string;
  current_status: 'ORDER_PLACED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'UNKNOWN';
  estimated_delivery_date?: string;
  tracking_url?: string;
  last_updated_at: string;
}

/**
 * Common Marketplace Adapter Interface
 */
export interface MarketplaceAdapter {
  readonly providerId: string;
  readonly providerName: string;

  /**
   * Search marketplace for matching products (Requires verified 'search' capability)
   */
  search(query: RawSearchQuery): Promise<RawProductOffer[]>;

  /**
   * Fetch real-time offer details to revalidate price, costs, and canonical identity before purchase
   */
  getOfferDetails(providerItemId: string, variantSku?: string): Promise<RawProductOffer>;

  /**
   * Generate safe provider handoff when direct checkout is unavailable or unverified
   */
  generateHandoff(offer: RawProductOffer): SafeHandoffDetails;

  /**
   * Programmatic checkout (Permitted ONLY if 'checkout' & 'payment' are verified)
   */
  checkout?(request: CheckoutRequest): Promise<AuthoritativeCheckoutResult>;

  /**
   * Reconcile an ambiguous or timed-out transaction without retrying payment
   */
  reconcileCheckout?(idempotencyKey: string, providerOrderId?: string): Promise<AuthoritativeCheckoutResult>;

  /**
   * Post-purchase tracking (Permitted ONLY if 'tracking' is verified)
   */
  trackOrder?(providerOrderId: string): Promise<OrderStatusResult>;
}
