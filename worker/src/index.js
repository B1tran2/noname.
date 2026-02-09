export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/api/ping") {
      return json({ status: "ok", now: Date.now() });
    }

    if (pathname === "/api/relay/create" && request.method === "POST") {
      const code = generateCode();
      const id = env.RELAY_ROOM.idFromName(code);
      const stub = env.RELAY_ROOM.get(id);
      await stub.fetch("https://relay/init", { method: "POST" });
      return json({ code });
    }

    if (pathname === "/api/relay/connect") {
      const code = url.searchParams.get("code");
      if (!code) return json({ error: "missing code" }, 400);
      const id = env.RELAY_ROOM.idFromName(code.toUpperCase());
      const stub = env.RELAY_ROOM.get(id);
      return stub.fetch(request);
    }

    if (pathname === "/api/score" && request.method === "POST") {
      const payload = await request.json();
      const response = await handleScore(env, payload);
      return json(response);
    }

    if (pathname === "/api/leaderboard") {
      const type = url.searchParams.get("type") || "total";
      const entries = await loadLeaderboard(env, type);
      return json({ entries });
    }

    if (pathname === "/api/bots/seed" && request.method === "POST") {
      const result = await seedBots(env);
      return json(result);
    }

    return new Response("Not found", { status: 404 });
  },
};

export class RelayRoom {
  constructor(state) {
    this.state = state;
    this.sockets = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.hostname === "relay") {
      await this.state.storage.put("createdAt", Date.now());
      return new Response("ok");
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const [client, server] = new WebSocketPair();
    const role = url.searchParams.get("role") || "anon";
    const code = url.searchParams.get("code") || "";
    const createdAt = (await this.state.storage.get("createdAt")) || Date.now();
    if (Date.now() - createdAt > 10 * 60 * 1000) {
      return new Response("Expired", { status: 410 });
    }

    this.sockets.set(server, { role, code });
    server.accept();

    server.addEventListener("message", (event) => {
      for (const [socket] of this.sockets) {
        if (socket !== server) {
          socket.send(event.data);
        }
      }
    });

    server.addEventListener("close", () => {
      this.sockets.delete(server);
    });

    server.addEventListener("error", () => {
      this.sockets.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function handleScore(env, payload) {
  const { userId, alias, action, photoHash } = payload || {};
  if (!userId) return { status: "error", message: "missing user" };

  const stateKey = `state:${userId}`;
  const userKey = `user:${userId}`;
  const now = Date.now();
  const state = (await env.NONAME_KV.get(stateKey, { type: "json" })) || {
    lastApprovedAt: 0,
    rejectCount: 0,
    rejectWindowStart: now,
    rejectCooldownUntil: 0,
  };

  if (state.rejectCooldownUntil > now) {
    return { status: "cooldown", message: "Cooldown por rechazos activo" };
  }

  if (action === "reject") {
    if (now - state.rejectWindowStart > 24 * 60 * 60 * 1000) {
      state.rejectWindowStart = now;
      state.rejectCount = 0;
    }
    state.rejectCount += 1;
    if (state.rejectCount >= 3) {
      state.rejectCooldownUntil = now + 30 * 60 * 1000;
    }
    await env.NONAME_KV.put(stateKey, JSON.stringify(state));
    return { status: "rejected" };
  }

  if (now - state.lastApprovedAt < 120000) {
    return { status: "cooldown", message: "Cooldown de 2 minutos" };
  }

  state.lastApprovedAt = now;
  state.rejectCount = 0;
  state.rejectCooldownUntil = 0;
  await env.NONAME_KV.put(stateKey, JSON.stringify(state));

  const user = (await env.NONAME_KV.get(userKey, { type: "json" })) || {
    id: userId,
    alias: alias || "Anon",
    points: 0,
    minutes: 0,
    lastDay: null,
  };
  const dayKey = new Date(now).toISOString().slice(0, 10);
  let pointsToAdd = 10;
  if (user.lastDay !== dayKey) {
    pointsToAdd += 5;
    user.lastDay = dayKey;
  }

  user.alias = alias || user.alias;
  user.points += pointsToAdd;
  user.minutes = Math.floor(user.points / 10) * 15;
  user.updatedAt = now;
  user.photoHash = photoHash || user.photoHash;

  await env.NONAME_KV.put(userKey, JSON.stringify(user));
  await env.NONAME_KV.put(`weekly:${getWeekKey(now)}:${userId}`, JSON.stringify({
    id: userId,
    alias: user.alias,
    points: user.points,
    minutes: user.minutes,
  }));

  return {
    status: "approved",
    pointsTotal: user.points,
    minutesTotal: user.minutes,
    bonusApplied: pointsToAdd > 10,
  };
}

async function loadLeaderboard(env, type) {
  if (type === "weekly") {
    const prefix = `weekly:${getWeekKey(Date.now())}:`;
    const list = await env.NONAME_KV.list({ prefix });
    const entries = await Promise.all(
      list.keys.map((key) => env.NONAME_KV.get(key.name, { type: "json" }))
    );
    return entries
      .filter(Boolean)
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);
  }
  const list = await env.NONAME_KV.list({ prefix: "user:" });
  const entries = await Promise.all(
    list.keys.map((key) => env.NONAME_KV.get(key.name, { type: "json" }))
  );
  return entries
    .filter(Boolean)
    .sort((a, b) => b.points - a.points)
    .slice(0, 20);
}

async function seedBots(env) {
  const bots = [
    "BOT/DEMO - FocoZen",
    "BOT/DEMO - LofiCat",
    "BOT/DEMO - Worky",
    "BOT/DEMO - PixelDesk",
    "BOT/DEMO - CafeNoir",
    "BOT/DEMO - Mindflow",
    "BOT/DEMO - Aurora",
    "BOT/DEMO - Hábito",
    "BOT/DEMO - Pomodoro",
    "BOT/DEMO - Rayo",
    "BOT/DEMO - Nimbus",
    "BOT/DEMO - Kimchi",
    "BOT/DEMO - FocusBee",
    "BOT/DEMO - ZenLoop",
    "BOT/DEMO - Menta",
    "BOT/DEMO - Cobalto",
    "BOT/DEMO - Vector",
    "BOT/DEMO - Sombra",
    "BOT/DEMO - Delta",
    "BOT/DEMO - Llama",
  ];

  await Promise.all(
    bots.map((alias, index) => {
      const points = 60 + index * 5;
      const userId = `bot-${index}`;
      return env.NONAME_KV.put(
        `user:${userId}`,
        JSON.stringify({
          id: userId,
          alias,
          points,
          minutes: Math.floor(points / 10) * 15,
          updatedAt: Date.now(),
        })
      );
    })
  );

  return { status: "Bots DEMO sembrados" };
}

function getWeekKey(timestamp) {
  const date = new Date(timestamp);
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date - firstDay) / 86400000);
  const week = Math.ceil((dayOfYear + firstDay.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
