import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DB_PATH = join(DATA_DIR, "eventsfactory.sqlite");
const COLORS = ["#d4af37", "#6ea8fe", "#f0a36b", "#7bdcb5", "#d4a5c9", "#e07a6a", "#b8a1ff"];

mkdirSync(DATA_DIR, { recursive: true });

export const sqlite = new DatabaseSync(DB_PATH);
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('manager', 'crew')),
    title TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT NOT NULL DEFAULT '',
    venue TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    type TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    event_id TEXT NOT NULL DEFAULT '',
    assignee_id TEXT NOT NULL,
    due_date TEXT NOT NULL,
    due_time TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'todo',
    created_by TEXT NOT NULL,
    FOREIGN KEY (assignee_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

export function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function isoOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function publicUser(row, { includeEmail = false } = {}) {
  if (!row) return null;
  const user = {
    id: row.id,
    name: row.name,
    role: row.role,
    title: row.title,
    color: row.color,
  };
  if (includeEmail) user.email = row.email;
  return user;
}

export function findUserByEmail(email) {
  return sqlite.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email);
}

export function findUserById(id) {
  return sqlite.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function listUsers() {
  return sqlite.prepare("SELECT * FROM users ORDER BY role DESC, name").all();
}

export function createUser({ name, email, password = "demo", role, title, color }) {
  const id = uid("u");
  sqlite.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, title, color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name,
    email.toLowerCase(),
    bcrypt.hashSync(password, 10),
    role,
    title,
    color || COLORS[listUsers().length % COLORS.length],
    new Date().toISOString()
  );
  return findUserById(id);
}

export function listEvents() {
  return sqlite.prepare("SELECT * FROM events ORDER BY date").all().map((row) => ({
    id: row.id,
    name: row.name,
    client: row.client,
    venue: row.venue,
    date: row.date,
    endDate: row.end_date,
    type: row.type,
    notes: row.notes,
    createdBy: row.created_by,
  }));
}

export function listOrders() {
  return sqlite.prepare("SELECT * FROM orders ORDER BY due_date, due_time").all().map((row) => ({
    id: row.id,
    title: row.title,
    details: row.details,
    eventId: row.event_id,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    dueTime: row.due_time,
    priority: row.priority,
    status: row.status,
    createdBy: row.created_by,
  }));
}

export function upsertEvent(event) {
  sqlite.prepare(
    `INSERT INTO events (id, name, client, venue, date, end_date, type, notes, created_by)
     VALUES (@id, @name, @client, @venue, @date, @endDate, @type, @notes, @createdBy)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       client = excluded.client,
       venue = excluded.venue,
       date = excluded.date,
       end_date = excluded.end_date,
       type = excluded.type,
       notes = excluded.notes`
  ).run({
    id: event.id,
    name: event.name,
    client: event.client || "",
    venue: event.venue || "",
    date: event.date,
    endDate: event.endDate || event.date,
    type: event.type,
    notes: event.notes || "",
    createdBy: event.createdBy,
  });
}

export function upsertOrder(order) {
  sqlite.prepare(
    `INSERT INTO orders (id, title, details, event_id, assignee_id, due_date, due_time, priority, status, created_by)
     VALUES (@id, @title, @details, @eventId, @assigneeId, @dueDate, @dueTime, @priority, @status, @createdBy)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       details = excluded.details,
       event_id = excluded.event_id,
       assignee_id = excluded.assignee_id,
       due_date = excluded.due_date,
       due_time = excluded.due_time,
       priority = excluded.priority,
       status = excluded.status`
  ).run({
    id: order.id,
    title: order.title,
    details: order.details || "",
    eventId: order.eventId || "",
    assigneeId: order.assigneeId,
    dueDate: order.dueDate,
    dueTime: order.dueTime || "",
    priority: order.priority || "normal",
    status: order.status || "todo",
    createdBy: order.createdBy,
  });
}

export function deleteEvent(id) {
  sqlite.prepare("UPDATE orders SET event_id = '' WHERE event_id = ?").run(id);
  sqlite.prepare("DELETE FROM events WHERE id = ?").run(id);
}

export function deleteOrder(id) {
  sqlite.prepare("DELETE FROM orders WHERE id = ?").run(id);
}

export function seedIfEmpty() {
  const count = sqlite.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (count > 0) return;

  const hash = bcrypt.hashSync("demo", 10);
  const now = new Date().toISOString();
  const users = [
    ["u_maya", "Maya Chen", "maya@eventsfactory.studio", hash, "manager", "Operations manager", COLORS[0]],
    ["u_alex", "Alex Rivera", "alex@eventsfactory.studio", hash, "crew", "Lighting lead", COLORS[1]],
    ["u_jordan", "Jordan Blake", "jordan@eventsfactory.studio", hash, "crew", "Catering captain", COLORS[2]],
    ["u_sam", "Sam Okonkwo", "sam@eventsfactory.studio", hash, "crew", "Logistics", COLORS[3]],
    ["u_riley", "Riley Chen", "riley@eventsfactory.studio", hash, "crew", "Floral & décor", COLORS[4]],
  ];
  const insertUser = sqlite.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, title, color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const row of users) insertUser.run(...row, now);

  const insertEvent = sqlite.prepare(
    `INSERT INTO events (id, name, client, venue, date, end_date, type, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertEvent.run("e_wedding", "Harper & Cole wedding", "Harper Cole", "The Glasshouse", isoOffset(3), isoOffset(3), "Wedding", "Ceremony 4pm. Load-in from 8am.", "u_maya");
  insertEvent.run("e_summit", "Apex Tech Summit", "Apex Labs", "Harbor Convention Center", isoOffset(9), isoOffset(10), "Corporate", "Two-day keynote + expo floor.", "u_maya");
  insertEvent.run("e_gallery", "Luna Gallery opening", "Luna Arts", "Luna Gallery", isoOffset(17), isoOffset(17), "Exhibition", "Invite-only preview at 6pm.", "u_maya");

  const insertOrder = sqlite.prepare(
    `INSERT INTO orders (id, title, details, event_id, assignee_id, due_date, due_time, priority, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertOrder.run("o1", "Confirm florist delivery window", "Call Bloom & Branch. Need peonies on site by 10:00.", "e_wedding", "u_riley", isoOffset(0), "09:30", "high", "in_progress", "u_maya");
  insertOrder.run("o2", "Pull Glasshouse lighting plot", "Front-of-house warm wash, no color on vows.", "e_wedding", "u_alex", isoOffset(0), "11:00", "urgent", "todo", "u_maya");
  insertOrder.run("o3", "Van load-in checklist", "China, linens, signage, spare gaffer.", "e_wedding", "u_sam", isoOffset(2), "16:00", "normal", "todo", "u_maya");
  insertOrder.run("o4", "Menu tasting with couple", "Vegetarian main + late-night grilled cheese.", "e_wedding", "u_jordan", isoOffset(1), "14:00", "high", "todo", "u_maya");
  insertOrder.run("o5", "Ceremony seating chart print", "Final headcount 148. Escort cards in navy.", "e_wedding", "u_riley", isoOffset(3), "08:00", "normal", "todo", "u_maya");
  insertOrder.run("o6", "Stage power drop for keynote", "32A to center. Confirm house electrician.", "e_summit", "u_alex", isoOffset(8), "10:00", "urgent", "todo", "u_maya");
  insertOrder.run("o7", "Expo booth load map", "Dock 3 overnight. No forklift after 07:00.", "e_summit", "u_sam", isoOffset(8), "18:00", "high", "todo", "u_maya");
  insertOrder.run("o8", "Speaker green-room catering", "Coffee + fruit. No nuts. 40 covers.", "e_summit", "u_jordan", isoOffset(9), "07:30", "normal", "todo", "u_maya");
  insertOrder.run("o9", "Gallery lighting focus", "No UV on oils. Dim to 40% for preview.", "e_gallery", "u_alex", isoOffset(16), "13:00", "normal", "todo", "u_maya");
  insertOrder.run("o10", "Collect radios from last gig", "6 packs still at The Glasshouse office.", "", "u_sam", isoOffset(0), "15:00", "low", "done", "u_maya");
}
