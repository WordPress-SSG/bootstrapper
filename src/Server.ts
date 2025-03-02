import express, { Express } from "express";
import http from "http";
import siteRouter from "./Routes/siteRouter";

export class Server {
  private app: Express;
  private server: http.Server;

  constructor(app: Express) {
    this.app = app;
    this.server = http.createServer(this.app);
    this.configureMiddleware();
    this.configureRoutes();
  }

  private configureMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private configureRoutes(): void {
    this.app.use("/api", siteRouter);
  }

  public start(port: number): void {
    this.server.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  }
}
