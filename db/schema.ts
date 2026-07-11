import { nanoid } from "nanoid";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = (name = "id") => text(name).primaryKey().$defaultFn(() => nanoid());

// ---- Enums -----------------------------------------------------------
// Eight launch verticals from Part 1 §4, plus laundry/home-services from Part 2 §4.
export const tenantCategoryEnum = pgEnum("tenant_category", [
  "general_retail",
  "fashion",
  "food",
  "automobile",
  "groceries",
  "electronics",
  "beauty_services",
  "digital_products",
  "laundry",
]);

// Tiers per Part 3 §1 (supersedes Part 1's fee-based tiers).
export const tenantTierEnum = pgEnum("tenant_tier", ["starter", "growth", "pro"]);

// Store lifecycle per Part 2 §7 (Tenants module) and Part 3 §1 trial mechanics.
export const tenantStatusEnum = pgEnum("tenant_status", [
  "onboarding",
  "trial",
  "active",
  "paused",
  "suspended",
  "closed",
]);

// Staff roles per Part 2 §8.
export const memberRoleEnum = pgEnum("member_role", ["owner", "manager", "cashier"]);

// Order pipeline per Part 4 §2 (delivery Phase 1 status pipeline, generalised).
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "disputed",
]);

// "instant" is Digital Products & Courses (Part 1 §4) — payment triggers a
// download link, never a rider or a pickup slot.
export const fulfillmentTypeEnum = pgEnum("fulfillment_type", ["pickup", "delivery", "instant"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

// Billing state per Part 3 §1 (30-day trial, MoMo subscription) and Part 4 §3.3 dunning.
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "paused",
  "cancelled",
]);

// Tiered verification per Part 2 §3.
export const kycDocTypeEnum = pgEnum("kyc_doc_type", [
  "ghana_card",
  "momo_match",
  "business_registration",
]);

export const kycStatusEnum = pgEnum("kyc_status", ["pending", "approved", "rejected"]);

export const otpPurposeEnum = pgEnum("otp_purpose", ["signup", "login"]);

// Order-dispute flow per Part 2 §6 — "basic disputes" scope from Part 4's
// MVP cut (payment disputes via Paystack chargebacks and platform disputes
// are out of scope here; both need infrastructure that doesn't exist yet).
export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "escalated",
  "resolved_refund",
  "resolved_replacement",
  "resolved_rejected",
]);

export const disputeReasonEnum = pgEnum("dispute_reason", [
  "not_received",
  "not_as_described",
  "wrong_item",
  "refund_refused",
  "other",
]);

// Automobile's buying flow per Part 1 §4: "enquiry & lead-gen, not cart."
// A lead never becomes an order — there's no payment or fulfillment to track.
export const enquiryStatusEnum = pgEnum("enquiry_status", ["new", "contacted", "closed"]);

// Beauty, Salon & Services per Part 1 §4: "booking, not shipping." Kept
// separate from orders for the same reason enquiries are — no cart, no
// delivery, a different lifecycle (requested → confirmed → completed).
export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
]);

// ---- Users & auth ------------------------------------------------------
// Phone is the identity anchor (Part 2 §8) — email is never required.
export const users = pgTable("users", {
  id: id(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash"),
  // Gates access to Mission Control (Part 2 §7). No invite UI yet — set by
  // hand until there's an actual team beyond the founder to manage RBAC for.
  isStaff: boolean("is_staff").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("users_phone_idx").on(t.phone)]);

export const otpCodes = pgTable("otp_codes", {
  id: id(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: otpPurposeEnum("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  // Brute-force throttle — a 6-digit code is only 900,000 possibilities,
  // guessable within its 5-minute TTL without this. lib/otp.ts locks the
  // code out after 5 failed attempts.
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("otp_codes_phone_idx").on(t.phone)]);

export const sessions = pgTable("sessions", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("sessions_token_idx").on(t.tokenHash)]);

// ---- Tenants (stores) ---------------------------------------------------
// One row per storefront. tenant_id is the multi-tenant key referenced by
// every table below it, per Part 3 §2's "tenant_id on every row" rule.
export const tenants = pgTable("tenants", {
  id: id(),
  slug: text("slug").notNull(), // businessname.sella.app
  businessName: text("business_name").notNull(),
  category: tenantCategoryEnum("category").notNull(),
  tier: tenantTierEnum("tier").notNull().default("starter"),
  status: tenantStatusEnum("status").notNull().default("onboarding"),
  ownerPhone: text("owner_phone").notNull(),
  customDomain: text("custom_domain"),
  // Storefront theme tokens — the only two colours a merchant can set (Part 6 §2.3).
  themePrimaryColor: text("theme_primary_color"),
  themeAccentColor: text("theme_accent_color"),
  logoUrl: text("logo_url"),
  // Set once the merchant links payout details (lib/paystack.ts createSubaccount).
  // Presence gates whether Paystack checkout is offered for this store at all —
  // StormGlide must never hold merchant money (Part 2 §2).
  paystackSubaccountCode: text("paystack_subaccount_code"),
  kycLevel: integer("kyc_level").notNull().default(0), // 0 phone, 1 identity, 2 business (Part 2 §3)
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("tenants_slug_idx").on(t.slug),
  uniqueIndex("tenants_custom_domain_idx").on(t.customDomain),
]);

// Staff access per tenant — Cashier / Manager / Owner (Part 2 §8).
export const tenantMembers = pgTable("tenant_members", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("tenant_members_tenant_user_idx").on(t.tenantId, t.userId)]);

// ---- Catalogue -----------------------------------------------------------
export const products = pgTable("products", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  // Vertical-specific fields (variants, spec tables, service duration, etc.)
  // live here rather than as columns, per Part 6 §3's token/config-not-fork rule.
  attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
  stock: integer("stock"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("products_tenant_idx").on(t.tenantId)]);

// ---- Orders ----------------------------------------------------------
export const orders = pgTable("orders", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  fulfillmentType: fulfillmentTypeEnum("fulfillment_type").notNull(),
  // Landmark-based addressing per Part 4 §2 — Ghanaian addresses are landmarks, not street numbers.
  deliveryArea: text("delivery_area"),
  deliveryLandmark: text("delivery_landmark"),
  deliveryGpsCode: text("delivery_gps_code"),
  totalCents: integer("total_cents").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  paymentReference: text("payment_reference"),
  // Proof-of-delivery OTP — the evidence backbone for disputes (Part 4 §2).
  deliveryOtpHash: text("delivery_otp_hash"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  riderName: text("rider_name"),
  riderPhone: text("rider_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("orders_tenant_idx").on(t.tenantId),
  index("orders_tenant_status_idx").on(t.tenantId, t.status),
]);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  // Snapshotted at purchase time so later product edits never rewrite history.
  nameSnapshot: text("name_snapshot").notNull(),
  priceCentsSnapshot: integer("price_cents_snapshot").notNull(),
  quantity: integer("quantity").notNull().default(1),
  variant: jsonb("variant").$type<Record<string, unknown>>().notNull().default({}),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

// ---- Rider book -----------------------------------------------------------
// Part 2 §4 / Part 4 §2: the merchant saves a rider's name and phone once,
// then assigns with one tap on any later order, instead of retyping it
// every time (which is all assignRider did before this table existed).
export const riders = pgTable("riders", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("riders_tenant_idx").on(t.tenantId),
  uniqueIndex("riders_tenant_phone_idx").on(t.tenantId, t.phone),
]);

// ---- Automobile enquiries -------------------------------------------------
// Part 1 §4: listings, not a cart. A buyer leaves contact details against a
// listing; nothing here ever touches payments or fulfillment.
export const enquiries = pgTable("enquiries", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  message: text("message"),
  status: enquiryStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("enquiries_tenant_idx").on(t.tenantId)]);

// ---- Beauty/Services bookings ----------------------------------------------
// Part 1 §4: booking, not shipping. Deliberately no staff-selection or
// deposit-collection columns yet (Part 1 lists both as template features) —
// those need a calendar/slot-capacity model this cut doesn't build; a
// single requested time per booking is the v1 scope.
export const bookings = pgTable("bookings", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  status: bookingStatusEnum("status").notNull().default("requested"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("bookings_tenant_idx").on(t.tenantId)]);

// ---- Store visits (self-hosted analytics) ---------------------------------
// Part 3 §2 calls for self-hosted Plausible/Umami so merchants see visit
// stats without a per-event bill. Standing up a separate analytics service
// is out of scope for this cut, but the number merchants actually care
// about (Part 3 §1: "your store had 214 visits and 9 orders this month")
// only needs a row per storefront view — same "real, checkable, no
// external dependency" rule lib/metrics.ts already follows.
export const storeVisits = pgTable("store_visits", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("store_visits_tenant_idx").on(t.tenantId, t.createdAt)]);

// ---- Rate limiting ---------------------------------------------------------
// A generic "N hits per window per key" counter — no Redis in this stack
// (Part 3 §2's Redis+BullMQ line is for background jobs, not provisioned
// yet), so this is the boring Postgres equivalent. lib/rate-limit.ts owns
// the key format and does its own opportunistic cleanup of old rows.
export const rateLimitHits = pgTable("rate_limit_hits", {
  id: id(),
  key: text("key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("rate_limit_hits_key_idx").on(t.key, t.createdAt)]);

// Buyer opens with reason + description; merchant has 48h (respondByAt) to
// resolve directly or contest — contesting (or letting the clock run out)
// escalates to Mission Control's queue. "Escalated" is also computed
// lazily wherever respondByAt has passed, same pattern as billing phases —
// no cron flips this row, the read path just treats it as overdue.
export const disputes = pgTable("disputes", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  reason: disputeReasonEnum("reason").notNull(),
  description: text("description").notNull(),
  status: disputeStatusEnum("status").notNull().default("open"),
  merchantResponse: text("merchant_response"),
  merchantRespondedAt: timestamp("merchant_responded_at", { withTimezone: true }),
  resolution: text("resolution"),
  resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  respondByAt: timestamp("respond_by_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("disputes_tenant_idx").on(t.tenantId),
  index("disputes_order_idx").on(t.orderId),
]);

// ---- Billing -----------------------------------------------------------
// One active row per tenant; 30-day trial then MoMo subscription (Part 3 §1, Part 4 §3.3).
export const subscriptions = pgTable("subscriptions", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  tier: tenantTierEnum("tier").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  momoReference: text("momo_reference"),
  dunningAttempts: integer("dunning_attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("subscriptions_tenant_idx").on(t.tenantId)]);

// ---- KYC -----------------------------------------------------------------
export const kycDocuments = pgTable("kyc_documents", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  type: kycDocTypeEnum("type").notNull(),
  status: kycStatusEnum("status").notNull().default("pending"),
  fileUrl: text("file_url"),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("kyc_documents_tenant_idx").on(t.tenantId)]);

export type Tenant = typeof tenants.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type Dispute = typeof disputes.$inferSelect;
export type Rider = typeof riders.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
