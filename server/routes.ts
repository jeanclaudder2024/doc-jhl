import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // === ADMIN ROUTES (Protected) ===

  app.get(api.proposals.list.path, isAuthenticated, async (req, res) => {
    const proposals = await storage.getProposals();
    res.json(proposals);
  });

  app.get(api.proposals.get.path, isAuthenticated, async (req, res) => {
    const proposal = await storage.getProposal(Number(req.params.id));
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }
    res.json(proposal);
  });

  app.post(api.proposals.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.proposals.create.input.parse(req.body);
      const proposal = await storage.createProposal(input);
      res.status(201).json(proposal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.proposals.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.proposals.update.input.parse(req.body);
      const proposal = await storage.updateProposal(Number(req.params.id), input);
      res.json(proposal);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      // Handle not found/other errors
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.proposals.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteProposal(Number(req.params.id));
    res.status(204).send();
  });

  // === PUBLIC ROUTES ===

  app.get(api.proposals.getByToken.path, async (req, res) => {
    const proposal = await storage.getPublicProposal(Number(req.params.id));
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }
    res.json(proposal);
  });

  app.post(api.proposals.sign.path, async (req, res) => {
    try {
       const { role, signature } = api.proposals.sign.input.parse(req.body);
       const proposal = await storage.signProposal(Number(req.params.id), role, signature);
       res.json(proposal);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed Data (optional, can be called manually or on startup check)
  // For now, let's just leave it available or auto-seed on first run in index.ts if desired.

  return httpServer;
}

export async function seedDatabase() {
  const existing = await storage.getProposals();
  if (existing.length === 0) {
    console.log("Seeding database...");
    await storage.createProposal({
      clientName: "JHL",
      title: "Service Agreement & Project Deliverables (Noviq ↔ JHL)",
      totalDevelopmentFee: 900,
      domainPackageFee: 0,
      paymentOption: "milestone",
      items: [
        { title: "Product Modules", description: "Core functionality implementation." },
        { title: "Intelligence", description: "AI integration and data analysis." },
        { title: "Admin Panel", description: "Dashboard for management." },
        { title: "Donation Gateway", description: "Payment processing integration." }
      ]
    });
    console.log("Seeding complete.");
  }
}
