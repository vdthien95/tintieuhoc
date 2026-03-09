import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("scratch_master.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    schoolName TEXT NOT NULL,
    phone TEXT,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    grade INTEGER NOT NULL,
    teacherEmail TEXT NOT NULL,
    FOREIGN KEY (teacherEmail) REFERENCES teachers(email)
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    classCode TEXT NOT NULL,
    progress TEXT, -- JSON string
    analysis TEXT, -- JSON string
    FOREIGN KEY (classCode) REFERENCES classes(code)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Teacher Auth
  app.post("/api/auth/teacher/register", (req, res) => {
    const { email, name, schoolName, phone, password } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO teachers (email, name, schoolName, phone, password) VALUES (?, ?, ?, ?, ?)");
      stmt.run(email, name, schoolName, phone, password);
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        res.status(400).json({ error: "Email đã tồn tại" });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/auth/teacher/login", (req, res) => {
    const { email, password } = req.body;
    const teacher = db.prepare("SELECT * FROM teachers WHERE email = ? AND password = ?").get(email, password);
    if (teacher) {
      res.json({ success: true, teacher });
    } else {
      res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
    }
  });

  app.post("/api/auth/teacher/forgot-password", (req, res) => {
    const { email, newPassword } = req.body;
    const result = db.prepare("UPDATE teachers SET password = ? WHERE email = ?").run(newPassword, email);
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Email không tồn tại" });
    }
  });

  // Class Management
  app.get("/api/teacher/classes", (req, res) => {
    const { email } = req.query;
    const classes = db.prepare("SELECT * FROM classes WHERE teacherEmail = ?").all(email);
    res.json(classes);
  });

  app.post("/api/teacher/classes", (req, res) => {
    const { id, name, code, grade, teacherEmail } = req.body;
    try {
      db.prepare("INSERT INTO classes (id, name, code, grade, teacherEmail) VALUES (?, ?, ?, ?, ?)").run(id, name, code, grade, teacherEmail);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: "Mã lớp đã tồn tại" });
    }
  });

  app.delete("/api/teacher/classes/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM classes WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Student Management & Progress
  app.get("/api/students", (req, res) => {
    const { classCode } = req.query;
    const students = db.prepare("SELECT * FROM students WHERE classCode = ?").all(classCode);
    const classInfo = db.prepare("SELECT * FROM classes WHERE code = ?").get(classCode);
    
    res.json({
      students: students.map((s: any) => ({
        student: {
          name: s.name,
          classCode: s.classCode,
        },
        progress: JSON.parse(s.progress || '{"theory":[],"practice":[],"challenges":[],"problem_history":[]}'),
        analysis: JSON.parse(s.analysis || 'null')
      })),
      classInfo
    });
  });

  app.post("/api/auth/student/login", (req, res) => {
    const { name, classCode } = req.body;
    let student = db.prepare("SELECT * FROM students WHERE name = ? AND classCode = ?").get(name, classCode) as any;
    
    if (!student) {
      const id = `${classCode}_${name}_${Date.now()}`;
      db.prepare("INSERT INTO students (id, name, classCode, progress) VALUES (?, ?, ?, ?)").run(
        id, name, classCode, JSON.stringify({ theory: [], practice: [], challenges: [], problem_history: [] })
      );
      student = db.prepare("SELECT * FROM students WHERE id = ?").get(id);
    }

    const classInfo = db.prepare("SELECT * FROM classes WHERE code = ?").get(classCode) as any;
    const teacher = db.prepare("SELECT * FROM teachers WHERE email = ?").get(classInfo.teacherEmail) as any;

    res.json({
      success: true,
      student: {
        name: student.name,
        className: classInfo.name,
        grade: classInfo.grade,
        schoolName: teacher.schoolName,
        teacherName: teacher.name,
        classCode: student.classCode
      },
      progress: JSON.parse(student.progress || '{"theory":[],"practice":[],"challenges":[]}'),
      analysis: JSON.parse(student.analysis || 'null')
    });
  });

  app.post("/api/student/sync", (req, res) => {
    const { name, classCode, progress, analysis } = req.body;
    db.prepare("UPDATE students SET progress = ?, analysis = ? WHERE name = ? AND classCode = ?").run(
      JSON.stringify(progress),
      JSON.stringify(analysis),
      name,
      classCode
    );
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
