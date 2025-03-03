// src/Services/LocalEnvService.ts
import { DockerService } from "./DockerService.js";
import { DatabaseService } from "./DatabaseService.js";
import { createHash } from "crypto";

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

    public async updateUserPassword(containerName: string, username: string): Promise<void> {
        // Hash password using MD5 (not recommended for security)
        const hashedPassword = createHash('md5').update('root').digest('hex');
        const sqlCommand = `UPDATE wp_users SET user_pass = '${hashedPassword}' WHERE user_login = '${username}';`;
        const command = [
            "mysql",
            "-u", DatabaseService.MYSQL_ENV_VARS.MYSQL_USER,
            "-p" + DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD,
            DatabaseService.MYSQL_ENV_VARS.MYSQL_DATABASE,
            "-e", sqlCommand
        ];

        try {
            await this.dockerService.executeCommand(containerName, command);
            console.log(`Password updated successfully for user: ${username}`);
        } catch (error) {
            throw new Error(`Failed to update user password: ${(error as Error).message}`);
        }
    }

    public async build(domain: string, wpContainerId: string): Promise<string> {
        try {
            const wranglerConfigToml = process.env.WRANGLER_CONFIG_TOML || "";

            const buildContainerId = await this.dockerService.createContainer(
                'ghcr.io/wordpress-ssg/static-webpage:main',
                "static-builder",
                "custom-network",
                undefined,
                domain,
                { "WRANGLER_CONFIG_TOML": wranglerConfigToml, "WP_CONTAINER_ID": wpContainerId },
                undefined,
                {
                    "/tmp/wp-dist/": `/tmp/wp-dist/${domain}`,
                },
                'never'
            );

            return `Build container created with ID: ${buildContainerId} for domain: ${domain}, using WP container ID: ${wpContainerId}`;
        } catch (error) {
            throw new Error(`Failed to build static site: ${(error as Error).message}`);
        }
    }
}
