// src/Services/LocalEnvService.ts
import { DockerService } from "./DockerService.js";
import { DatabaseService } from "./DatabaseService.js";
import { createHash } from "crypto";

export class LocalEnvService {
    private dockerService: DockerService;

    constructor(dockerService: DockerService) {
        this.dockerService = dockerService;
    }

    private async executeSql(containerName: string, sqlCommand: string): Promise<void> {
        const command = [
            "mysql",
            "-u", DatabaseService.MYSQL_ENV_VARS.MYSQL_USER,
            "-p" + DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD,
            DatabaseService.MYSQL_ENV_VARS.MYSQL_DATABASE,
            "-e", sqlCommand
        ];

        try {
            await this.dockerService.executeCommand(containerName, command);
            console.log("Updated wp_options to replace HTTPS with HTTP successfully.");
        } catch (error) {
            throw new Error(`Failed to execute SQL command: ${(error as Error).message}`);
        }
    }

    public async updateWpOptionsToHttp(containerName: string): Promise<void> {
        const sqlCommand = "UPDATE wp_options SET option_value = REPLACE(option_value, 'https://', 'http://') WHERE option_name IN ('siteurl', 'home');";
        await this.executeSql(containerName, sqlCommand);
        console.log("Updated wp_options to replace HTTPS with HTTP successfully.");
    }

    public async updateWpOptionsToHttps(containerName: string): Promise<void> {
        const sqlCommand = "UPDATE wp_options SET option_value = REPLACE(option_value, 'http://', 'https://') WHERE option_name IN ('siteurl', 'home');";
        await this.executeSql(containerName, sqlCommand);
        console.log("Updated wp_options to replace HTTP with HTTPS successfully.");
    }

    public async updateUserPassword(containerName: string, username: string): Promise<void> {
        // Hash password using MD5 (not recommended for security)
        const hashedPassword = createHash('md5').update('root').digest('hex');
        const sqlCommand = `UPDATE wp_users SET user_pass = '${hashedPassword}' WHERE user_login = '${username}';`;
        await this.executeSql(containerName, sqlCommand);
        console.log(`Password updated successfully for user: ${username}`);
    }

    public async build(domain: string, wpContainerId: string): Promise<string> {
        try {
            const wranglerConfigToml = process.env.WRANGLER_CONFIG_TOML || "";
            this.updateWpOptionsToHttps('db')

            const IPAddress = await this.dockerService.getContainerIP(wpContainerId, "custom-network")

            const buildContainerId = await this.dockerService.createContainer(
                'ghcr.io/wordpress-ssg/static-webpage:main',
                "static-builder",
                "custom-network",
                undefined,
                domain,
                { "WRANGLER_CONFIG_TOML": wranglerConfigToml, "WP_CONTAINER_ID": wpContainerId },
                undefined,
                {
                    "/tmp/wp-dist/": `/data/`,
                },
                'on-failure',
                {
                    [domain]: IPAddress
                }
            );

            await this.dockerService.getContainerLogs(buildContainerId, (data) => {
                console.log("Build: " + data)
            })
            await this.dockerService.removeContainer('wp')

            return `Build container created with ID: ${buildContainerId} for domain: ${domain}, using WP container ID: ${wpContainerId}`;
        } catch (error) {
            throw new Error(`Failed to build static site: ${(error as Error).message}`);
        }
    }
}
