// src/Services/SiteService.ts
import { DockerService } from "./DockerService.js";

export class SiteService {
  private dockerService: DockerService;
  private networkName: string = "custom-network";
  private subnet: string = "10.10.0.0/16";
  private gateway: string = "10.10.0.1";

  constructor() {
    this.dockerService = new DockerService();
    this.setupNetwork();
  }

  private async setupNetwork(): Promise<void> {
    try {
      await this.dockerService.createNetwork(this.networkName, this.subnet, this.gateway);
      console.log(`Network ${this.networkName} is set up.`);
    } catch (error) {
      console.error(`Failed to set up network: ${(error as Error).message}`);
    }
  }

  public async createSite(siteData: { domain: string }): Promise<string> {
    try {
      await this.createMySQLContainer("db");
      
      const containerId = await this.dockerService.createContainer(
        'ghcr.io/wordpress-ssg/dynamic-webpage:main', 
        "wp", 
        this.networkName, // Use the predefined network
        siteData.domain, 
        {}, 
        80
      );
      return `Container created with ID: ${containerId} for domain: ${siteData.domain}`;
    } catch (error) {
      throw new Error(`Failed to create site: ${(error as Error).message}`);
    }
  }

  public async createMySQLContainer(containerName: string): Promise<string> {
    try {
      const containerId = await this.dockerService.createContainer(
        "mysql:8.0.31",
        containerName,
        this.networkName, // Use the predefined network
        undefined,
        {
          MYSQL_ROOT_PASSWORD: "db",
          MYSQL_DATABASE: "db",
          MYSQL_USER: "db",
          MYSQL_PASSWORD: "db",
        }
      );
      return `MySQL container created with ID: ${containerId} and name: ${containerName}`;
    } catch (error) {
      throw new Error(`Failed to create MySQL container: ${(error as Error).message}`);
    }
  }
}
