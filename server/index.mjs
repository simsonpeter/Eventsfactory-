import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import {
  createUser,
  deleteEvent,
  deleteOrder,
  findUserByEmail,
  findUserById,
  listEvents,
  listOrders,
  listUsers,
  publicUser,
  seedIfEmpty,
  sqlite,
  uid,
  upsertEvent,
  upsertOrder,
} from "./db.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const SECRET_PATH = join(DATA_DIR, "session.secret");
const COOKIE = "ef_session";
const PORT = Number(process.env.PORT || 8080);

mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(SECRET_PATH)) {
  writeFileSync(SECRET_PATH, randomBytes(32).toString("hex"));
}
const SECRET = process.env.SESSION_SECRET || readFileSync(SECRET_PATH, "utf8").trim();

seedIfEmpty();

function signSession(userId) {
  const body = Buffer.from(JSON.stringify({ uid: userId, t: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readSession(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.uid) return null;
    return findUserById(payload.uid) || null;
  } catch {
    return null;
  }
}

function setSession(res, userId) {
  res.cookie(COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function requireUser(req, res, next) {
  const user = readSession(req.cookies[COOKIE]);
  if (!user) return res.status(401).json({ error: "Sign in required." });
  req.user = user;
  next();
}

function requireManager(req, res, next) {
  if (req.user.role !== "manager") return res.status(403).json({ error: "Managers only." });
  next();
}

function deskPayload(user) {
  const isManager = user.role === "manager";
  return {
    me: publicUser(user, { includeEmail: true }),
    users: listUsers().map((row) => publicUser(row, { includeEmail: isManager })),
    events: listEvents(),
    orders: listOrders(),
  };
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  const n = sqlite.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  res.json({ ok: true, users: n, database: "sqlite" });
});

app.get("/api/desks", (_req, res) => {
  res.json(
    listUsers().map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      role: row.role,
      email: row.email,
    }))
  );
});

app.post("/api/login", (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  const user = findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Those credentials do not match a desk account." });
  }
  setSession(res, user.id);
  res.json(deskPayload(user));
});

app.post("/api/logout", (_req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/state", requireUser, (req, res) => {
  res.json(deskPayload(req.user));
});

app.post("/api/users", requireUser, requireManager, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const title = String(req.body?.title || "").trim();
  const role = req.body?.role === "manager" ? "manager" : "crew";
  if (!name || !email || !title) return res.status(400).json({ error: "Name, email, and title are required." });
  if (findUserByEmail(email)) return res.status(409).json({ error: "That email is already on the roster." });
  createUser({ name, email, title, role, password: "demo" });
  res.status(201).json(deskPayload(req.user));
});

app.post("/api/events", requireUser, requireManager, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const date = String(req.body?.date || "");
  if (!name || !date) return res.status(400).json({ error: "Name the event and set a date." });
  const event = {
    id: req.body.id || uid("e"),
    name,
    client: String(req.body.client || "").trim(),
    venue: String(req.body.venue || "").trim(),
    date,
    endDate: String(req.body.endDate || date),
    type: String(req.body.type || "Other"),
    notes: String(req.body.notes || "").trim(),
    createdBy: req.user.id,
  };
  if (event.endDate < event.date) return res.status(400).json({ error: "End date cannot be before start date." });
  upsertEvent(event);
  res.json(deskPayload(req.user));
});

app.delete("/api/events/:id", requireUser, requireManager, (req, res) => {
  deleteEvent(req.params.id);
  res.json(deskPayload(req.user));
});

app.post("/api/orders", requireUser, requireManager, (req, res) => {
  const title = String(req.body?.title || "").trim();
  const assigneeId = String(req.body?.assigneeId || "");
  const dueDate = String(req.body?.dueDate || "");
  if (!title || !assigneeId || !dueDate) {
    return res.status(400).json({ error: "Title, assignee, and due date are required." });
  }
  if (!findUserById(assigneeId)) return res.status(400).json({ error: "Unknown assignee." });
  const order = {
    id: req.body.id || uid("o"),
    title,
    details: String(req.body.details || "").trim(),
    eventId: String(req.body.eventId || ""),
    assigneeId,
    dueDate,
    dueTime: String(req.body.dueTime || ""),
    priority: String(req.body.priority || "normal"),
    status: String(req.body.status || "todo"),
    createdBy: req.user.id,
  };
  upsertOrder(order);
  res.json(deskPayload(req.user));
});

app.patch("/api/orders/:id", requireUser, (req, res) => {
  const existing = listOrders().find((o) => o.id === req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found." });
  const manager = req.user.role === "manager";
  if (!manager && existing.assigneeId !== req.user.id) {
    return res.status(403).json({ error: "This order is not yours." });
  }
  if (!manager) {
    const status = String(req.body?.status || existing.status);
    upsertOrder({ ...existing, status });
  } else {
    upsertOrder({
      ...existing,
      ...req.body,
      id: existing.id,
      createdBy: existing.createdBy,
    });
  }
  res.json(deskPayload(req.user));
});

app.delete("/api/orders/:id", requireUser, requireManager, (req, res) => {
  deleteOrder(req.params.id);
  res.json(deskPayload(req.user));
});

app.use("/css", express.static(join(ROOT, "css"), { dotfiles: "deny" }));
app.use("/js", express.static(join(ROOT, "js"), { dotfiles: "deny" }));
app.get("/", (_req, res) => {
  res.sendFile(join(ROOT, "index.html"));
});
app.get("/index.html", (_req, res) => {
  res.sendFile(join(ROOT, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Events Factory desk on http://localhost:${PORT}`);
});
