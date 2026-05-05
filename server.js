const { createServer } = require("http");
const next = require("next");

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!process.env.DATABASE_URL && databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT, 10) || 3000;
const databaseStatus = process.env.DATABASE_URL
  ? `${new URL(process.env.DATABASE_URL).protocol.replace(":", "")} configured`
  : "missing";

console.log(`PORT: ${process.env.PORT || port}`);
console.log(`DATABASE_URL status: ${databaseStatus}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || hostname}`);

    if (url.pathname === "/api/test") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "API working" }));
      return;
    }

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "HRMS Backend" }));
      return;
    }

    return handle(req, res);
  }).listen(port, hostname, () => {
    console.log(`HRMS backend running on ${hostname}:${port}`);
  });
});
