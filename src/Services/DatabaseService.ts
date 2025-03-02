// src/Services/DatabaseService.ts
import { DockerService } from "./DockerService.js";
import * as fs from "fs";
import * as unzipper from "unzipper";

export class DatabaseService {
    private dockerService: DockerService;
    private networkName: string;

    // Constants
    private static readonly MYSQL_IMAGE = "mariadb:10.5.12";
    private static readonly MYSQL_ENV_VARS = {
        MYSQL_ROOT_PASSWORD: "db",
        MYSQL_DATABASE: "db",
        MYSQL_USER: "db",
        MYSQL_PASSWORD: "db",
    };

    private static readonly DATABASES_DIR = "/tmp/databases";

    constructor(dockerService: DockerService, networkName: string) {
        this.dockerService = dockerService;
        this.networkName = networkName;
    }

    private async unzipDatabase(domain: string): Promise<string> {
        const zipPath = `${DatabaseService.DATABASES_DIR}/db-${domain}.zip`;
        const extractPath = `${DatabaseService.DATABASES_DIR}/db-${domain}-unzipped`;

        if (!fs.existsSync(zipPath)) {
            throw new Error(`Database ZIP file not found: ${zipPath}`);
        }

        // Delete folder if it exists
        if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
        }

        await fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: extractPath }))
            .promise();

        return extractPath;
    }

    public async createMySQLContainer(containerName: string, domain: string): Promise<string> {
        try {
            const databasePath = await this.unzipDatabase(domain);
            
            // Create initial MySQL container with password reset mode
            const tempContainerId = await this.dockerService.createContainer(
                DatabaseService.MYSQL_IMAGE,
                containerName,
                this.networkName,
                ["mysqld", "--skip-grant-tables", "--skip-networking"],
                undefined,
                DatabaseService.MYSQL_ENV_VARS,
                undefined,
                { [`${databasePath}/var/lib/mysql/`]: "/var/lib/mysql/" }
            );

            // Wait for MySQL to be available
            await this.waitForMySQL(containerName);
            
            // Reset MySQL root password
            await this.resetMySQLRootPassword(containerName);
            
            // Stop and remove the temporary MySQL container
            await this.dockerService.stopContainer(tempContainerId);
            await this.dockerService.removeContainer(tempContainerId);
            
            // Create a new MySQL container with normal settings
            const newContainerId = await this.dockerService.createContainer(
                DatabaseService.MYSQL_IMAGE,
                containerName,
                this.networkName,
                [], // No additional command parameters
                undefined,
                DatabaseService.MYSQL_ENV_VARS,
                undefined,
                { [`${databasePath}/var/lib/mysql/`]: "/var/lib/mysql/" }
            );
            await this.waitForMySQL(containerName);

            return `MySQL container recreated with ID: ${newContainerId} and name: ${containerName}, database extracted to ${databasePath}`;
        } catch (error) {
            throw new Error(`Failed to create MySQL container: ${(error as Error).message}`);
        }
    }

    private async waitForMySQL(containerName: string, maxRetries = 100, delay = 500): Promise<void> {
        let attempts = 0;
        while (attempts < maxRetries) {
            try {
                const result = await this.dockerService.executeCommand(
                    containerName,
                    ["mysqladmin", "-uroot", "-p" + DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD, "ping"]
                );
                if (typeof result === 'string' && result.includes("mysqld is alive")) {
                    return;
                }
            } catch (error) {
                console.log(`Waiting for MySQL to start... (${attempts + 1}/${maxRetries})`);
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        throw new Error("MySQL did not start within the expected time.");
    }

    private async resetMySQLRootPassword(containerName: string): Promise<void> {
        const sqlCommands = [
            "FLUSH PRIVILEGES;",
            `GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY '${DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD}' WITH GRANT OPTION;`,
            "FLUSH PRIVILEGES;",
        ];
        const command = ["mysql", "-uroot", "-e", sqlCommands.join(" ")];

        try {
            await this.dockerService.executeCommand(containerName, command);
            console.log("MySQL root password reset successfully.");
        } catch (error) {
            throw new Error(`Failed to reset MySQL root password: ${(error as Error).message}`);
        }
    }
}
