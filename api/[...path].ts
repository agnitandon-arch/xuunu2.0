import express from "express";
import { registerRoutes } from "../server/routes";

declare module "http" {
  interface IncomingMessage {
    rawBody?: unknown;
  }
}

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

const ready = registerRoutes(app).then(() => {
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
});

export default async function handler(req: express.Request, res: express.Response) {
  await ready;
  return app(req, res);
}
