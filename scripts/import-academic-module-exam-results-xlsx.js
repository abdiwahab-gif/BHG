#!/usr/bin/env node

/**
 * Import `academic_module_exam_results.xlsx` into the database.
 *
 * Behavior:
 * - Creates/updates students in `academic_module_students` using IDNumber + StudentName + Gender (+ Class mapping).
 * - Creates/updates courses in `academic_module_courses` using CourseCode + CourseTitle + CreditHour + Faculty + Department.
 * - Creates/uses session in `sessions` from AcademicYear (e.g. 2023/2024).
 * - Creates/uses semester in `academic_module_semesters` from Semester (e.g. 3th) tied to the session.
 * - Inserts/updates ONE exam result per row in `academic_module_exam_results` as an OVERALL grade:
 *   score = Marks, maxScore = 100, comments = breakdown Attendance/Assignment/MidExam/FinalExam.
 *
 * Run:
 *   node scripts/import-academic-module-exam-results-xlsx.js --file academic_module_exam_results.xlsx --enteredBy "test-xlsx"
 */

const path = require("path")
const crypto = require("crypto")
const mysql = require("mysql2/promise")
const xlsx = require("xlsx")

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

function parseClassSection(classText) {
  const s = String(classText || "").trim().replace(/\s+/g, " ")
  if (!s) return { className: "Test", sectionName: "A" }
  const parts = s.split(" ")
  if (parts.length >= 2) {
    return { className: parts.slice(0, -1).join(" "), sectionName: parts[parts.length - 1] }
  }
  return { className: s, sectionName: "A" }
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

function parseSessionDates(sessionName) {
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

  // Dataset-specific cleanup: the provided XLSX uses "3th".
  // Map it into a real term name so UI/API expectations are consistent.
  if (lower === "3th") return "Spring Semester"

  // Handle explicit names first
  if (lower.includes("spring")) return "Spring Semester"
  if (lower.includes("fall") || lower.includes("autumn")) return "Fall Semester"

  // Extract a leading/embedded number: "1", "Semester 1", "1st", etc.
  const numMatch = lower.match(/\b([12])\b/) || lower.match(/\b([12])(st|nd|rd|th)\b/)
  const n = numMatch ? Number(numMatch[1]) : NaN

  if (n === 1 || lower.includes("first")) return "Spring Semester"
  if (n === 2 || lower.includes("second")) return "Fall Semester"

  return s
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

async function getOrCreateSemester(conn, sessionId, sessionName, semesterNameRaw) {
  const name = normalizeSemesterName(semesterNameRaw) || "Semester"
  const [rows] = await conn.execute(
    "SELECT id FROM academic_module_semesters WHERE sessionId=? AND name=? LIMIT 1",
    [sessionId, name],
  )
  if (rows.length) return rows[0].id

  const id = crypto.randomUUID()
  const year = parseAcademicYear(sessionName)
  let startDate
  let endDate
  if (year && name === "Fall Semester") {
    startDate = `${year.startYear}-09-01`
    endDate = `${year.startYear}-12-31`
  } else if (year && name === "Spring Semester") {
    startDate = `${year.endYear}-01-01`
    endDate = `${year.endYear}-06-30`
  } else {
    startDate = new Date().toISOString().slice(0, 10)
    endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10)
  }
  await conn.execute(
    "INSERT INTO academic_module_semesters (id, sessionId, name, startDate, endDate) VALUES (?, ?, ?, ?, ?)",
    [id, sessionId, name, startDate, endDate],
  )
  return id
}

async function upsertCourseByCode(conn, row) {
  const code = String(row.CourseCode || "").trim()
  const name = String(row.CourseTitle || "").trim() || code || "Course"
  const creditsRaw = row.CreditHour
  const credits = creditsRaw === undefined || creditsRaw === null || String(creditsRaw).trim() === "" ? null : Number(creditsRaw)
  const faculty = String(row.Faculty || "").trim() || null
  const department = String(row.Department || "").trim() || null

  if (!code) throw new Error("Missing CourseCode")

  const [existing] = await conn.execute(
    "SELECT id, name, credits, faculty, department FROM academic_module_courses WHERE LOWER(code)=LOWER(?) LIMIT 1",
    [code],
  )
  if (existing.length) {
    const id = existing[0].id
    // Keep it simple: update metadata if blank in DB.
    await conn.execute(
      "UPDATE academic_module_courses SET name=?, credits=?, faculty=?, department=? WHERE id=?",
      [name, Number.isFinite(credits) ? credits : null, faculty, department, id],
    )
    return id
  }

  const id = crypto.randomUUID()
  await conn.execute(
    "INSERT INTO academic_module_courses (id, name, type, code, credits, faculty, department) VALUES (?, ?, 'Core', ?, ?, ?, ?)",
    [id, name, code, Number.isFinite(credits) ? credits : null, faculty, department],
  )
  return id
}

async function upsertStudentByBusinessId(conn, row) {
  const studentBusinessId = String(row.IDNumber || "").trim()
  if (!studentBusinessId) throw new Error("Missing IDNumber")

  const [existing] = await conn.execute("SELECT id FROM academic_module_students WHERE studentId=? LIMIT 1", [studentBusinessId])
  if (existing.length) return existing[0].id

  const id = crypto.randomUUID()
  const { firstName, lastName } = splitName(row.StudentName)
  const gender = normalizeGender(row.Gender)
  const { className, sectionName } = parseClassSection(row.Class)

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
      className || "Test",
      sectionName || "A",
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
    return { action: "updated", id: existing[0].id, percentage, letterGrade }
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

  return { action: "inserted", id, percentage, letterGrade }
}

async function main() {
  const args = parseArgs(process.argv)
  const file = args.file || "academic_module_exam_results.xlsx"
  const enteredBy = args.enteredBy || "xlsx-import"
  const examTypeCode = (args.examTypeCode || "OVERALL").toString()
  const maxScore = args.maxScore ? Number(args.maxScore) : 100

  const host = process.env.MYSQL_HOST || "localhost"
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
  const user = process.env.MYSQL_USER || "root"
  const password = process.env.MYSQL_PASSWORD || "4593697"
  const database = process.env.MYSQL_DATABASE || "academic_db"

  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file)
  const wb = xlsx.readFile(abs, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = xlsx.utils.sheet_to_json(ws, { defval: "", raw: false })

  if (!rows.length) {
    console.error("No rows found in spreadsheet")
    process.exit(2)
  }

  const conn = await mysql.createConnection({ host, port, user, password, database })

  const cache = {
    courseByCode: new Map(),
    studentByIdNumber: new Map(),
    sessionByName: new Map(),
    semesterBySessionName: new Map(),
  }

  try {
    await ensureTables(conn)

    const examTypeUuid = await getOrCreateExamType(conn, examTypeCode)

    let inserted = 0
    let updated = 0
    let skipped = 0
    let gradeMismatches = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const idNumber = String(row.IDNumber || "").trim()
      const courseCode = String(row.CourseCode || "").trim()
      const yearName = String(row.AcademicYear || "").trim()
      const semesterName = normalizeSemesterName(row.Semester)

      if (!idNumber || !courseCode || !yearName || !semesterName) {
        skipped++
        continue
      }

      const marksRaw = row.Marks
      const marks = Number(String(marksRaw).replace(/[^0-9.\-]/g, ""))
      if (!Number.isFinite(marks)) {
        errors.push({ row: i + 2, field: "Marks", message: "Invalid Marks", value: String(marksRaw) })
        continue
      }

      const attendance = String(row.Attendance || "").trim()
      const assignment = String(row.Assignment || "").trim()
      const midExam = String(row.MidExam || "").trim()
      const finalExam = String(row.FinalExam || "").trim()
      const comments = `Attendance=${attendance}; Assignment=${assignment}; MidExam=${midExam}; FinalExam=${finalExam}`

      try {
        // Course
        let courseUuid = cache.courseByCode.get(courseCode.toLowerCase())
        if (!courseUuid) {
          courseUuid = await upsertCourseByCode(conn, row)
          cache.courseByCode.set(courseCode.toLowerCase(), courseUuid)
        }

        // Student
        let studentUuid = cache.studentByIdNumber.get(idNumber)
        if (!studentUuid) {
          studentUuid = await upsertStudentByBusinessId(conn, row)
          cache.studentByIdNumber.set(idNumber, studentUuid)
        }

        // Session + Semester
        let sessionId = cache.sessionByName.get(yearName)
        if (!sessionId) {
          sessionId = await getOrCreateSession(conn, yearName)
          cache.sessionByName.set(yearName, sessionId)
        }

        const semesterKey = `${yearName}::${semesterName}`
        let semesterId = cache.semesterBySessionName.get(semesterKey)
        if (!semesterId) {
          semesterId = await getOrCreateSemester(conn, sessionId, yearName, semesterName)
          cache.semesterBySessionName.set(semesterKey, semesterId)
        }

        const r = await upsertExamResult(conn, {
          studentUuid,
          courseUuid,
          examTypeUuid,
          sessionId,
          semesterId,
          score: marks,
          maxScore,
          comments,
          enteredBy,
        })

        const expectedGrade = String(row.Grade || "").trim().toUpperCase()
        if (expectedGrade && expectedGrade !== r.letterGrade) {
          gradeMismatches++
        }

        if (r.action === "inserted") inserted++
        else updated++
      } catch (e) {
        errors.push({ row: i + 2, field: "row", message: e.message || String(e), value: idNumber })
      }
    }

    console.log("Imported XLSX sheet:", sheetName)
    console.log({ inserted, updated, skipped, gradeMismatches, errorCount: errors.length })
    if (errors.length) {
      console.log("First 20 errors:")
      console.table(errors.slice(0, 20))
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
