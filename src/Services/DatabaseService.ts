// src/Services/DatabaseService.ts
import { DockerService } from "./DockerService.js";

export class DatabaseService {
  private dockerService: DockerService;
  private networkName: string;

  constructor(dockerService: DockerService, networkName: string) {
    this.dockerService = dockerService;
    this.networkName = networkName;
  }

  public async createMySQLContainer(containerName: string, domain: string): Promise<string> {
    try {
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
      return `MySQL container created with ID: ${containerId} and name: ${containerName}`;
    } catch (error) {
      throw new Error(`Failed to create MySQL container: ${(error as Error).message}`);
    }
  }
}
