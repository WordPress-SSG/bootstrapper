// src/Services/DatabaseService.ts
import { DockerService } from "./DockerService.js";
import * as fs from "fs";
import * as unzipper from "unzipper";
import archiver from "archiver";

export class DatabaseService {
    private dockerService: DockerService;
    private networkName: string;

    // Constants
    private static readonly MYSQL_IMAGE = "mariadb:10.5.12";
    public static readonly MYSQL_ENV_VARS = {
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

    public async zipDatabase(domain: string): Promise<string> {
        const dbPath = `${DatabaseService.DATABASES_DIR}/db-${domain}-unzipped`;
        const zipPath = `${DatabaseService.DATABASES_DIR}/db-${domain}.zip`;

        if (!fs.existsSync(dbPath)) {
            throw new Error(`Database directory not found: ${dbPath}`);
        }

        // If the old zip file exists, rename it with a timestamp
        if (fs.existsSync(zipPath)) {
            const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
            const backupZipPath = `${DatabaseService.DATABASES_DIR}/db-${domain}-${timestamp}.zip`;
            fs.renameSync(zipPath, backupZipPath);
            console.log(`Old database backup saved as: ${backupZipPath}`);
        }

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                console.log(`Database successfully zipped: ${zipPath}`);
                resolve(zipPath);
            });

            archive.on('error', (err) => reject(err));

            archive.pipe(output);
            archive.directory(dbPath, false);
            archive.finalize();
        });
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

            await this.resetMySQLPassword(containerName);

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

            console.log(`MySQL container recreated with ID: ${newContainerId} and name: ${containerName}, database extracted to ${databasePath}`);

            return containerName;
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
                    ["mysqladmin", "-u", DatabaseService.MYSQL_ENV_VARS.MYSQL_PASSWORD, "-p" + DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD, "ping"]
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

    private async resetMySQLPassword(containerName: string): Promise<void> {
        const sqlCommands = [
            "FLUSH PRIVILEGES;",
            `GRANT ALL PRIVILEGES ON *.* TO '${DatabaseService.MYSQL_ENV_VARS.MYSQL_USER}'@'%' IDENTIFIED BY '${DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD}' WITH GRANT OPTION;`,
            "FLUSH PRIVILEGES;",
        ];
        const command = ["mysql", "-u", DatabaseService.MYSQL_ENV_VARS.MYSQL_USER, "-e", sqlCommands.join(" ")];

        try {
            await this.dockerService.executeCommand(containerName, command);
            console.log("MySQL root password reset successfully.");
        } catch (error) {
            throw new Error(`Failed to reset MySQL root password: ${(error as Error).message}`);
        }
    }

    public async copyDatabaseIfExists(containerName: string, sourceDb: string, targetDb: string): Promise<void> {
        const checkDbCommand = `mysql -u ${DatabaseService.MYSQL_ENV_VARS.MYSQL_USER} -p${DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD} -e \"SHOW DATABASES LIKE '${sourceDb}';\"`;
        const dumpCommand = `mysqldump -u ${DatabaseService.MYSQL_ENV_VARS.MYSQL_USER} -p${DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD} ${sourceDb} > /tmp/${sourceDb}.sql`;
        const createCommand = `mysql -u ${DatabaseService.MYSQL_ENV_VARS.MYSQL_USER} -p${DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD} -e \"CREATE DATABASE ${targetDb};\"`;
        const importCommand = `mysql -u ${DatabaseService.MYSQL_ENV_VARS.MYSQL_USER} -p${DatabaseService.MYSQL_ENV_VARS.MYSQL_ROOT_PASSWORD} ${targetDb} < /tmp/${sourceDb}.sql`;

        try {
            const result = await this.dockerService.executeCommand(containerName, ["sh", "-c", checkDbCommand]);
            if (!result.includes(sourceDb)) {
                console.log(`Database ${sourceDb} does not exist. Skipping copy.`);
                return;
            }

            await this.dockerService.executeCommand(containerName, ["sh", "-c", dumpCommand]);
            await this.dockerService.executeCommand(containerName, ["sh", "-c", createCommand]);
            await this.dockerService.executeCommand(containerName, ["sh", "-c", importCommand]);
            console.log(`Database ${sourceDb} copied to ${targetDb} successfully.`);
        } catch (error) {
            throw new Error(`Failed to copy database: ${(error as Error).message}`);
        }
    }
}
