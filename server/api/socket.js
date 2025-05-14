const app = require("../index.js");
const { Server } = require("socket.io");
const { createServer } = require("http");

module.exports = (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.status(200).end();
    return;
  }

  if (
    req.headers["upgrade"] &&
    req.headers["upgrade"].toLowerCase() === "websocket"
  ) {
    const server = createServer(app);

    const io = new Server(server, {
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? [
                process.env.VERCEL_URL
                  ? `https://${process.env.VERCEL_URL}`
                  : "*",
                "https://*.vercel.app",
              ]
            : "http://localhost:3000",
        methods: ["GET", "POST", "OPTIONS"],
        credentials: false,
      },
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });

    const originalHandle = server._events.request;
    server._events.request = (req, res) => {
      if (res.socket.server) {
        res.socket.server.io = io;
      }
      originalHandle(req, res);
    };

    if (!res.socket.server.io) {
      res.socket.server.io = io;
    }
  }

  return app(req, res);
};
