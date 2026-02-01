import { db } from "./db";
import {
  proposals,
  proposalItems,
  type Proposal,
  type InsertProposal,
  type ProposalItem,
  type InsertProposalItem,
  type CreateProposalRequest,
  type UpdateProposalRequest,
  type ProposalResponse,
  users,
  type User
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth";

export interface IStorage {
  // Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Proposals
  getProposals(): Promise<ProposalResponse[]>;
  getProposal(id: number): Promise<ProposalResponse | undefined>;
  createProposal(proposal: CreateProposalRequest): Promise<ProposalResponse>;
  updateProposal(id: number, updates: UpdateProposalRequest): Promise<ProposalResponse>;
  deleteProposal(id: number): Promise<void>;
  
  // Public
  getPublicProposal(id: number): Promise<ProposalResponse | undefined>;
  signProposal(id: number, role: 'noviq' | 'licensee', signature: string): Promise<ProposalResponse>;
}

export class DatabaseStorage implements IStorage {
  // Auth methods delegated to authStorage where appropriate or implemented here
  async getUser(id: string): Promise<User | undefined> {
    return authStorage.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  // Proposals
  async getProposals(): Promise<ProposalResponse[]> {
    const allProposals = await db.select().from(proposals).orderBy(desc(proposals.createdAt));
    const result: ProposalResponse[] = [];

    for (const p of allProposals) {
      const items = await db.select().from(proposalItems).where(eq(proposalItems.proposalId, p.id)).orderBy(proposalItems.order);
      result.push({ ...p, items });
    }
    return result;
  }

  async getProposal(id: number): Promise<ProposalResponse | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    if (!proposal) return undefined;

    const items = await db.select().from(proposalItems).where(eq(proposalItems.proposalId, id)).orderBy(proposalItems.order);
    return { ...proposal, items };
  }

  async createProposal(req: CreateProposalRequest): Promise<ProposalResponse> {
    const { items, ...proposalData } = req;
    
    // Ensure decimal fields are strings
    const dataToInsert = {
      ...proposalData,
      totalDevelopmentFee: String(proposalData.totalDevelopmentFee),
      domainPackageFee: proposalData.domainPackageFee ? String(proposalData.domainPackageFee) : "0",
    };

    const [proposal] = await db.insert(proposals).values(dataToInsert).returning();

    const createdItems: ProposalItem[] = [];
    if (items && items.length > 0) {
      const itemsWithId = items.map((item, index) => ({
        ...item,
        proposalId: proposal.id,
        order: item.order ?? index,
      }));
      const inserted = await db.insert(proposalItems).values(itemsWithId).returning();
      createdItems.push(...inserted);
    }

    return { ...proposal, items: createdItems };
  }

  async updateProposal(id: number, updates: UpdateProposalRequest): Promise<ProposalResponse> {
    const { items, ...proposalUpdates } = updates;

    // Handle Proposal Updates
    let updatedProposal: Proposal | undefined;
    if (Object.keys(proposalUpdates).length > 0) {
      // Ensure decimal fields are strings if present
      const dataToUpdate: any = { ...proposalUpdates };
      if (dataToUpdate.totalDevelopmentFee !== undefined) {
        dataToUpdate.totalDevelopmentFee = String(dataToUpdate.totalDevelopmentFee);
      }
      if (dataToUpdate.domainPackageFee !== undefined) {
        dataToUpdate.domainPackageFee = String(dataToUpdate.domainPackageFee);
      }

      const [res] = await db.update(proposals)
        .set({ ...dataToUpdate, updatedAt: new Date() })
        .where(eq(proposals.id, id))
        .returning();
      updatedProposal = res;
    } else {
      const [res] = await db.select().from(proposals).where(eq(proposals.id, id));
      updatedProposal = res;
    }

    if (!updatedProposal) throw new Error("Proposal not found");

    // Handle Items Updates
    if (items) {
      // Delete existing items for simplicity in this MVP approach or handle strict updates
      // Better approach: Upsert or Delete + Insert.
      // For now, let's keep it simple: Delete all and re-insert if items provided (FULL replace for items list)
      // OR handle ID based updates.
      // Let's do: Update existing ones with IDs, Insert new ones without IDs.
      // But we need to handle deletions too.
      // The simplest robust way for "document" style editing is often:
      
      // 1. Get existing item IDs
      const existingItems = await db.select().from(proposalItems).where(eq(proposalItems.proposalId, id));
      const existingIds = new Set(existingItems.map(i => i.id));
      
      const keptIds = new Set<number>();
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id && existingIds.has(item.id)) {
          // Update
          await db.update(proposalItems)
            .set({ ...item, order: i })
            .where(eq(proposalItems.id, item.id));
          keptIds.add(item.id);
        } else {
          // Insert
          await db.insert(proposalItems).values({
            proposalId: id,
            title: item.title,
            description: item.description,
            order: i,
          });
        }
      }

      // Delete removed items
      const idsToDelete = [...existingIds].filter(id => !keptIds.has(id));
      if (idsToDelete.length > 0) {
        // drizzle doesn't support whereIn with array easily in all versions, iterate
        for (const delId of idsToDelete) {
          await db.delete(proposalItems).where(eq(proposalItems.id, delId));
        }
      }
    }

    const finalItems = await db.select().from(proposalItems).where(eq(proposalItems.proposalId, id)).orderBy(proposalItems.order);
    return { ...updatedProposal, items: finalItems };
  }

  async deleteProposal(id: number): Promise<void> {
    await db.delete(proposalItems).where(eq(proposalItems.proposalId, id));
    await db.delete(proposals).where(eq(proposals.id, id));
  }

  async getPublicProposal(id: number): Promise<ProposalResponse | undefined> {
    // Logic could be same as getProposal
    return this.getProposal(id);
  }

  async signProposal(id: number, role: 'noviq' | 'licensee', signature: string): Promise<ProposalResponse> {
    const updateData: Partial<Proposal> = {};
    if (role === 'noviq') {
      updateData.noviqSignature = signature;
      updateData.noviqSignDate = new Date();
    } else {
      updateData.licenseeSignature = signature;
      updateData.licenseeSignDate = new Date();
    }

    const [updated] = await db.update(proposals)
      .set(updateData)
      .where(eq(proposals.id, id))
      .returning();
      
    // Check if both signed to update status
    if (updated.noviqSignature && updated.licenseeSignature && updated.status !== 'signed') {
       await db.update(proposals).set({ status: 'signed' }).where(eq(proposals.id, id));
    }

    return this.getProposal(id) as Promise<ProposalResponse>;
  }
}

export const storage = new DatabaseStorage();
