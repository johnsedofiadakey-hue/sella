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

export const fulfillmentTypeEnum = pgEnum("fulfillment_type", ["pickup", "delivery"]);

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
  slug: text("slug").notNull(), // businessname.shoplocal.app
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
