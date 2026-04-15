/*
  Usage:
    node scripts/db-find-student.js 5588

  Purpose:
    Identify where a student value (e.g. "5588") exists (students vs academic_module_students)
    and count related rows in key tables (exam results, transcripts).
*/

const mysql = require("mysql2/promise")

const fs = require("fs")
const path = require("path")

function loadEnvFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  if (!fs.existsSync(abs)) return
  const text = fs.readFileSync(abs, "utf8")
  for (const lineRaw of text.split(/\r?\n/)) {
    const line = lineRaw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

function env(name, fallback) {
  const v = String(process.env[name] || "").trim()
  return v ? v : fallback
}

async function main() {
  const needle = String(process.argv[2] || "").trim()
  if (!needle) {
    console.error("Missing student identifier argument (e.g. 5588)")
    process.exit(2)
  }

  loadEnvFile(".env.local")

  const config = {
    host: env("DB_HOST", "localhost"),
    port: Number(env("DB_PORT", "3306")),
    user: env("DB_USER", "root"),
    password: env("DB_PASSWORD", ""),
    database: env("DB_NAME", "academic_db"),
  }

  const conn = await mysql.createConnection(config)
  const exec = async (sql, params = []) => {
    const [rows] = await conn.execute(sql, params)
    return rows
  }

  console.log(`DB: ${config.database} @ ${config.host}:${config.port}`)

  const tablesToCheck = [
    "students",
    "academic_module_students",
    "exam_results",
    "academic_module_exam_results",
    "transcripts",
    "academic_module_transcripts",
  ]

  for (const t of tablesToCheck) {
    const rows = await exec(
      "SELECT TABLE_NAME as t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
      [t],
    )
    console.log(`table ${t}: ${rows.length ? "YES" : "no"}`)
  }

  try {
    const cols = await exec("SHOW COLUMNS FROM students")
    const colNames = cols.map((c) => c.Field)
    console.log("students columns:", colNames)
  } catch (e) {
    console.log("SHOW COLUMNS students error:", e.code || e.message)
  }

  const matches = []

  // Backend schema: students(studentNumber)
  try {
    const rows = await exec("SELECT * FROM students WHERE id = ? LIMIT 1", [needle])
    if (rows.length) matches.push({ table: "students", rows })
  } catch (e) {
    console.log("students query error:", e.code || e.message)
  }

  // App schema: academic_module_students(sequence, studentId)
  try {
    const sequence = Number(needle)
    const rows = await exec(
      "SELECT id, sequence, studentId, firstName, lastName, status FROM academic_module_students WHERE (sequence = ?) OR (studentId = ?) OR (id = ?) LIMIT 20",
      [Number.isFinite(sequence) ? sequence : -1, needle, needle],
    )
    if (rows.length) matches.push({ table: "academic_module_students", rows })
  } catch (e) {
    console.log("academic_module_students query error:", e.code || e.message)
  }

  console.log("\n=== Student matches ===")
  console.log(JSON.stringify(matches, null, 2))

  const studentIds = new Set()
  for (const m of matches) {
    for (const r of m.rows) {
      if (r && r.id) studentIds.add(String(r.id))
    }
  }

  console.log("\n=== Related row counts by student UUID ===")
  for (const sid of studentIds) {
    const counts = []

    const tryCount = async (table, whereSql, params) => {
      try {
        const rows = await exec(`SELECT COUNT(*) as c FROM ${table} WHERE ${whereSql}`, params)
        counts.push([table, Number(rows?.[0]?.c ?? 0)])
      } catch {
        // ignore
      }
    }

    await tryCount("exam_results", "studentId = ?", [sid])
    await tryCount("academic_module_exam_results", "studentId = ?", [sid])
    await tryCount("transcripts", "studentId = ?", [sid])

    console.log(`studentId ${sid}:`, counts)
  }

  await conn.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
