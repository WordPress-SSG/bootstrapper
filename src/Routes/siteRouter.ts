import { Router, Request, Response } from "express";
import { SiteService } from "../Services/SiteService.js";

const siteRouter = Router();
const siteService = new SiteService();

// Define routes
siteRouter.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the API!" });
});

siteRouter.get("/status", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

siteRouter.post("/sites/create", async (req: Request, res: Response) => {
  try {
    const siteData = req.body;
    const newSite = await siteService.create(siteData);
    res.status(201).json(newSite);
  } catch (error) {
    res.status(500).json({ error: "Failed to create site", details: (error as Error).message });
  }
});

siteRouter.post("/sites/build-publish", async (req: Request, res: Response) => {
  try {
    const siteData = req.body;
    let newSite = await siteService.buildAndDeploy(siteData.domain, 'wp');

    res.status(201).json(newSite);
  } catch (error) {
    res.status(500).json({ error: "Failed to create site", details: (error as Error).message });
  }
});

export default siteRouter;
