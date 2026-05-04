const { createServer } = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3001);

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
