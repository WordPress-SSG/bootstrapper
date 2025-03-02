// src/Services/DatabaseService.ts
import { DockerService } from "./DockerService.js";
import * as fs from "fs";
import * as unzipper from "unzipper";

export class DatabaseService {
  private dockerService: DockerService;
  private networkName: string;

  constructor(dockerService: DockerService, networkName: string) {
    this.dockerService = dockerService;
    this.networkName = networkName;
  }

  private async unzipDatabase(domain: string): Promise<string> {
    const zipPath = `/databases/db-${domain}.zip`;
    const extractPath = `/databases/db-${domain}-unzipped`;

    if (!fs.existsSync(zipPath)) {
      throw new Error(`Database ZIP file not found: ${zipPath}`);
    }

    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    return extractPath;
  }

  public async createMySQLContainer(containerName: string, domain: string): Promise<string> {
    try {
      const databasePath = await this.unzipDatabase(domain);
      const containerId = await this.dockerService.createContainer(
        "mysql:8.0.31",
        containerName,
        this.networkName,
        undefined,
        {
          MYSQL_ROOT_PASSWORD: "db",
          MYSQL_DATABASE: "db",
          MYSQL_USER: "db",
          MYSQL_PASSWORD: "db",
        }
      );
      return `MySQL container created with ID: ${containerId} and name: ${containerName}, database extracted to ${databasePath}`;
    } catch (error) {
      throw new Error(`Failed to create MySQL container: ${(error as Error).message}`);
    }
  }
}
