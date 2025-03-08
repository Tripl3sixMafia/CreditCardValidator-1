import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Only minimal API routes needed for this app
  // We'll add a validation endpoint that could be expanded for server-side validation later
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Validate card endpoint - server-side validation if needed
  app.post('/api/validate-card', (req, res) => {
    // For now, we just acknowledge the request since validation happens client-side
    // In a real app, this might connect to a payment processor for BIN validation
    res.json({ received: true });
  });

  const httpServer = createServer(app);

  return httpServer;
}
