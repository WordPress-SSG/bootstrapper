import { Router, Request, Response } from "express";
import { SiteService } from "../Services/SiteService";

const siteRouter = Router();
const siteService = new SiteService();

// Define routes
siteRouter.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the API!" });
});

siteRouter.get("/status", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

siteRouter.post("/createSite", async (req: Request, res: Response) => {
  try {
    const siteData = req.body;
    const newSite = await siteService.createSite(siteData);
    res.status(201).json(newSite);
  } catch (error) {
    res.status(500).json({ error: "Failed to create site", details: (error as Error).message });
  }
});

export default siteRouter;
