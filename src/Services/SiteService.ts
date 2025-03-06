// src/Services/SiteService.ts
import { DockerService } from "./DockerService.js";
import { DatabaseService } from "./DatabaseService.js";
import { LocalEnvService } from "./LocalEnvService.js";
import { ContentService } from "./ContentService.js";
import { PublishService } from "./PublishService.js";

export class SiteService {
  private dockerService: DockerService;
  private databaseService: DatabaseService;
  private localEnvService: LocalEnvService;
  private contentService: ContentService;
  private publishService: PublishService;
  private networkName: string = "custom-network";
  private subnet: string = "10.10.0.0/16";
  private gateway: string = "10.10.0.1";

  constructor() {
    this.dockerService = new DockerService();
    this.databaseService = new DatabaseService(this.dockerService, this.networkName);
    this.localEnvService = new LocalEnvService(this.dockerService);
    this.contentService = new ContentService();
    this.publishService = new PublishService();

    console.log("Initializing SiteService and setting up the network...");
    this.setupNetwork();
  }

  private async setupNetwork(): Promise<void> {
    try {
      console.log(`Attempting to create network: ${this.networkName}`);
      await this.dockerService.createNetwork(this.networkName, this.subnet, this.gateway);
      console.log(`Network ${this.networkName} is set up successfully.`);
    } catch (error) {
      console.error(`Failed to set up network: ${(error as Error).message}`);
    }
  }

  public async create(siteData: { domain: string }): Promise<string> {
    try {
      console.log(`Creating site with domain: ${siteData.domain}`);
      
      const dbContainerId = await this.databaseService.createMySQLContainer("db", siteData.domain);
      console.log(`Database container created with ID: ${dbContainerId}`);
      
      const contentPath = await this.contentService.unzipContents(siteData.domain);
      console.log(`Content unzipped to path: ${contentPath}`);
      
      const containerId = await this.dockerService.createContainer(
        'ghcr.io/wordpress-ssg/dynamic-webpage:main',
        "wp",
        this.networkName,
        undefined,
        siteData.domain,
        {},
        80,
        {
          "/wp-ssg/plugins/": "/var/www/html/wp-content/plugins/",
          "/wp-ssg/purchases/": "/var/www/html/wp-content/themes/",
          [`${contentPath}/var/www/html/wp-content/fonts/`]: "/var/www/html/wp-content/fonts/",
          [`${contentPath}/var/www/html/wp-content/languages/`]: "/var/www/html/wp-content/languages/",
          [`${contentPath}/var/www/html/wp-content/uploads/`]: "/var/www/html/wp-content/uploads/"
        },
        'always',
        {
          [siteData.domain]: "127.0.0.1"
        }
      );
      console.log(`Web container created with ID: ${containerId}`);
      
      await this.localEnvService.updateWpOptionsToHttp(dbContainerId);
      console.log("Updated WordPress options to HTTP.");
      
      await this.localEnvService.updateUserPassword(dbContainerId, 'root');
      console.log("Updated user password to root.");
      
      return containerId;
    } catch (error) {
      console.error(`Failed to create site: ${(error as Error).message}`);
      throw new Error(`Failed to create site: ${(error as Error).message}`);
    }
  }

  public async buildAndDeploy(domain: string, containerId: string): Promise<string> {
    try {
      console.log(`Starting build and deploy process for domain: ${domain}`);
      
      await this.localEnvService.build(domain, containerId);
      console.log("Build process completed.");
      
      await this.dockerService.removeContainer('wp');
      console.log("Removed WordPress container.");
      
      await this.dockerService.removeContainer('db');
      console.log("Removed Database container.");
      
      await this.contentService.zipContents(domain);
      console.log("Zipped site contents.");
      
      await this.databaseService.zipDatabase(domain);
      console.log("Zipped site database.");
      
      await this.publishService.publish(domain);
      console.log(`Site ${domain} has been published successfully.`);

      return `Site ${domain} has been published successfully.`;
    } catch (error) {
      console.error(`Failed to publish site ${domain}: ${(error as Error).message}`);
      throw new Error(`Failed to publish site ${domain}: ${(error as Error).message}`);
    }
  }
}
