// src/Services/SiteService.ts
import { DockerService } from "./DockerService.js";

export class SiteService {
  private dockerService: DockerService;

  constructor() {
    this.dockerService = new DockerService();
  }

  public async createSite(siteData: { domain: string }): Promise<string> {
    try {
      const containerId = await this.dockerService.createContainer('ghcr.io/wordpress-ssg/dynamic-webpage:main', "wp", siteData.domain);
      return `Container created with ID: ${containerId} for domain: ${siteData.domain}`;
    } catch (error) {
      throw new Error(`Failed to create site: ${(error as Error).message}`);
    }
  }
}
