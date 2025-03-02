import express, { Express } from "express";
import { Server } from "./Server.js";

export class App {
  private server: Server;
  private app: Express;
  private port: number;

  constructor() {
    this.app = express();
    this.server = new Server(this.app);
    this.port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  }

  public async start(): Promise<void> {
    try {
      console.log("Starting services...");
      await this.initializeServices();

      this.server.start(this.port);
      console.log(`Server is running on port ${this.port}`);
    } catch (error) {
      console.error("Error starting application:", error);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      console.log("Initializing Kafka, RabbitMQ, and third-party services...");
      // Initialize Kafka, RabbitMQ, and other services here
      // Example: await kafkaService.connect();
      // Example: await rabbitMQService.connect();
      console.log("All services initialized successfully.");
    } catch (error) {
      console.error("Error initializing services:", error);
      throw error;
    }
  }
}
