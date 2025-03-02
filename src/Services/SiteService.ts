// src/Services/SiteService.ts
import { DockerService } from "./DockerService";

export class SiteService {
  private dockerService: DockerService;

  constructor() {
    this.dockerService = new DockerService();
  }

  public async createSite(siteData: { image: string; name: string; domain: string }): Promise<string> {
    try {
      const containerId = await this.dockerService.createContainer(siteData.image, siteData.name, siteData.domain);
      return `Container created with ID: ${containerId} for domain: ${siteData.domain}`;
    } catch (error) {
      throw new Error(`Failed to create site: ${(error as Error).message}`);
    }
  }
}
