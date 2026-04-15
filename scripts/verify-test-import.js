#!/usr/bin/env node

const mysql = require("mysql2/promise")

async function main() {
  const host = process.env.MYSQL_HOST || "localhost"
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
  const user = process.env.MYSQL_USER || "root"
  const password = process.env.MYSQL_PASSWORD || "4593697"
  const database = process.env.MYSQL_DATABASE || "academic_db"

  const conn = await mysql.createConnection({ host, port, user, password, database })
  try {
    const sql =
      "SELECT er.id, s.studentId AS studentNumber, CONCAT(s.firstName,' ',s.lastName) AS studentName, c.code AS courseCode, er.score, er.maxScore, er.percentage, er.letterGrade, er.enteredBy, er.enteredAt FROM academic_module_exam_results er JOIN academic_module_students s ON s.id=er.studentId JOIN academic_module_courses c ON c.id=er.courseId WHERE er.enteredBy='test-import' ORDER BY er.enteredAt DESC LIMIT 10"

    const [rows] = await conn.execute(sql)
    console.table(rows)
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
