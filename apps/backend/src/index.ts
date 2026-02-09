import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { z } from "zod";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";

const app = express();
const port = Number(process.env.PORT ?? 8080);

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

const dataDir = path.resolve("data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "noname.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    userId TEXT PRIMARY KEY,
    alias TEXT NOT NULL,
    totalPoints INTEGER NOT NULL DEFAULT 0,
    weeklyPoints INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    updatedAt INTEGER NOT NULL
  );
`);

const insertOrUpdate = db.prepare(`
  INSERT INTO leaderboard (userId, alias, totalPoints, weeklyPoints, streak, updatedAt)
  VALUES (@userId, @alias, @totalPoints, @weeklyPoints, @streak, @updatedAt)
  ON CONFLICT(userId) DO UPDATE SET
    alias = excluded.alias,
    totalPoints = excluded.totalPoints,
    weeklyPoints = excluded.weeklyPoints,
    streak = excluded.streak,
    updatedAt = excluded.updatedAt;
`);

const listLeaderboard = db.prepare(`
  SELECT userId, alias, totalPoints, weeklyPoints, streak, updatedAt
  FROM leaderboard
  ORDER BY totalPoints DESC
  LIMIT 50;
`);

const sessionStore = new Map<string, {
  code: string;
  pcSocket?: WebSocket;
  mobileSocket?: WebSocket;
  expiresAt: number;
}>();

const sessionCreateSchema = z.object({
  userId: z.string().uuid(),
});

const sessionJoinSchema = z.object({
  code: z.string().min(6).max(12)
});

const leaderboardUpdateSchema = z.object({
  userId: z.string().uuid(),
  alias: z.string().min(3).max(32),
  totalPoints: z.number().int().nonnegative(),
  weeklyPoints: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative()
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/session/create", async (req, res) => {
  const parsed = sessionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid payload" });
  }

  const code = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const token = randomUUID();
  sessionStore.set(token, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  const qrUrl = await QRCode.toDataURL(`noname://link?code=${code}`);
  res.json({ code, token, qrUrl });
});

app.post("/api/session/join", (req, res) => {
  const parsed = sessionJoinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid payload" });
  }

  const entry = [...sessionStore.entries()].find(([, value]) => value.code === parsed.data.code);
  if (!entry) {
    return res.status(404).json({ error: "code not found" });
  }

  res.json({ token: entry[0] });
});

app.get("/api/leaderboard", (_req, res) => {
  res.json({ items: listLeaderboard.all() });
});

app.post("/api/leaderboard", (req, res) => {
  const parsed = leaderboardUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid payload" });
  }

  insertOrUpdate.run({
    ...parsed.data,
    updatedAt: Date.now()
  });

  res.json({ ok: true });
});

app.get("/api/dns/profile", (_req, res) => {
  const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>PayloadContent</key>
    <array>
      <dict>
        <key>PayloadType</key>
        <string>com.apple.dnsSettings.managed</string>
        <key>PayloadVersion</key>
        <integer>1</integer>
        <key>PayloadIdentifier</key>
        <string>com.noname.dns</string>
        <key>PayloadUUID</key>
        <string>${randomUUID()}</string>
        <key>PayloadDisplayName</key>
        <string>Noname DNS</string>
        <key>DNSSettings</key>
        <dict>
          <key>DNSProtocol</key>
          <string>HTTPS</string>
          <key>ServerURL</key>
          <string>https://dns.noname.example/dns-query</string>
        </dict>
      </dict>
    </array>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
    <key>PayloadIdentifier</key>
    <string>com.noname</string>
    <key>PayloadUUID</key>
    <string>${randomUUID()}</string>
    <key>PayloadDisplayName</key>
    <string>Noname DNS</string>
  </dict>
</plist>`;

  res.setHeader("Content-Type", "application/x-apple-aspen-config");
  res.send(profile);
});

const server = app.listen(port, () => {
  console.log(`Noname backend listening on ${port}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket, req) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  const role = url.searchParams.get("role");
  if (!token || !role) {
    socket.close();
    return;
  }

  const session = sessionStore.get(token);
  if (!session) {
    socket.close();
    return;
  }

  if (role === "pc") {
    session.pcSocket = socket;
  } else if (role === "mobile") {
    session.mobileSocket = socket;
  } else {
    socket.close();
    return;
  }

  const heartbeat = setInterval(() => {
    if (socket.readyState === socket.OPEN) {
      socket.ping();
    }
  }, 15000);

  socket.on("message", (raw) => {
    const payload = raw.toString();
    if (role === "mobile" && session.pcSocket?.readyState === socket.OPEN) {
      session.pcSocket.send(payload);
    }
    if (role === "pc" && session.mobileSocket?.readyState === socket.OPEN) {
      session.mobileSocket.send(payload);
    }
  });

  socket.on("close", () => {
    clearInterval(heartbeat);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessionStore.entries()) {
    if (session.expiresAt < now) {
      session.pcSocket?.close();
      session.mobileSocket?.close();
      sessionStore.delete(token);
    }
  }
}, 60_000);
