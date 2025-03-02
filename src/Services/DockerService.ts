// src/Services/DockerService.ts
import Docker from 'dockerode';

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  public async createNetwork(networkName: string, subnet: string, gateway: string): Promise<string> {
    try {
      const networks = await this.docker.listNetworks();
      const existingNetwork = networks.find(net => net.Name === networkName);
      
      if (existingNetwork) {
        return `Network ${networkName} already exists`;
      }
      
      const network = await this.docker.createNetwork({
        Name: networkName,
        Driver: "bridge"
      });
      return `Network created with ID: ${network.id}`;
    } catch (error) {
      throw new Error(`Failed to create network: ${(error as Error).message}`);
    }
  }

  public async createContainer(image: string, name: string, network: string, domain?: string, envVars: Record<string, string> = {}, port?: number): Promise<string> {
    try {
      // Check if a container with the same name exists
      const containers = await this.docker.listContainers({ all: true });
      const existingContainer = containers.find((container) => container.Names.includes(`/${name}`));

      if (existingContainer) {
        const container = this.docker.getContainer(existingContainer.Id);
        await container.stop().catch(() => {}); // Ignore errors if already stopped
        await container.remove();
      }
      
      const envArray = Object.entries(envVars).map(([key, value]) => `${key}=${value}`);
      if (domain) {
        envArray.push(`DOMAIN=${domain}`);
      }
      
      const container = await this.docker.createContainer({
        Image: image,
        name: name,
        HostConfig: {
          RestartPolicy: { Name: 'always' },
          PortBindings: port ? { [`${port}/tcp`]: [{ HostPort: `${port}` }] } : undefined,
          NetworkMode: network // Set to the defined network
        },
        Env: envArray,
      });

      await container.start();
      return container.id;
    } catch (error) {
      throw new Error(`Failed to create container: ${(error as Error).message}`);
    }
  }
}
