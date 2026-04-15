#!/usr/bin/env node

const mysql = require("mysql2/promise")

async function main() {
  const enteredBy = process.argv[2] || "test-xlsx"

  const host = process.env.MYSQL_HOST || "localhost"
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
  const user = process.env.MYSQL_USER || "root"
  const password = process.env.MYSQL_PASSWORD || "4593697"
  const database = process.env.MYSQL_DATABASE || "academic_db"

  const conn = await mysql.createConnection({ host, port, user, password, database })
  try {
    const [counts] = await conn.execute(
      "SELECT COUNT(*) AS total FROM academic_module_exam_results WHERE enteredBy=?",
      [enteredBy],
    )
    console.log("exam_results_imported:", counts[0]?.total || 0)

    const [distinctStudents] = await conn.execute(
      "SELECT COUNT(DISTINCT studentId) AS total FROM academic_module_exam_results WHERE enteredBy=?",
      [enteredBy],
    )
    console.log("distinct_students_in_results:", distinctStudents[0]?.total || 0)

    const [distinctCourses] = await conn.execute(
      "SELECT COUNT(DISTINCT courseId) AS total FROM academic_module_exam_results WHERE enteredBy=?",
      [enteredBy],
    )
    console.log("distinct_courses_in_results:", distinctCourses[0]?.total || 0)

    const [rows] = await conn.execute(
      "SELECT er.id, s.studentId AS studentNumber, CONCAT(s.firstName,' ',s.lastName) AS studentName, c.code AS courseCode, c.name AS courseName, er.score, er.maxScore, er.percentage, er.letterGrade, er.enteredAt FROM academic_module_exam_results er JOIN academic_module_students s ON s.id=er.studentId JOIN academic_module_courses c ON c.id=er.courseId WHERE er.enteredBy=? ORDER BY er.enteredAt DESC LIMIT 10",
      [enteredBy],
    )
    console.table(rows)
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
