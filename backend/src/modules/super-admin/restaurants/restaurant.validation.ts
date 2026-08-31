import { z } from "zod";
import { paginationSchema } from "../../../common/pagination/pagination.schema.js";
import {
  indianPhoneSchema,
  moneySchema,
  optionalIndianPhoneSchema,
  requiredNameSchema,
} from "../../../common/validation/common-schemas.js";

export const listRestaurantsSchema = paginationSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED", "ARCHIVED"]).optional(),
  subscriptionStatus: z.enum(["ACTIVE", "TRIAL", "EXPIRED", "CANCELLED", "SUSPENDED", "PENDING"]).optional(),
  licenseStatus: z.enum(["ACTIVE", "EXPIRED", "SUSPENDED", "BLOCKED", "CANCELLED", "REVOKED"]).optional(),
  city: z.string().optional(),
});

const flatCreateRestaurantSchema = z.object({
  restaurantName: requiredNameSchema,
  restaurantCode: z.string().min(2).max(64).optional(),
  ownerName: requiredNameSchema,
  email: z.string().trim().toLowerCase().email().max(254),
  phone: indianPhoneSchema,
  alternatePhone: optionalIndianPhoneSchema,
  address: z.string().trim().max(500).optional(),
  addressLine1: z.string().trim().max(250).optional(),
  addressLine2: z.string().trim().max(250).optional(),
  city: requiredNameSchema,
  state: requiredNameSchema,
  country: requiredNameSchema,
  postalCode: z.string().trim().min(2).max(16),
  taxNumber: z.string().trim().max(64).optional(),
  businessType: z.enum(["RESTAURANT", "CAFE", "HOTEL", "CLOUD_KITCHEN", "BAKERY", "FAST_FOOD", "BAR", "OTHER"]),
  cuisineType: z.string().max(80).optional(),
  timezone: z.string().min(3).max(64),
  currency: z.string().min(3).max(8),
  logo: z.string().optional(),
  website: z.string().url().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"]).optional(),
  adminName: requiredNameSchema,
  adminEmail: z.string().trim().toLowerCase().email().max(254),
  adminLoginEmail: z.string().trim().toLowerCase().email().max(254).optional(),
  adminPhone: optionalIndianPhoneSchema,
  adminInitialPassword: z.string().min(8).max(128),
  adminConfirmPassword: z.string().min(8).max(128).optional(),
  planType: z.enum(["PREDEFINED", "CUSTOMIZED"]).default("PREDEFINED"),
  planId: z.string().uuid().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  customPrice: moneySchema.optional(),
  price: moneySchema.optional(),
  customPlan: z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional(),
    basePrice: moneySchema,
    gstPercentage: z.coerce.number().finite().min(0).max(28).default(18),
    waiterLimit: z.coerce.number().int().positive().max(500),
    kitchenLimit: z.coerce.number().int().positive().max(500),
    receptionistLimit: z.coerce.number().int().positive().max(500),
    staffLimit: z.coerce.number().int().positive().max(1500).optional(),
    features: z.array(z.string().trim().min(1).max(80)).default([]),
  }).optional(),
  startDate: z.coerce.date(),
  durationMonths: z.coerce.number().int().positive().max(120).optional(),
  expiryDate: z.coerce.date().optional(),  renewalDate: z.coerce.date().optional(),
  licenseStatus: z.enum(["ACTIVE", "EXPIRED", "SUSPENDED", "BLOCKED", "CANCELLED", "REVOKED"]).optional(),
});

const restaurantPayloadSchema = z.object({
    name: requiredNameSchema,
    email: z.string().trim().toLowerCase().email().max(254),
    phone: indianPhoneSchema,
    alternatePhone: optionalIndianPhoneSchema,
    address: z.string().trim().max(500).optional(),
    addressLine1: z.string().trim().max(250).optional(),
    addressLine2: z.string().trim().max(250).optional(),
    city: requiredNameSchema,
    state: requiredNameSchema,
    country: requiredNameSchema,
    postalCode: z.string().trim().min(2).max(16),
    taxNumber: z.string().trim().max(64).optional(),
    businessType: z.enum(["RESTAURANT", "CAFE", "HOTEL", "CLOUD_KITCHEN", "BAKERY", "FAST_FOOD", "BAR", "OTHER"]),
    cuisineType: z.string().max(80).optional(),
    timezone: z.string().min(3).max(64),
    currency: z.string().min(3).max(8),
    logo: z.string().optional(),
    website: z.string().url().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"]).optional(),
  }).superRefine((input, context) => {
    if (!input.address && !input.addressLine1) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Restaurant address is required" });
    }
  });

const accountPayloadSchema = z.object({
    name: requiredNameSchema,
    email: z.string().trim().toLowerCase().email().max(254),
    loginEmail: z.string().trim().toLowerCase().email().max(254).optional(),
    phone: optionalIndianPhoneSchema,
    password: z.string().min(8).max(128).optional(),
    loginPassword: z.string().min(8).max(128).optional(),
    confirmPassword: z.string().min(8).max(128).optional(),
  });

const subscriptionPayloadSchema = z.object({
    planType: z.enum(["PREDEFINED", "CUSTOMIZED"]).default("PREDEFINED"),
    planId: z.string().uuid().optional(),
    billingCycle: z.enum(["MONTHLY", "YEARLY"]),
    customPrice: moneySchema.optional(),
    price: moneySchema.optional(),
    currency: z.string().min(3).max(8).optional(),
    startDate: z.coerce.date(),
    durationMonths: z.coerce.number().int().positive().max(120).optional(),
    endDate: z.coerce.date().optional(),
    renewalDate: z.coerce.date().optional(),
    customPlan: z.object({
      name: z.string().trim().min(2).max(120),
      description: z.string().trim().max(500).optional(),
      basePrice: moneySchema,
      gstPercentage: z.coerce.number().finite().min(0).max(28).default(18),
      waiterLimit: z.coerce.number().int().positive().max(500),
      kitchenLimit: z.coerce.number().int().positive().max(500),
      receptionistLimit: z.coerce.number().int().positive().max(500),
      staffLimit: z.coerce.number().int().positive().max(1500).optional(),
      features: z.array(z.string().trim().min(1).max(80)).default([]),
    }).optional(),
  });

const licensePayloadSchema = z.object({
    startDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    renewalDate: z.coerce.date().optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "SUSPENDED", "BLOCKED", "CANCELLED", "REVOKED"]).optional(),
  });

const structuredCreateRestaurantSchema = z.object({
  restaurant: restaurantPayloadSchema,
  owner: accountPayloadSchema,
  subscription: subscriptionPayloadSchema,
  license: licensePayloadSchema.optional(),
});

const structuredCreateRestaurantWithAdminSchema = z.object({
  restaurant: restaurantPayloadSchema,
  admin: accountPayloadSchema,
  subscription: subscriptionPayloadSchema,
  license: licensePayloadSchema.optional(),
});

export const createRestaurantSchema = z.union([flatCreateRestaurantSchema, structuredCreateRestaurantSchema, structuredCreateRestaurantWithAdminSchema]).transform((input) => {
  if ("restaurant" in input) {
    const account = "admin" in input ? input.admin : input.owner;
    const loginPassword = account.loginPassword ?? account.password;
    return {
      restaurantName: input.restaurant.name,
      ownerName: account.name,
      email: input.restaurant.email,
      phone: input.restaurant.phone,
      alternatePhone: input.restaurant.alternatePhone,
      address: input.restaurant.address,
      addressLine1: input.restaurant.addressLine1 ?? input.restaurant.address,
      addressLine2: input.restaurant.addressLine2,
      city: input.restaurant.city,
      state: input.restaurant.state,
      country: input.restaurant.country,
      postalCode: input.restaurant.postalCode,
      taxNumber: input.restaurant.taxNumber,
      businessType: input.restaurant.businessType,
      cuisineType: input.restaurant.cuisineType,
      timezone: input.restaurant.timezone,
      currency: input.restaurant.currency ?? input.subscription.currency,
      logo: input.restaurant.logo,
      website: input.restaurant.website,
      status: input.restaurant.status,
      adminName: account.name,
      adminEmail: account.loginEmail ?? account.email,
      adminLoginEmail: account.loginEmail,
      adminPhone: account.phone,
      adminInitialPassword: loginPassword,
      adminConfirmPassword: account.confirmPassword,
      planId: input.subscription.planId,
      billingCycle: input.subscription.billingCycle,
      customPrice: input.subscription.customPrice ?? input.subscription.price,
      startDate: input.subscription.startDate,
      durationMonths: input.subscription.durationMonths,
      expiryDate: input.license?.expiryDate ?? input.subscription.endDate,
      renewalDate: input.license?.renewalDate ?? input.subscription.renewalDate,
      licenseStatus: input.license?.status,
      planType: input.subscription.planType,
      customPlan: input.subscription.customPlan,
    };
  }

  return input;
}).superRefine((input, context) => {
  if (!input.address && !input.addressLine1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["restaurant", "address"], message: "Restaurant address is required" });
  }
  if (!input.adminInitialPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["owner", "loginPassword"], message: "Login password is required" });
  }
  if (input.adminConfirmPassword && input.adminInitialPassword !== input.adminConfirmPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["owner", "confirmPassword"], message: "Passwords do not match" });
  }
  if (input.planType === "PREDEFINED" && !input.planId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["subscription", "planId"], message: "Select an active predefined plan" });
  }
  if (input.planType === "CUSTOMIZED" && !input.customPlan) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["subscription", "customPlan"], message: "Custom plan details are required" });
  }
});

export const updateRestaurantSchema = flatCreateRestaurantSchema
  .pick({
    restaurantName: true,
    restaurantCode: true,
    ownerName: true,
    email: true,
    phone: true,
    alternatePhone: true,
    address: true,
    addressLine1: true,
    addressLine2: true,
    city: true,
    state: true,
    country: true,
    postalCode: true,
    taxNumber: true,
    businessType: true,
    cuisineType: true,
    timezone: true,
    currency: true,
    logo: true,
    website: true,
  })
  .partial();

export const restaurantStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED", "ARCHIVED"]),
});
