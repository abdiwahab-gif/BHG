#!/usr/bin/env node

const path = require("path")
const xlsx = require("xlsx")

const file = process.argv[2]
if (!file) {
  console.error("Usage: node scripts/inspect-xlsx.js <file.xlsx>")
  process.exit(2)
}

const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file)
const wb = xlsx.readFile(abs, { cellDates: true })
const sheetName = wb.SheetNames[0]
const ws = wb.Sheets[sheetName]
const rows = xlsx.utils.sheet_to_json(ws, { defval: "", raw: false })

console.log("sheet:", sheetName)
console.log("rowCount:", rows.length)
console.log("headers:", rows.length ? Object.keys(rows[0]) : [])
console.log("sampleRow:", rows[0] || null)
