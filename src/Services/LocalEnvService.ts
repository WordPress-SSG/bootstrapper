// src/Services/LocalEnvService.ts
import { DockerService } from "./DockerService.js";
import { DatabaseService } from "./DatabaseService.js";

export class LocalEnvService {
    private dockerService: DockerService;

    constructor(dockerService: DockerService) {
        this.dockerService = dockerService;
    }

    public async updateLocalEnvOptions(containerName: string): Promise<void> {
        const sqlCommand = "UPDATE wp_options SET option_value = REPLACE(option_value, 'https://', 'http://') WHERE option_name IN ('siteurl', 'home');";
        const command = [
            "mysql",
            "-u", DatabaseService.MYSQL_ENV_VARS.MYSQL_USER,
            "-p" + DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD,
            DatabaseService.MYSQL_ENV_VARS.MYSQL_DATABASE, // Explicitly select the database
            "-e", sqlCommand
        ];

        try {
            await this.dockerService.executeCommand(containerName, command);
            console.log("Updated wp_options to replace HTTPS with HTTP successfully.");
        } catch (error) {
            throw new Error(`Failed to update wp_options: ${(error as Error).message}`);
        }
    }
}
