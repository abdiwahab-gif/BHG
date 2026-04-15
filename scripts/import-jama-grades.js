#!/usr/bin/env node
/*
  Import Jama grades.xlsx into academic_db

  What it does:
  - Ensures required tables exist (students, courses, sessions, semesters, exam types, exam results)
  - Creates/uses a sample student (business studentId)
  - Upserts sessions + semesters with: first semester in each academic year => Spring Semester, second => Fall Semester
  - Upserts courses by course code
  - Inserts/updates OVERALL exam results for each course row

  Usage:
    node scripts/import-jama-grades.js

  Optional env vars:
    DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
    IMPORT_STUDENT_ID (default: 6814)
    IMPORT_STUDENT_FIRST (default: Jama Mumin)
    IMPORT_STUDENT_LAST (default: Jama)
    IMPORT_FACULTY (default: Computing and Informatics)
    IMPORT_DEPARTMENT (default: Business Information Technology)
    IMPORT_PUBLISH (default: false)  // if true, marks imported results as published
    IMPORT_RESET (default: false)    // if true, deletes prior system-import rows for the student before importing
*/

const path = require("path")
const crypto = require("crypto")
const mysql = require("mysql2/promise")
const xlsx = require("xlsx")

function envBool(name, fallback = false) {
  const v = String(process.env[name] ?? "").trim().toLowerCase()
  if (!v) return fallback
  return v === "1" || v === "true" || v === "yes"
}

function parseAcademicYear(label) {
  const s = String(label || "").trim()
  const m = s.match(/(\d{4})\s*\/\s*(\d{4})/)
  if (!m) return null
  return { startYear: Number(m[1]), endYear: Number(m[2]), label: `${m[1]}/${m[2]}` }
}

function scoreForLetter(letter) {
  const g = String(letter || "").trim().toUpperCase()
  if (g === "A") return 90
  if (g === "B") return 80
  if (g === "C") return 65
  if (g === "D") return 50
  return 0
}

function gradePointForLetter(letter) {
  const g = String(letter || "").trim().toUpperCase()
  if (g === "A") return 4
  if (g === "B") return 3
  if (g === "C") return 2
  if (g === "D") return 1
  return 0
}

function normalizeCourseCode(code) {
  return String(code || "").trim().replace(/\s+/g, " ")
}

function normalizeCourseTitle(title) {
  return String(title || "").trim().replace(/\s+/g, " ")
}

function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(String(d))
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function makeSessionDates(academicYearLabel) {
  const parsed = parseAcademicYear(academicYearLabel)
  if (!parsed) {
    // Fallback: use current year range.
    const y = new Date().getFullYear()
    return {
      startDate: `${y}-09-01`,
      endDate: `${y + 1}-06-30`,
    }
  }

  return {
    startDate: `${parsed.startYear}-09-01`,
    endDate: `${parsed.endYear}-06-30`,
  }
}

function makeSemesterDates(academicYearLabel, termName) {
  const { startDate, endDate } = makeSessionDates(academicYearLabel)
  const startYear = Number(String(startDate).slice(0, 4))
  const endYear = Number(String(endDate).slice(0, 4))

  if (termName === "Spring Semester") {
    // First term (per requirement)
    return { startDate, endDate: `${endYear}-01-31` }
  }
  // Second term
  return { startDate: `${endYear}-02-01`, endDate }
}

async function ensureTables(conn) {
  await conn.query(
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

  await conn.query(
    `CREATE TABLE IF NOT EXISTS academic_module_semesters (
      id VARCHAR(36) PRIMARY KEY,
      sessionId VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sessionId (sessionId),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
  )

  await conn.query(
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

  await conn.query(
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

  await conn.query(
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

  await conn.query(
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
}

async function ensureExamTypeOverall(conn) {
  const [rows] = await conn.execute(
    "SELECT id FROM academic_module_exam_types WHERE UPPER(code) = 'OVERALL' LIMIT 1",
  )
  if (Array.isArray(rows) && rows.length) return rows[0].id

  const id = crypto.randomUUID()
  await conn.execute(
    "INSERT INTO academic_module_exam_types (id, name, code, weight, description, isActive) VALUES (?, ?, ?, ?, ?, TRUE)",
    [id, "Overall", "OVERALL", 100, "Overall result"],
  )
  return id
}

async function upsertSession(conn, academicYearLabel) {
  const name = String(academicYearLabel || "").trim()
  const [existing] = await conn.execute(
    "SELECT id, name FROM sessions WHERE name = ? LIMIT 1",
    [name],
  )
  if (Array.isArray(existing) && existing.length) return existing[0].id

  const id = crypto.randomUUID()
  const { startDate, endDate } = makeSessionDates(name)
  await conn.execute(
    "INSERT INTO sessions (id, name, startDate, endDate, isActive) VALUES (?, ?, ?, ?, FALSE)",
    [id, name, startDate, endDate],
  )
  return id
}

async function ensureSemester(conn, sessionId, academicYearLabel, termName) {
  const desiredName = termName

  const [existing] = await conn.execute(
    "SELECT id, name FROM academic_module_semesters WHERE sessionId = ? AND name = ? LIMIT 1",
    [sessionId, desiredName],
  )
  if (Array.isArray(existing) && existing.length) return existing[0].id

  // If the semester exists under a different but equivalent name, rename it.
  const [alt] = await conn.execute(
    "SELECT id, name FROM academic_module_semesters WHERE sessionId = ?",
    [sessionId],
  )

  const explicitMap = (name) => {
    const n = String(name || "").trim().toLowerCase()
    if (n.includes("spring")) return "Spring Semester"
    if (n.includes("fall")) return "Fall Semester"
    if (/\b(semester\s*)?1\b/.test(n) || n.includes("first")) return "Spring Semester"
    if (/\b(semester\s*)?2\b/.test(n) || n.includes("second")) return "Fall Semester"
    return ""
  }

  if (Array.isArray(alt) && alt.length) {
    for (const r of alt) {
      const mapped = explicitMap(r.name)
      if (mapped && mapped === desiredName) {
        await conn.execute(
          "UPDATE academic_module_semesters SET name = ? WHERE id = ?",
          [desiredName, r.id],
        )
        return r.id
      }
    }
  }

  const id = crypto.randomUUID()
  const { startDate, endDate } = makeSemesterDates(academicYearLabel, desiredName)
  await conn.execute(
    "INSERT INTO academic_module_semesters (id, sessionId, name, startDate, endDate) VALUES (?, ?, ?, ?, ?)",
    [id, sessionId, desiredName, startDate, endDate],
  )
  return id
}

async function upsertCourse(conn, code, title, credits, extra = {}) {
  const normalizedCode = normalizeCourseCode(code)
  const normalizedTitle = normalizeCourseTitle(title)
  const faculty = String(extra.faculty || "").trim()
  const department = String(extra.department || "").trim()

  const [existing] = await conn.execute(
    "SELECT id, name, credits, faculty, department FROM academic_module_courses WHERE LOWER(code) = LOWER(?) LIMIT 1",
    [normalizedCode],
  )

  if (Array.isArray(existing) && existing.length) {
    const row = existing[0]

    // If the incoming title differs, do NOT overwrite an existing course.
    // Instead, create an alternate code for the conflicting title (e.g. BIT 418-2).
    const existingName = String(row.name || "").trim()
    if (normalizedTitle && existingName && normalizedTitle.toLowerCase() !== existingName.toLowerCase()) {
      const altCodeBase = `${normalizedCode}-2`
      const altCode = altCodeBase.length <= 30 ? altCodeBase : altCodeBase.slice(0, 30)

      const [altExisting] = await conn.execute(
        "SELECT id, name FROM academic_module_courses WHERE LOWER(code) = LOWER(?) LIMIT 1",
        [altCode],
      )

      if (Array.isArray(altExisting) && altExisting.length) {
        return { id: altExisting[0].id, action: "existing" }
      }

      const altId = crypto.randomUUID()
      await conn.execute(
        "INSERT INTO academic_module_courses (id, name, type, code, credits, faculty, department) VALUES (?, ?, 'Core', ?, ?, NULLIF(?, ''), NULLIF(?, ''))",
        [altId, normalizedTitle, altCode, Number(credits), faculty, department],
      )
      return { id: altId, action: "inserted" }
    }

    // Conservative: only fill in missing credits/faculty/department; don't overwrite otherwise.
    const existingCredits = row.credits === null || row.credits === undefined ? null : Number(row.credits)
    const existingFaculty = String(row.faculty || "").trim()
    const existingDepartment = String(row.department || "").trim()

    const nextCredits = existingCredits === null && Number.isFinite(Number(credits)) ? Number(credits) : null
    const nextFaculty = !existingFaculty && faculty ? faculty : ""
    const nextDepartment = !existingDepartment && department ? department : ""

    if (nextCredits !== null || nextFaculty || nextDepartment) {
      await conn.execute(
        `UPDATE academic_module_courses
         SET credits = COALESCE(credits, ?),
             faculty = CASE WHEN faculty IS NULL OR faculty = '' THEN NULLIF(?, '') ELSE faculty END,
             department = CASE WHEN department IS NULL OR department = '' THEN NULLIF(?, '') ELSE department END
         WHERE id = ?`,
        [nextCredits, nextFaculty, nextDepartment, row.id],
      )
      return { id: row.id, action: "updated" }
    }

    return { id: row.id, action: "existing" }
  }

  const id = crypto.randomUUID()
  await conn.execute(
    "INSERT INTO academic_module_courses (id, name, type, code, credits, faculty, department) VALUES (?, ?, 'Core', ?, ?, NULLIF(?, ''), NULLIF(?, ''))",
    [id, normalizedTitle, normalizedCode, Number(credits), faculty, department],
  )
  return { id, action: "inserted" }
}

async function ensureStudent(conn, opts) {
  const studentId = String(opts.studentId || "").trim()
  const [existing] = await conn.execute(
    "SELECT id, studentId FROM academic_module_students WHERE studentId = ? LIMIT 1",
    [studentId],
  )
  if (Array.isArray(existing) && existing.length) return existing[0].id

  const id = crypto.randomUUID()
  const firstName = String(opts.firstName || "Jama").trim() || "Jama"
  const lastName = String(opts.lastName || "Sample").trim() || "Sample"
  const email = String(opts.email || "jama.sample@student.local").trim()

  await conn.execute(
    `INSERT INTO academic_module_students (
      id, firstName, lastName, email,
      phone, className, sectionName, gender,
      bloodType, nationality, religion,
      address, address2, city, zip,
      fatherName, motherName, fatherPhone, motherPhone,
      emergencyContact,
      studentId, status, enrollmentDate
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, NULL, ?, ?,
      ?, ?, ?, ?,
      ?,
      ?, 'active', ?
    )`,
    [
      id,
      firstName,
      lastName,
      email,
      "0000000000",
      "BIT",
      "A",
      "other",
      "O+",
      "Somaliland",
      "Islam",
      "Hargeisa",
      "Hargeisa",
      "00000",
      "Unknown",
      "Unknown",
      "0000000000",
      "0000000000",
      "0000000000",
      studentId,
      fmtDate(new Date()),
    ],
  )

  return id
}

async function upsertExamResult(conn, row) {
  const [existing] = await conn.execute(
    `SELECT id FROM academic_module_exam_results
     WHERE studentId = ? AND courseId = ? AND examTypeId = ? AND sessionId = ? AND semesterId = ?
     LIMIT 1`,
    [row.studentUuid, row.courseUuid, row.examTypeId, row.sessionId, row.semesterId],
  )

  const maxScore = 100
  const score = scoreForLetter(row.letterGrade)
  const percentage = score
  const gradePoint = gradePointForLetter(row.letterGrade)

  if (Array.isArray(existing) && existing.length) {
    await conn.execute(
      `UPDATE academic_module_exam_results
       SET score = ?, maxScore = ?, percentage = ?, gradePoint = ?, letterGrade = ?, isPublished = ?, modifiedBy = ?, modifiedAt = ?
       WHERE id = ?`,
      [
        score,
        maxScore,
        percentage,
        gradePoint,
        String(row.letterGrade || "").trim().toUpperCase(),
        row.isPublished ? 1 : 0,
        row.enteredBy,
        new Date(),
        existing[0].id,
      ],
    )
    return "updated"
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
      NULL, ?, ?, ?
    )`,
    [
      id,
      row.studentUuid,
      row.courseUuid,
      row.examTypeId,
      row.sessionId,
      row.semesterId,
      score,
      maxScore,
      percentage,
      gradePoint,
      String(row.letterGrade || "").trim().toUpperCase(),
      row.isPublished ? 1 : 0,
      row.enteredBy,
      new Date(),
    ],
  )

  return "inserted"
}

function parseWorkbookRows(filePath) {
  const wb = xlsx.readFile(filePath)
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" })

  const yearTermIndex = new Map() // academicYearLabel -> 0/1

  let current = null
  const out = []

  for (const r of rows) {
    const c0 = String((r && r[0]) || "").trim()
    if (!c0) continue

    const sem = c0.match(/^Semester\s*(\d+)\s*\(([^)]+)\)/i)
    if (sem) {
      const academicYear = String(sem[2] || "").trim()
      const nextIndex = (yearTermIndex.get(academicYear) || 0)
      const termName = nextIndex === 0 ? "Spring Semester" : "Fall Semester"
      yearTermIndex.set(academicYear, nextIndex + 1)

      current = { academicYear, termName }
      continue
    }

    // header
    if (c0.toLowerCase() === "c.code") continue

    if (!current) continue

    const code = normalizeCourseCode(r[0])
    const title = normalizeCourseTitle(r[1])
    const credits = Number(String(r[2] || "").trim())
    const grade = String(r[3] || "").trim().toUpperCase()

    if (!code || !title) continue
    if (!Number.isFinite(credits) || credits <= 0) continue
    if (!grade) continue

    out.push({
      academicYear: current.academicYear,
      termName: current.termName,
      courseCode: code,
      courseTitle: title,
      credits,
      letterGrade: grade,
    })
  }

  return out
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..")
  const filePath = path.resolve(projectRoot, "Jama grades.xlsx")

  const dbHost = process.env.DB_HOST || "localhost"
  const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306
  const dbUser = process.env.DB_USER || "root"
  const dbPassword = process.env.DB_PASSWORD || "4593697"
  const dbName = process.env.DB_NAME || "academic_db"

  const studentBusinessId = String(process.env.IMPORT_STUDENT_ID || "6814").trim()
  const firstName = String(process.env.IMPORT_STUDENT_FIRST || "Jama Mumin").trim()
  const lastName = String(process.env.IMPORT_STUDENT_LAST || "Jama").trim()
  const faculty = String(process.env.IMPORT_FACULTY || "Computing and Informatics").trim()
  const department = String(process.env.IMPORT_DEPARTMENT || "Business Information Technology").trim()
  const publish = envBool("IMPORT_PUBLISH", false)
  const reset = envBool("IMPORT_RESET", false)

  console.log("Importing:", path.basename(filePath))
  console.log("DB:", `${dbUser}@${dbHost}:${dbPort}/${dbName}`)

  const rows = parseWorkbookRows(filePath)
  if (!rows.length) {
    throw new Error("No course rows found in workbook")
  }

  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    multipleStatements: false,
  })

  try {
    await ensureTables(conn)

    const studentUuid = await ensureStudent(conn, {
      studentId: studentBusinessId,
      firstName,
      lastName,
      email: `jama.${studentBusinessId.toLowerCase()}@student.local`,
    })

    if (reset) {
      // Remove previously imported rows for this student (keeps any manually-entered rows).
      await conn.execute(
        "DELETE FROM academic_module_exam_results WHERE studentId = ? AND enteredBy = ?",
        [studentUuid, "system-import"],
      )
    }

    const overallExamTypeId = await ensureExamTypeOverall(conn)

    const sessionIdByYear = new Map()
    const semesterIdByKey = new Map()

    let sessionsCreated = 0
    let semestersCreatedOrRenamed = 0
    let coursesInserted = 0
    let coursesUpdated = 0
    let resultsInserted = 0
    let resultsUpdated = 0

    const enteredBy = "system-import"

    for (const r of rows) {
      const year = r.academicYear
      if (!sessionIdByYear.has(year)) {
        const before = await conn.execute("SELECT id FROM sessions WHERE name = ? LIMIT 1", [year])
        const id = await upsertSession(conn, year)
        sessionIdByYear.set(year, id)
        const existed = Array.isArray(before?.[0]) && before[0].length > 0
        if (!existed) sessionsCreated += 1
      }

      const sessionId = sessionIdByYear.get(year)
      const semKey = `${sessionId}::${r.termName}`
      if (!semesterIdByKey.has(semKey)) {
        const before = await conn.execute(
          "SELECT id FROM academic_module_semesters WHERE sessionId = ? AND name = ? LIMIT 1",
          [sessionId, r.termName],
        )
        const id = await ensureSemester(conn, sessionId, year, r.termName)
        semesterIdByKey.set(semKey, id)
        const existed = Array.isArray(before?.[0]) && before[0].length > 0
        if (!existed) semestersCreatedOrRenamed += 1
      }

      const semesterId = semesterIdByKey.get(semKey)

      const courseRes = await upsertCourse(conn, r.courseCode, r.courseTitle, r.credits, { faculty, department })
      if (courseRes.action === "inserted") coursesInserted += 1
      if (courseRes.action === "updated") coursesUpdated += 1

      const action = await upsertExamResult(conn, {
        studentUuid,
        courseUuid: courseRes.id,
        examTypeId: overallExamTypeId,
        sessionId,
        semesterId,
        letterGrade: r.letterGrade,
        enteredBy,
        isPublished: publish,
      })

      if (action === "inserted") resultsInserted += 1
      if (action === "updated") resultsUpdated += 1
    }

    console.log("\n✅ Import complete")
    console.log("Student business ID:", studentBusinessId)
    console.log("Student UUID:", studentUuid)
    console.log("Exam type:", "OVERALL")
    console.log("Sessions created:", sessionsCreated)
    console.log("Semesters created/renamed:", semestersCreatedOrRenamed)
    console.log("Courses inserted:", coursesInserted)
    console.log("Courses updated:", coursesUpdated)
    console.log("Results inserted:", resultsInserted)
    console.log("Results updated:", resultsUpdated)
    console.log("Published:", publish ? "YES" : "NO")
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error("\n❌ Import failed:", err && err.message ? err.message : err)
  process.exit(1)
})
