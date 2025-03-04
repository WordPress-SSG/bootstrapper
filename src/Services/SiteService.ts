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

  public async create(siteData: { domain: string }): Promise<string> {
    try {
      const dbContainerId = await this.databaseService.createMySQLContainer("db", siteData.domain);
      const contentPath = await this.contentService.unzipContents(siteData.domain);

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

      await this.databaseService.copyDatabaseIfExists(dbContainerId, 'wp', 'db');
      await this.localEnvService.updateWpOptionsToHttp(dbContainerId);
      await this.localEnvService.updateUserPassword(dbContainerId, 'root');

      return containerId;
    } catch (error) {
      throw new Error(`Failed to create site: ${(error as Error).message}`);
    }
  }

  public async buildAndDeploy(domain: string, containerId: string): Promise<string> {
    try {
      await this.localEnvService.build(domain, containerId);
      await this.databaseService.zipDatabase(domain);
      await this.dockerService.removeContainer('wp')
      await this.dockerService.removeContainer('db')
      await this.publishService.publish(domain);
      console.log(`Site ${domain} has been published successfully.`);

      return `Site ${domain} has been published successfully.`;
    } catch (error) {
      throw new Error(`Failed to publish site ${domain}: ${(error as Error).message}`);
    }
  }
}
