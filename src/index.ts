import { App } from "./App";

class Main {
  private app: App;

  constructor() {
    this.app = new App();
  }

  public async start(): Promise<void> {
    try {
      await this.app.start();
      console.log("Application started successfully.");
    } catch (error) {
      console.error("Error starting application:", error);
      process.exit(1);
    }
  }
}

const main = new Main();
main.start();
