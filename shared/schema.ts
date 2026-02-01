import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

// === PROPOSALS ===
export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  title: text("title").notNull().default("Service Agreement & Project Deliverables"),
  status: text("status", { enum: ["draft", "sent", "signed"] }).notNull().default("draft"),
  
  // Financials
  totalDevelopmentFee: decimal("total_development_fee").notNull().default("900"),
  domainPackageFee: decimal("domain_package_fee").default("0"),
  
  // Payment Structure
  paymentOption: text("payment_option", { enum: ["milestone", "installment", "custom"] }).notNull().default("milestone"),
  paymentTerms: jsonb("payment_terms").$type<{
    upfrontPercent: number;
    installments?: number;
    feeOnFull?: boolean;
    baseFee?: number;
  }>(),

  // Signatures
  noviqSignature: text("noviq_signature"), // Data URI or URL
  noviqSignDate: timestamp("noviq_sign_date"),
  licenseeSignature: text("licensee_signature"), // Data URI or URL
  licenseeSignDate: timestamp("licensee_sign_date"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proposalItems = pgTable("proposal_items", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
});

// === RELATIONS ===
export const proposalsRelations = relations(proposals, ({ many }) => ({
  items: many(proposalItems),
}));

export const proposalItemsRelations = relations(proposalItems, ({ one }) => ({
  proposal: one(proposals, {
    fields: [proposalItems.proposalId],
    references: [proposals.id],
  }),
}));

// === SCHEMAS ===
export const insertProposalSchema = createInsertSchema(proposals).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  paymentTerms: z.object({
    upfrontPercent: z.number().min(10).max(100),
    installments: z.number().nullable().optional(),
    feeOnFull: z.boolean().nullable().optional(),
    baseFee: z.number().nullable().optional(),
  }).nullable().optional(),
  totalDevelopmentFee: z.number().or(z.string()),
  domainPackageFee: z.number().or(z.string()).nullable().optional(),
});

export const insertProposalItemSchema = createInsertSchema(proposalItems).omit({ id: true });

// === TYPES ===
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type ProposalItem = typeof proposalItems.$inferSelect;
export type InsertProposalItem = z.infer<typeof insertProposalItemSchema>;

export type CreateProposalRequest = InsertProposal & {
  items?: InsertProposalItem[];
};

export type UpdateProposalRequest = Partial<InsertProposal> & {
  items?: (InsertProposalItem & { id?: number })[];
};

export type ProposalResponse = Proposal & {
  items: ProposalItem[];
};
