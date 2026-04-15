#!/usr/bin/env node

/**
 * Import `grade_sheet_report.xls` into the database.
 *
 * This XLS is a formatted report (not a simple flat table). It contains:
 * - Student header (ID Number, Student name, Faculty, Department)
 * - Repeated semester blocks: "Semester:3rd" then a course table
 *
 * Behavior:
 * - Upserts students into `academic_module_students` by `studentId` (business ID).
 * - Upserts courses into `academic_module_courses` by `code`.
 * - Creates/uses sessions in `sessions` as Academic Years.
 *   - If `--firstAcademicYear 2023/2024` provided, semesters map to:
 *       1st+2nd => 2023/2024, 3rd+4th => 2024/2025, ...
 *   - Otherwise, if the DB has an active session with a name like YYYY/YYYY, it will be used as the base.
 *   - Else, falls back to `Academic Year 1`, `Academic Year 2`, ...
 * - Creates/uses semesters in `academic_module_semesters` as:
 *   - Semester 1 (odd)  => Fall Semester
 *   - Semester 2 (even) => Spring Semester
 *   (i.e., per academic year: first semester is Fall, second is Spring)
 * - Inserts/updates one OVERALL exam result per student+course+session+semester.
 *   score = Total Marks, maxScore = 100, comments include breakdown.
 *
 * Run:
 *   node scripts/import-grade-sheet-report-xls.js --file grade_sheet_report.xls --enteredBy "xls-import"
 *   node scripts/import-grade-sheet-report-xls.js --file grade_sheet_report.xls --enteredBy "xls-import" --firstAcademicYear "2023/2024"
 */

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
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

function parseAcademicYear(sessionName) {
  const m = String(sessionName || "").match(/(20\d{2})\s*[\/-]\s*(20\d{2})/)
  if (!m) return null
  const startYear = Number(m[1])
  const endYear = Number(m[2])
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null
  return { startYear, endYear }
}

function addYearsAcademicYear(base, offset) {
  const years = parseAcademicYear(base)
  if (!years) return null
  const startYear = years.startYear + offset
  const endYear = years.endYear + offset
  return `${startYear}/${endYear}`
}

function parseSemesterNumber(text) {
  const s = String(text || "")
  const m = s.match(/\b(\d{1,2})\s*(st|nd|rd|th)?\b/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function normalizeAcademicYear(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim()
  // Matches: 2015/2016, 2015-2016, 2015 / 2016
  const m = s.match(/\b(20\d{2})\s*[\/-]\s*(20\d{2})\b/)
  if (!m) return null
  return `${m[1]}/${m[2]}`
}

function normalizeTermName(text) {
  const s = String(text || "").toLowerCase()
  if (s.includes("fall")) return "Fall Semester"
  if (s.includes("spring")) return "Spring Semester"
  return null
}

function termForSemesterNumber(n) {
  return n % 2 === 1 ? "Fall Semester" : "Spring Semester"
}

function academicYearIndexForSemesterNumber(n) {
  return Math.floor((n - 1) / 2) + 1
}

function parseNumber(value) {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9.\-]/g, "")
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : null
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

function parseSessionDates(sessionName) {
  const years = parseAcademicYear(sessionName)
  if (years) {
    return { startDate: `${years.startYear}-09-01`, endDate: `${years.endYear}-06-30` }
  }
  const now = new Date()
  const y = now.getFullYear()
  return { startDate: `${y}-01-01`, endDate: `${y}-12-31` }
}

function parseSemesterDates(sessionName, termName) {
  const years = parseAcademicYear(sessionName)
  if (years && termName === "Fall Semester") {
    return { startDate: `${years.startYear}-09-01`, endDate: `${years.startYear}-12-31` }
  }
  if (years && termName === "Spring Semester") {
    return { startDate: `${years.endYear}-01-01`, endDate: `${years.endYear}-06-30` }
  }
  const startDate = new Date().toISOString().slice(0, 10)
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10)
  return { startDate, endDate }
}

function decodeHtmlEntities(input) {
  let s = String(input || "")
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

  s = s.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16)
    return Number.isFinite(code) ? String.fromCharCode(code) : ""
  })

  s = s.replace(/&#(\d+);/g, (_, num) => {
    const code = parseInt(num, 10)
    return Number.isFinite(code) ? String.fromCharCode(code) : ""
  })

  return s
}

function htmlTableToGrid(html) {
  const grid = []
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  const tdRe = /<(td|th)\b[^>]*>([\s\S]*?)<\/(td|th)>/gi

  let trMatch
  while ((trMatch = trRe.exec(html))) {
    const trHtml = trMatch[1]
    const row = []
    let tdMatch
    while ((tdMatch = tdRe.exec(trHtml))) {
      const cellHtml = tdMatch[2]
      const text = decodeHtmlEntities(cellHtml.replace(/<[^>]*>/g, " "))
        .replace(/\s+/g, " ")
        .trim()
      row.push(text)
    }
    if (row.some(Boolean)) grid.push(row)
  }
  return grid
}

function resolveExcelHtmlSheetPath(mainFilePath, mainHtml) {
  // If the passed file is already a sheet page, use it.
  if (/sheet\d+\.htm$/i.test(mainFilePath)) return mainFilePath

  // frameset exports include a link to *_files/sheet001.htm
  const m = mainHtml.match(/href\s*=\s*"?([^"\s>]*sheet\d+\.htm)"?/i)
  if (!m) return null
  const href = decodeURIComponent(m[1])
  return path.resolve(path.dirname(mainFilePath), href)
}

function loadGridFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const looksLikeHtml = (buf) => String(buf.slice(0, 50)).toLowerCase().includes("<html")

  const raw = fs.readFileSync(filePath)
  if (ext === ".htm" || ext === ".html" || looksLikeHtml(raw)) {
    const html = raw.toString("utf8")
    const sheetPath = resolveExcelHtmlSheetPath(filePath, html) || filePath
    const sheetHtml = fs.readFileSync(sheetPath, "utf8")
    return htmlTableToGrid(sheetHtml)
  }

  const wb = xlsx.readFile(filePath, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" })
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
      INDEX idx_sessionId (sessionId),
      INDEX idx_name (name)
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

async function getActiveSessionName(conn) {
  const [rows] = await conn.execute("SELECT name FROM sessions WHERE isActive = TRUE LIMIT 1")
  return rows.length ? String(rows[0].name) : null
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
  const name = String(sessionName || "").trim() || "Academic Year"
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

async function getOrCreateSemester(conn, sessionId, sessionName, termName) {
  const name = String(termName || "").trim() || "Semester"
  const [rows] = await conn.execute(
    "SELECT id FROM academic_module_semesters WHERE sessionId=? AND name=? LIMIT 1",
    [sessionId, name],
  )
  if (rows.length) return rows[0].id

  const id = crypto.randomUUID()
  const { startDate, endDate } = parseSemesterDates(sessionName, name)
  await conn.execute(
    "INSERT INTO academic_module_semesters (id, sessionId, name, startDate, endDate) VALUES (?, ?, ?, ?, ?)",
    [id, sessionId, name, startDate, endDate],
  )
  return id
}

async function upsertCourse(conn, { code, title, credits, faculty, department }) {
  if (!code) throw new Error("Missing CourseCode")
  const [existing] = await conn.execute(
    "SELECT id FROM academic_module_courses WHERE LOWER(code)=LOWER(?) LIMIT 1",
    [code],
  )
  if (existing.length) {
    const id = existing[0].id
    await conn.execute(
      "UPDATE academic_module_courses SET name=?, credits=?, faculty=NULLIF(?,''), department=NULLIF(?, '') WHERE id=?",
      [title || code, Number.isFinite(credits) ? credits : null, faculty || "", department || "", id],
    )
    return id
  }

  const id = crypto.randomUUID()
  await conn.execute(
    "INSERT INTO academic_module_courses (id, name, type, code, credits, faculty, department) VALUES (?, ?, 'Core', ?, ?, NULLIF(?,''), NULLIF(?,''))",
    [id, title || code, code, Number.isFinite(credits) ? credits : null, faculty || "", department || ""],
  )
  return id
}

async function upsertStudent(conn, { businessId, fullName }) {
  if (!businessId) throw new Error("Missing Student ID")
  const [existing] = await conn.execute("SELECT id FROM academic_module_students WHERE studentId=? LIMIT 1", [businessId])
  if (existing.length) return existing[0].id

  const id = crypto.randomUUID()
  const { firstName, lastName } = splitName(fullName)
  const email = `${businessId}@import.test`

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
      "N/A",
      "A",
      "other",
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
      businessId,
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
    return { action: "updated", id: existing[0].id, letterGrade }
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

  return { action: "inserted", id, letterGrade }
}

function findHeaderIndexes(row) {
  const norm = row.map((c) => String(c || "").trim().toLowerCase())
  const idx = (name) => norm.findIndex((c) => c.replace(/\s+/g, " ") === name)

  const courseCode = idx("coursecode")
  const courseTitle = idx("course title")
  const creditHour = idx("c.hour")
  const attendance = idx("attendance")
  const assignment = idx("assignment")
  const midExam = idx("mid exam")
  const finalExam = idx("final exam")
  const totalMarks = idx("total marks")
  const grade = idx("grade")

  const required = [courseCode, courseTitle, creditHour, totalMarks, grade]
  if (required.some((i) => i < 0)) return null

  return { courseCode, courseTitle, creditHour, attendance, assignment, midExam, finalExam, totalMarks, grade }
}

async function main() {
  const args = parseArgs(process.argv)
  const defaultFile = fs.existsSync("Grade Sheet Report.htm")
    ? "Grade Sheet Report.htm"
    : "grade_sheet_report.xls"
  const file = args.file || defaultFile
  const enteredBy = args.enteredBy || "xls-import"
  const examTypeCode = (args.examTypeCode || "OVERALL").toString()
  const maxScore = args.maxScore ? Number(args.maxScore) : 100
  const firstAcademicYearArg = args.firstAcademicYear ? String(args.firstAcademicYear) : null
  const onlyStudentId = args.onlyStudentId ? String(args.onlyStudentId).trim() : null
  const purgeExisting = Boolean(args.purgeExisting)
  const debug = Boolean(args.debug)
  const debugLimit = args.debugLimit ? Number(args.debugLimit) : 25

  const host = process.env.MYSQL_HOST || "localhost"
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
  const user = process.env.MYSQL_USER || "root"
  const password = process.env.MYSQL_PASSWORD || "4593697"
  const database = process.env.MYSQL_DATABASE || "academic_db"

  const grid = loadGridFromFile(file)

  const conn = await mysql.createConnection({ host, port, user, password, database })

  const cache = {
    studentByBusinessId: new Map(),
    courseByCode: new Map(),
    sessionByName: new Map(),
    semesterByKey: new Map(),
  }

  try {
    await ensureTables(conn)

    const activeSessionName = await getActiveSessionName(conn)
    const inferredBaseYear = activeSessionName && parseAcademicYear(activeSessionName) ? activeSessionName : null
    const baseAcademicYear = firstAcademicYearArg || inferredBaseYear

    const examTypeUuid = await getOrCreateExamType(conn, examTypeCode)

    let currentStudentBusinessId = ""
    let currentStudentName = ""
    let currentFaculty = ""
    let currentDepartment = ""
    let currentSemesterNumber = null
    let currentAcademicYearName = ""
    let currentTermName = ""
    let header = null

    const purgedBusinessIds = new Set()

    let inserted = 0
    let updated = 0
    let skipped = 0
    let gradeMismatches = 0
    const errors = []
    const skippedDetails = []

    for (let r = 0; r < grid.length; r++) {
      const row = (grid[r] || []).map((c) => String(c ?? "").trim())
      const joined = row.filter(Boolean).join(" | ")
      if (!joined) continue

      // Student context
      for (const cell of row) {
        if (!cell) continue

        const idMatch = cell.match(/\bID\s*Number\s*:\s*([0-9A-Za-z\-_/]+)\b/i)
        if (idMatch) {
          currentStudentBusinessId = String(idMatch[1]).trim()
        }

        const nameMatch = cell.match(/\bStudent\s*name\s*:\s*(.+)$/i)
        if (nameMatch) {
          currentStudentName = String(nameMatch[1]).trim()
        }

        const facultyMatch = cell.match(/\bFaculty\s*:\s*(.+)$/i)
        if (facultyMatch) {
          currentFaculty = String(facultyMatch[1]).trim()
        }

        const deptMatch = cell.match(/\bDepartment\s*:\s*(.+)$/i)
        if (deptMatch) {
          currentDepartment = String(deptMatch[1]).trim()
        }
      }

      // Semester context
      if (joined.toLowerCase().includes("semester:")) {
        currentTermName = normalizeTermName(joined) || ""
        const n = parseSemesterNumber(joined)
        currentSemesterNumber = n || null
        header = null
        continue
      }

      // Academic year context (HTML export shows it on its own row)
      if (joined.toLowerCase().includes("academic") && joined.toLowerCase().includes("year")) {
        const norm = normalizeAcademicYear(joined)
        if (norm) currentAcademicYearName = norm
        continue
      }

      // Header row
      const maybeHeader = findHeaderIndexes(row)
      if (maybeHeader) {
        header = maybeHeader
        continue
      }

      // Course rows require context
      if (!header || !currentStudentBusinessId || (!currentSemesterNumber && !currentTermName)) continue

      if (onlyStudentId && currentStudentBusinessId !== onlyStudentId) {
        continue
      }

      const code = row[header.courseCode] || ""
      const title = row[header.courseTitle] || ""
      if (!code || code.toLowerCase() === "coursecode") continue

      const looksLikeCourseCode = /[a-z]{2,}\s*[-]?\s*\d/i.test(code)
      if (!looksLikeCourseCode) continue

      const creditHours = parseNumber(row[header.creditHour])
      const attendance = header.attendance >= 0 ? row[header.attendance] : ""
      const assignment = header.assignment >= 0 ? row[header.assignment] : ""
      const midExam = header.midExam >= 0 ? row[header.midExam] : ""
      const finalExam = header.finalExam >= 0 ? row[header.finalExam] : ""
      const totalMarks = parseNumber(row[header.totalMarks])
      const expectedGrade = String(row[header.grade] || "").trim().toUpperCase()

      if (!Number.isFinite(totalMarks)) {
        skipped++
        if (debug && skippedDetails.length < debugLimit) {
          skippedDetails.push({
            reason: "missing_total_marks",
            row: r + 1,
            studentId: currentStudentBusinessId,
            academicYear: currentAcademicYearName,
            term: currentTermName,
            semesterNumber: currentSemesterNumber,
            courseCode: code,
            courseTitle: title,
            totalMarksCell: row[header.totalMarks],
            gradeCell: expectedGrade,
          })
        }
        continue
      }

      const yearIndex = currentSemesterNumber ? academicYearIndexForSemesterNumber(currentSemesterNumber) : null
      const termName = currentTermName || (currentSemesterNumber ? termForSemesterNumber(currentSemesterNumber) : "")
      if (!termName) {
        skipped++
        if (debug && skippedDetails.length < debugLimit) {
          skippedDetails.push({
            reason: "missing_term",
            row: r + 1,
            studentId: currentStudentBusinessId,
            academicYear: currentAcademicYearName,
            semesterNumber: currentSemesterNumber,
            joined,
          })
        }
        continue
      }

      let sessionName = currentAcademicYearName
      if (!sessionName && baseAcademicYear && yearIndex) {
        sessionName = addYearsAcademicYear(baseAcademicYear, yearIndex - 1)
      }
      if (!sessionName && yearIndex) sessionName = `Academic Year ${yearIndex}`
      if (!sessionName) {
        skipped++
        if (debug && skippedDetails.length < debugLimit) {
          skippedDetails.push({
            reason: "missing_academic_year",
            row: r + 1,
            studentId: currentStudentBusinessId,
            termName,
            semesterNumber: currentSemesterNumber,
            joined,
          })
        }
        continue
      }

      try {
        // Student
        let studentUuid = cache.studentByBusinessId.get(currentStudentBusinessId)
        if (!studentUuid) {
          studentUuid = await upsertStudent(conn, {
            businessId: currentStudentBusinessId,
            fullName: currentStudentName || currentStudentBusinessId,
          })
          cache.studentByBusinessId.set(currentStudentBusinessId, studentUuid)
        }

        if (purgeExisting && !purgedBusinessIds.has(currentStudentBusinessId)) {
          await conn.execute(
            "DELETE FROM academic_module_exam_results WHERE studentId=? AND examTypeId=? AND enteredBy=?",
            [studentUuid, examTypeUuid, enteredBy],
          )
          purgedBusinessIds.add(currentStudentBusinessId)
        }

        // Course
        const courseKey = code.toLowerCase()
        let courseUuid = cache.courseByCode.get(courseKey)
        if (!courseUuid) {
          courseUuid = await upsertCourse(conn, {
            code,
            title,
            credits: Number.isFinite(creditHours) ? creditHours : null,
            faculty: currentFaculty,
            department: currentDepartment,
          })
          cache.courseByCode.set(courseKey, courseUuid)
        }

        // Session + Semester
        let sessionId = cache.sessionByName.get(sessionName)
        if (!sessionId) {
          sessionId = await getOrCreateSession(conn, sessionName)
          cache.sessionByName.set(sessionName, sessionId)
        }

        const semesterKey = `${sessionName}::${termName}`
        let semesterId = cache.semesterByKey.get(semesterKey)
        if (!semesterId) {
          semesterId = await getOrCreateSemester(conn, sessionId, sessionName, termName)
          cache.semesterByKey.set(semesterKey, semesterId)
        }

        const comments = `Attendance=${attendance}; Assignment=${assignment}; MidExam=${midExam}; FinalExam=${finalExam}; SourceSemester=${currentSemesterNumber || ""}; SourceAcademicYear=${currentAcademicYearName || ""}; SourceTerm=${currentTermName || ""}`

        const res = await upsertExamResult(conn, {
          studentUuid,
          courseUuid,
          examTypeUuid,
          sessionId,
          semesterId,
          score: totalMarks,
          maxScore,
          comments,
          enteredBy,
        })

        if (expectedGrade && expectedGrade !== res.letterGrade) {
          gradeMismatches++
        }

        if (res.action === "inserted") inserted++
        else updated++
      } catch (e) {
        errors.push({ row: r + 1, message: e?.message || String(e), course: code, student: currentStudentBusinessId })
      }
    }

    console.log("Imported:", file)
    console.log({ inserted, updated, skipped, gradeMismatches, errorCount: errors.length })
    if (debug && skippedDetails.length) {
      console.log("Skipped details (sample):")
      console.table(skippedDetails)
    }
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
