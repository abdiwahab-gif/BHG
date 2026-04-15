#!/usr/bin/env node

/**
 * One-time helper: normalize semesters for session "2023/2024".
 *
 * Rules:
 * - Semester 1 -> Spring Semester
 * - Semester 2 -> Fall Semester
 * - Dates are aligned to the academic year:
 *   - Fall:  YYYY-09-01 .. YYYY-12-31 (start year)
 *   - Spring: YYYY+1-01-01 .. YYYY+1-06-30 (end year)
 *
 * Run:
 *   node scripts/normalize-semesters-2023-2024.js
 */

const mysql = require("mysql2/promise")

function parseAcademicYear(sessionName) {
  const m = String(sessionName || "").match(/(20\d{2})\s*[\/-]\s*(20\d{2})/)
  if (!m) return null
  const startYear = Number(m[1])
  const endYear = Number(m[2])
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null
  return { startYear, endYear }
}

function normalizeSemesterName(semesterRaw) {
  const s = String(semesterRaw || "").trim()
  const lower = s.toLowerCase()

  // Dataset-specific cleanup: the imported XLSX used "3th".
  // Keep both rows usable by mapping them to the two standard terms.
  if (lower === "3th") return "Spring Semester"
  if (lower === "3rd") return "Fall Semester"

  if (lower.includes("spring")) return "Spring Semester"
  if (lower.includes("fall") || lower.includes("autumn")) return "Fall Semester"

  const numMatch = lower.match(/\b([12])\b/) || lower.match(/\b([12])(st|nd|rd|th)\b/)
  const n = numMatch ? Number(numMatch[1]) : NaN

  if (n === 1 || lower.includes("first")) return "Spring Semester"
  if (n === 2 || lower.includes("second")) return "Fall Semester"

  return s
}

async function main() {
  const host = process.env.MYSQL_HOST || "localhost"
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
  const user = process.env.MYSQL_USER || "root"
  const password = process.env.MYSQL_PASSWORD || "4593697"
  const database = process.env.MYSQL_DATABASE || "academic_db"

  const sessionName = "2023/2024"

  const conn = await mysql.createConnection({ host, port, user, password, database })
  try {
    const [sessions] = await conn.execute("SELECT id, name FROM sessions WHERE name = ? LIMIT 1", [sessionName])
    if (!sessions.length) {
      console.error(`Session not found: ${sessionName}`)
      process.exitCode = 2
      return
    }

    const sessionId = sessions[0].id
    const year = parseAcademicYear(sessionName)

    const [semesters] = await conn.execute(
      "SELECT id, name, startDate, endDate FROM academic_module_semesters WHERE sessionId = ?",
      [sessionId],
    )

    if (!semesters.length) {
      console.log("No semesters found for session", sessionName)
      return
    }

    let changed = 0

    for (const sem of semesters) {
      const currentName = String(sem.name || "").trim()
      const normalizedName = normalizeSemesterName(currentName)

      let startDate = sem.startDate
      let endDate = sem.endDate

      if (year && normalizedName === "Fall Semester") {
        startDate = `${year.startYear}-09-01`
        endDate = `${year.startYear}-12-31`
      } else if (year && normalizedName === "Spring Semester") {
        startDate = `${year.endYear}-01-01`
        endDate = `${year.endYear}-06-30`
      }

      if (normalizedName !== currentName || String(startDate) !== String(sem.startDate) || String(endDate) !== String(sem.endDate)) {
        await conn.execute(
          "UPDATE academic_module_semesters SET name = ?, startDate = ?, endDate = ? WHERE id = ?",
          [normalizedName, startDate, endDate, sem.id],
        )
        changed++
      }
    }

    console.log(`Normalized semesters for ${sessionName}. Updated rows: ${changed}`)
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error("Normalization failed:", e)
  process.exit(1)
})
