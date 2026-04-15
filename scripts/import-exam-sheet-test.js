#!/usr/bin/env node

/**
 * Test importer for exam results from a spreadsheet CSV.
 *
 * Usage example:
 *   node scripts/import-exam-sheet-test.js --file data.csv --courseCode "BIT 6214" --courseName "Web Design & Publishing (HTML/CSS)" --credits 3 \
 *     --faculty "Computing and ICT" --department "BIT" --sessionName "2023/2024" --semesterName "3rd" --examTypeCode "FINAL" --enteredBy "test-import"
 *
 * Notes:
 * - Creates placeholder students if missing (fills required student fields with dummy values).
 * - Creates course/session/semester/examType if missing.
 * - Upserts exam results by (studentId, courseId, examTypeId, sessionId, semesterId).
 */

const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const mysql = require("mysql2/promise")

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith("--")) {
      args[key] = true
    } else {
      args[key] = next
      i++
    }
  }
  return args
}

function normalizeGender(g) {
  const s = String(g || "").trim().toLowerCase()
  if (!s) return "other"
  if (s.startsWith("m")) return "male"
  if (s.startsWith("f")) return "female"
  return "other"
}

function splitName(fullName) {
  const s = String(fullName || "").trim().replace(/\s+/g, " ")
  if (!s) return { firstName: "Test", lastName: "Student" }
  const parts = s.split(" ")
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

function calculateGradePoint(percentage) {
  if (percentage >= 90) return 4.0
  if (percentage >= 80) return 3.0
  if (percentage >= 65) return 2.0
  if (percentage >= 50) return 1.0
  return 0.0
}

function calculateLetterGrade(percentage) {
  if (percentage >= 90) return "A"
  if (percentage >= 80) return "B"
  if (percentage >= 65) return "C"
  if (percentage >= 50) return "D"
  return "F"
}

function parseCsv(text) {
  const rows = []
  let cur = []
  let cell = ""
  let inQuotes = false

  const pushCell = () => {
    cur.push(cell)
    cell = ""
  }
  const pushRow = () => {
    // Skip completely empty rows
    if (cur.some((c) => String(c || "").trim() !== "")) rows.push(cur)
    cur = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && ch === ",") {
      pushCell()
      continue
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++
      pushCell()
      pushRow()
      continue
    }

    cell += ch
  }

  pushCell()
  pushRow()

  if (rows.length === 0) return { headers: [], data: [] }

  const headers = rows[0].map((h) => String(h || "").trim())
  const data = rows.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = String(r[idx] ?? "").trim()
    })
    return obj
  })

  return { headers, data }
}

function findColumn(headers, candidates) {
  const normalized = headers.map((h) => String(h || "").trim().toLowerCase())
  for (const cand of candidates) {
    const c = String(cand).toLowerCase()
    const idx = normalized.findIndex((h) => h === c)
    if (idx >= 0) return headers[idx]
  }
  // fuzzy contains
  for (const cand of candidates) {
    const c = String(cand).toLowerCase()
    const idx = normalized.findIndex((h) => h.includes(c))
    if (idx >= 0) return headers[idx]
  }
  return null
}

function detectScore(row, headers) {
  const gradeValues = new Set(["A", "B", "C", "D", "F"])
  const cells = headers.map((h) => String(row[h] ?? "").trim())

  let gradeIndex = -1
  for (let i = 0; i < cells.length; i++) {
    if (gradeValues.has(cells[i].toUpperCase())) {
      gradeIndex = i
      break
    }
  }

  const numericCandidates = []
  for (let i = 0; i < cells.length; i++) {
    const raw = cells[i]
    const v = Number(String(raw).replace(/[^0-9.\-]/g, ""))
    if (!Number.isFinite(v)) continue
    if (v < 0 || v > 100) continue
    numericCandidates.push({ i, v })
  }

  if (numericCandidates.length === 0) return null

  // Prefer the numeric cell immediately before grade.
  if (gradeIndex > 0) {
    const beforeGrade = numericCandidates.filter((c) => c.i < gradeIndex)
    if (beforeGrade.length > 0) return beforeGrade[beforeGrade.length - 1].v
  }

  // Otherwise take the last numeric 0..100.
  return numericCandidates[numericCandidates.length - 1].v
}

function parseSessionDates(sessionName) {
  // Supports "2023/2024" or "2023-2024"
  const m = String(sessionName || "").match(/(20\d{2})\s*[\/-]\s*(20\d{2})/)
  if (m) {
    const startYear = Number(m[1])
    const endYear = Number(m[2])
    return {
      startDate: `${startYear}-09-01`,
      endDate: `${endYear}-06-30`,
    }
  }
  const now = new Date()
  const y = now.getFullYear()
  return { startDate: `${y}-01-01`, endDate: `${y}-12-31` }
}

async function ensureTables(conn) {
  await conn.execute(
    `CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      isActive BOOLEAN DEFAULT FALSE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_isActive (isActive)
    ) ENGINE=InnoDB`,
  )

  await conn.execute(
    `CREATE TABLE IF NOT EXISTS academic_module_semesters (
      id VARCHAR(36) PRIMARY KEY,
      sessionId VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sessionId (sessionId)
    ) ENGINE=InnoDB`,
  )

  await conn.execute(
    `CREATE TABLE IF NOT EXISTS academic_module_exam_types (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(30) NOT NULL,
      weight DECIMAL(6,2) NOT NULL DEFAULT 0,
      description TEXT NULL,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_code (code),
      INDEX idx_isActive (isActive)
    ) ENGINE=InnoDB`,
  )

  await conn.execute(
    `CREATE TABLE IF NOT EXISTS academic_module_courses (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      code VARCHAR(30) NULL,
      credits DECIMAL(4,2) NULL,
      faculty VARCHAR(100) NULL,
      department VARCHAR(100) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_type (type),
      INDEX idx_name (name),
      INDEX idx_code (code),
      INDEX idx_department (department)
    ) ENGINE=InnoDB`,
  )

  await conn.execute(
    `CREATE TABLE IF NOT EXISTS academic_module_students (
      id VARCHAR(36) PRIMARY KEY,
      sequence BIGINT NOT NULL AUTO_INCREMENT UNIQUE,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      passwordHash VARCHAR(255) NULL,
      birthday DATE NULL,
      phone VARCHAR(50) NOT NULL,
      className VARCHAR(100) NOT NULL,
      sectionName VARCHAR(100) NOT NULL,
      gender VARCHAR(20) NOT NULL,
      bloodType VARCHAR(10) NOT NULL,
      nationality VARCHAR(100) NOT NULL,
      religion VARCHAR(50) NOT NULL,
      address VARCHAR(255) NOT NULL,
      address2 VARCHAR(255) NULL,
      city VARCHAR(100) NOT NULL,
      zip VARCHAR(20) NOT NULL,
      idCardNumber VARCHAR(50) NULL,
      boardRegistrationNo VARCHAR(50) NULL,
      fatherName VARCHAR(100) NOT NULL,
      motherName VARCHAR(100) NOT NULL,
      fatherPhone VARCHAR(50) NOT NULL,
      motherPhone VARCHAR(50) NOT NULL,
      fatherOccupation VARCHAR(100) NULL,
      motherOccupation VARCHAR(100) NULL,
      fatherEmail VARCHAR(255) NULL,
      motherEmail VARCHAR(255) NULL,
      emergencyContact VARCHAR(50) NOT NULL,
      medicalConditions TEXT NULL,
      allergies TEXT NULL,
      previousSchool VARCHAR(255) NULL,
      transferReason TEXT NULL,
      studentId VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      enrollmentDate DATE NOT NULL DEFAULT (CURRENT_DATE),
      photo MEDIUMTEXT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_email (email),
      UNIQUE KEY uniq_studentId (studentId),
      INDEX idx_status (status),
      INDEX idx_class_section (className, sectionName),
      INDEX idx_name (lastName, firstName)
    ) ENGINE=InnoDB`,
  )

  await conn.execute(
    `CREATE TABLE IF NOT EXISTS academic_module_exam_results (
      id VARCHAR(36) PRIMARY KEY,
      studentId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      examTypeId VARCHAR(36) NOT NULL,
      sessionId VARCHAR(36) NOT NULL,
      semesterId VARCHAR(36) NOT NULL,
      score DECIMAL(10,2) NOT NULL,
      maxScore DECIMAL(10,2) NOT NULL,
      percentage DECIMAL(6,2) NOT NULL,
      gradePoint DECIMAL(4,2) NOT NULL,
      letterGrade VARCHAR(3) NOT NULL,
      comments TEXT NULL,
      isPublished BOOLEAN NOT NULL DEFAULT FALSE,
      enteredBy VARCHAR(255) NOT NULL,
      enteredAt DATETIME NOT NULL,
      modifiedBy VARCHAR(255) NULL,
      modifiedAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_studentId (studentId),
      INDEX idx_courseId (courseId),
      INDEX idx_examTypeId (examTypeId),
      INDEX idx_session_semester (sessionId, semesterId),
      INDEX idx_isPublished (isPublished),
      INDEX idx_enteredAt (enteredAt)
    ) ENGINE=InnoDB`,
  )
}

async function getOrCreateExamType(conn, code) {
  const norm = String(code || "").trim().toUpperCase()
  const [rows] = await conn.execute("SELECT id FROM academic_module_exam_types WHERE UPPER(code)=? LIMIT 1", [norm])
  if (rows.length) return rows[0].id
  const id = crypto.randomUUID()
  await conn.execute(
    "INSERT INTO academic_module_exam_types (id, name, code, weight, isActive) VALUES (?, ?, ?, 100, TRUE)",
    [id, norm, norm],
  )
  return id
}

async function getOrCreateSession(conn, sessionName) {
  const name = String(sessionName || "").trim() || "Test Session"
  const [rows] = await conn.execute("SELECT id FROM sessions WHERE name=? LIMIT 1", [name])
  if (rows.length) return rows[0].id
  const id = crypto.randomUUID()
  const { startDate, endDate } = parseSessionDates(name)
  await conn.execute("INSERT INTO sessions (id, name, startDate, endDate, isActive) VALUES (?, ?, ?, ?, FALSE)", [
    id,
    name,
    startDate,
    endDate,
  ])
  return id
}

async function getOrCreateSemester(conn, sessionId, semesterName) {
  const name = String(semesterName || "").trim() || "Semester"
  const [rows] = await conn.execute(
    "SELECT id FROM academic_module_semesters WHERE sessionId=? AND name=? LIMIT 1",
    [sessionId, name],
  )
  if (rows.length) return rows[0].id

  const id = crypto.randomUUID()
  // Simple default dates; not used for calculations here.
  const startDate = new Date().toISOString().slice(0, 10)
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10)
  await conn.execute(
    "INSERT INTO academic_module_semesters (id, sessionId, name, startDate, endDate) VALUES (?, ?, ?, ?, ?)",
    [id, sessionId, name, startDate, endDate],
  )
  return id
}

async function getOrCreateCourse(conn, opts) {
  const code = String(opts.courseCode || "").trim()
  const name = String(opts.courseName || "").trim() || code || "Test Course"
  const type = String(opts.courseType || "Core").trim() || "Core"
  const credits = opts.credits !== undefined ? Number(opts.credits) : null
  const faculty = opts.faculty ? String(opts.faculty).trim() : null
  const department = opts.department ? String(opts.department).trim() : null

  if (code) {
    const [rows] = await conn.execute("SELECT id FROM academic_module_courses WHERE LOWER(code)=LOWER(?) LIMIT 1", [code])
    if (rows.length) return rows[0].id
  }

  const id = crypto.randomUUID()
  await conn.execute(
    "INSERT INTO academic_module_courses (id, name, type, code, credits, faculty, department) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, name, type, code || null, Number.isFinite(credits) ? credits : null, faculty, department],
  )
  return id
}

async function getOrCreateStudent(conn, row) {
  const studentBusinessId = String(row.studentBusinessId || "").trim()
  if (!studentBusinessId) throw new Error("Missing student ID")

  const [rows] = await conn.execute("SELECT id FROM academic_module_students WHERE studentId=? LIMIT 1", [studentBusinessId])
  if (rows.length) return rows[0].id

  const id = crypto.randomUUID()
  const { firstName, lastName } = splitName(row.name)
  const gender = normalizeGender(row.gender)

  // Fill required fields with dummy values for testing.
  const email = `${studentBusinessId}@import.test`
  await conn.execute(
    `INSERT INTO academic_module_students (
      id, firstName, lastName, email, phone, className, sectionName, gender,
      bloodType, nationality, religion, address, city, zip,
      fatherName, motherName, fatherPhone, motherPhone,
      emergencyContact, studentId
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )`,
    [
      id,
      firstName || "Test",
      lastName || "Student",
      email,
      "0000000000",
      "Test",
      "A",
      gender,
      "O+",
      "Unknown",
      "Unknown",
      "N/A",
      "N/A",
      "00000",
      "N/A",
      "N/A",
      "0000000000",
      "0000000000",
      "0000000000",
      studentBusinessId,
    ],
  )

  return id
}

async function upsertExamResult(conn, params) {
  const [existing] = await conn.execute(
    `SELECT id FROM academic_module_exam_results
     WHERE studentId=? AND courseId=? AND examTypeId=? AND sessionId=? AND semesterId=?
     LIMIT 1`,
    [params.studentUuid, params.courseUuid, params.examTypeUuid, params.sessionId, params.semesterId],
  )

  const percentage = (params.score / params.maxScore) * 100
  const gradePoint = calculateGradePoint(percentage)
  const letterGrade = calculateLetterGrade(percentage)
  const now = new Date()

  if (existing.length) {
    await conn.execute(
      `UPDATE academic_module_exam_results
       SET score=?, maxScore=?, percentage=?, gradePoint=?, letterGrade=?, comments=NULLIF(?,''),
           modifiedBy=?, modifiedAt=?
       WHERE id=?`,
      [
        params.score,
        params.maxScore,
        percentage,
        gradePoint,
        letterGrade,
        params.comments || "",
        params.enteredBy,
        now,
        existing[0].id,
      ],
    )
    return { action: "updated", id: existing[0].id }
  }

  const id = crypto.randomUUID()
  await conn.execute(
    `INSERT INTO academic_module_exam_results (
      id, studentId, courseId, examTypeId, sessionId, semesterId,
      score, maxScore, percentage, gradePoint, letterGrade,
      comments, isPublished, enteredBy, enteredAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      NULLIF(?,''), FALSE, ?, ?
    )`,
    [
      id,
      params.studentUuid,
      params.courseUuid,
      params.examTypeUuid,
      params.sessionId,
      params.semesterId,
      params.score,
      params.maxScore,
      percentage,
      gradePoint,
      letterGrade,
      params.comments || "",
      params.enteredBy,
      now,
    ],
  )

  return { action: "inserted", id }
}

async function main() {
  const args = parseArgs(process.argv)

  const file = args.file
  if (!file) {
    console.error("Missing --file <path-to-csv>")
    process.exit(2)
  }

  const courseCode = args.courseCode || args.course_code
  const courseName = args.courseName
  const credits = args.credits
  const faculty = args.faculty
  const department = args.department
  const examTypeCode = args.examTypeCode || "FINAL"
  const sessionName = args.sessionName || "Test Session"
  const semesterName = args.semesterName || "Semester"
  const enteredBy = args.enteredBy || "test-import"
  const maxScore = args.maxScore ? Number(args.maxScore) : 100

  const host = process.env.MYSQL_HOST || "localhost"
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
  const user = process.env.MYSQL_USER || "root"
  const password = process.env.MYSQL_PASSWORD || "4593697"
  const database = process.env.MYSQL_DATABASE || "academic_db"

  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file)
  const text = fs.readFileSync(abs, "utf8")
  const { headers, data } = parseCsv(text)
  if (!headers.length || !data.length) {
    console.error("CSV appears empty (need a header row + data rows)")
    process.exit(2)
  }

  const idCol =
    findColumn(headers, ["studentId", "studentNumber", "idnum", "id", "student_id"]) ||
    findColumn(headers, ["idnum", "id number", "student number", "idnum\t"]) // fallback
  const nameCol = findColumn(headers, ["name", "studentName", "fullName", "student name"]) || "Name"
  const genderCol = findColumn(headers, ["gender", "sex"]) || "Gender"
  const scoreCol = findColumn(headers, ["score", "total", "marks", "totalScore", "final"]) // optional

  if (!idCol) {
    console.error(`Couldn't find an ID column. Headers: ${headers.join(", ")}`)
    process.exit(2)
  }

  console.log("Connecting to MySQL... (host/database from env or defaults)")
  const conn = await mysql.createConnection({ host, port, user, password, database, multipleStatements: false })

  try {
    await ensureTables(conn)

    const examTypeUuid = await getOrCreateExamType(conn, examTypeCode)
    const sessionId = await getOrCreateSession(conn, sessionName)
    const semesterId = await getOrCreateSemester(conn, sessionId, semesterName)
    const courseUuid = await getOrCreateCourse(conn, {
      courseCode,
      courseName,
      courseType: args.courseType || "Core",
      credits,
      faculty,
      department,
    })

    let inserted = 0
    let updated = 0
    let skipped = 0
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const studentBusinessId = String(row[idCol] || "").trim()
      if (!studentBusinessId) {
        skipped++
        continue
      }

      const name = String(row[nameCol] || "").trim()
      const gender = String(row[genderCol] || "").trim()

      let score = null
      if (scoreCol && row[scoreCol] !== undefined && String(row[scoreCol]).trim() !== "") {
        const v = Number(String(row[scoreCol]).replace(/[^0-9.\-]/g, ""))
        if (Number.isFinite(v)) score = v
      }
      if (score === null) {
        score = detectScore(row, headers)
      }
      if (score === null || !Number.isFinite(score)) {
        errors.push({ row: i + 2, field: "score", message: "Could not detect score", value: "" })
        continue
      }

      try {
        const studentUuid = await getOrCreateStudent(conn, { studentBusinessId, name, gender })
        const r = await upsertExamResult(conn, {
          studentUuid,
          courseUuid,
          examTypeUuid,
          sessionId,
          semesterId,
          score: Number(score),
          maxScore,
          comments: args.comments || "",
          enteredBy,
        })
        if (r.action === "inserted") inserted++
        else updated++
      } catch (e) {
        errors.push({ row: i + 2, field: "row", message: e.message || String(e), value: studentBusinessId })
      }
    }

    console.log("Done")
    console.log({ inserted, updated, skipped, errors: errors.slice(0, 20), errorCount: errors.length })

    if (errors.length) {
      process.exitCode = 1
    }
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error("Import failed:", e)
  process.exit(1)
})
