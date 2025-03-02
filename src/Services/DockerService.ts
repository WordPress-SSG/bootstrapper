// src/Services/DockerService.ts
import Docker from 'dockerode';

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  public async createContainer(image: string, name: string, domain: string): Promise<string> {
    try {      
      const container = await this.docker.createContainer({
        Image: image,
        name: name,
        HostConfig: {
          RestartPolicy: { Name: 'always' },
          PortBindings: {
            '80/tcp': [{ HostPort: '80' }],
          },
        },
        Env: [`DOMAIN=${domain}`],
      });

      await container.start();
      return container.id;
    } catch (error) {
      throw new Error(`Failed to create container: ${(error as Error).message}`);
    }
  }
}