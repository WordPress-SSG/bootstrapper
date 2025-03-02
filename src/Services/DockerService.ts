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

  public async createContainer(
    image: string,
    name: string,
    network: string,
    cmd: string[] = [],
    domain?: string,
    envVars: Record<string, string> = {},
    port?: number,
    volumes: Record<string, string> = {}
  ): Promise<string> {
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
      
      const volumeBindings = Object.entries(volumes).map(([hostPath, containerPath]) => `${hostPath}:${containerPath}`);
      
      const container = await this.docker.createContainer({
        Image: image,
        name: name,
        Cmd: cmd.length > 0 ? cmd : undefined, // Add command execution support
        HostConfig: {
          RestartPolicy: { Name: 'always' },
          PortBindings: port ? { [`${port}/tcp`]: [{ HostPort: `${port}` }] } : undefined,
          NetworkMode: network,
          Binds: volumeBindings.length > 0 ? volumeBindings : undefined,
        },
        Env: envArray,
      });

      await container.start();
      return container.id;
    } catch (error) {
      throw new Error(`Failed to create container: ${(error as Error).message}`);
    }
  }

  public async stopContainer(containerId: string): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
      return `Container ${containerId} stopped successfully`;
    } catch (error) {
      throw new Error(`Failed to stop container: ${(error as Error).message}`);
    }
  }

  public async removeContainer(containerId: string): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop().catch(() => {}); // Ignore errors if already stopped
      await container.remove();
      return `Container ${containerId} removed successfully`;
    } catch (error) {
      throw new Error(`Failed to remove container: ${(error as Error).message}`);
    }
  }

  public async executeCommand(containerId: string, command: string[]): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true
      });
      
      const stream = await exec.start({});
      
      return new Promise((resolve, reject) => {
        let output = '';
        stream.on('data', (chunk) => {
          output += chunk.toString();
        });
        stream.on('end', () => resolve(output));
        stream.on('error', (err) => reject(`Execution failed: ${err.message}`));
      });
    } catch (error) {
      throw new Error(`Failed to execute command: ${(error as Error).message}`);
    }
  }
}
