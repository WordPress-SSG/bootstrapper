// src/Services/PublishService.ts
import { DockerService } from "./DockerService.js";

export class PublishService {
    private dockerService: DockerService;
    private publishContainerName: string = "wrangler-publisher";

    constructor() {
        this.dockerService = new DockerService();
    }

    public async publish(domain: string): Promise<string> {
        try {
            const wranglerConfigToml = process.env.WRANGLER_CONFIG_TOML || "";
            console.log(`Starting publish process for ${domain}...`);

            // Check if the container already exists and remove it if necessary
            try {
                await this.dockerService.stopContainer(this.publishContainerName);
                await this.dockerService.removeContainer(this.publishContainerName);
            } catch (error) {
                console.log("No existing publish container found. Proceeding with creation.");
            }

            const containerId = await this.dockerService.createContainer(
                "ghcr.io/wordpress-ssg/wrangler:main",
                this.publishContainerName,
                "bridge", // Use default bridge network
                ["-c", "wrangler pages deploy /tmp/wp-dist/" + domain + "/ --project-name " + domain.replace('.', '-')],
                domain,
                {
                    "WRANGLER_CONFIG_TOML": wranglerConfigToml,
                    "DOMAIN": domain
                },
                undefined, // No port needed
                {
                    "/root/.config/.wrangler/": "/root/.config/.wrangler/",
                    [`/tmp/wp-dist/${domain}/`]: `/tmp/wp-dist/${domain}/`, // Mount site content
                },
                'on-failure',
            );

            console.log(`Publish container started with ID: ${containerId}`);

            // Stream logs in real-time
            await this.dockerService.getContainerLogs(containerId, (data) => {
                console.log("wrangler: " + data); // Print logs as they arrive
            })

            console.log(`Publishing completed for ${domain}`);
            return `Publishing finished for ${domain}`;
        } catch (error) {
            throw new Error(`Failed to publish site: ${(error as Error).message}`);
        }
    }
}
