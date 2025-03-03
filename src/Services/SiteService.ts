// src/Services/SiteService.ts
import { DockerService } from "./DockerService.js";
import { DatabaseService } from "./DatabaseService.js";
import { LocalEnvService } from "./LocalEnvService.js";

export class SiteService {
  private dockerService: DockerService;
  private databaseService: DatabaseService;
  private localEnvService: LocalEnvService;
  private networkName: string = "custom-network";
  private subnet: string = "10.10.0.0/16";
  private gateway: string = "10.10.0.1";

  constructor() {
    this.dockerService = new DockerService();
    this.databaseService = new DatabaseService(this.dockerService, this.networkName);
    this.localEnvService = new LocalEnvService(this.dockerService);

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
      const dbContainerId = await this.databaseService.createMySQLContainer("db", siteData.domain);

      const containerId = await this.dockerService.createContainer(
        'ghcr.io/wordpress-ssg/dynamic-webpage:main',
        "wp",
        this.networkName,
        undefined,
        siteData.domain,
        {},
        80
      );

      await this.databaseService.copyDatabaseIfExists(dbContainerId, 'wp', 'db');
      await this.localEnvService.updateLocalEnvOptions(dbContainerId);
      await this.localEnvService.updateUserPassword(dbContainerId, 'root');

      return `Container created with ID: ${containerId} for domain: ${siteData.domain}`;
    } catch (error) {
      throw new Error(`Failed to create site: ${(error as Error).message}`);
    }
  }
}
