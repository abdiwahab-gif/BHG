#!/usr/bin/env node
/*
  One-time migration helper:
  - Normalizes exam type codes to canonical values:
      ASSIGN -> ASSIGNMENT
      ATT    -> ATTENDANCE
      MIDTERM-> MID
  - Ensures canonical codes exist (MID, FINAL, ASSIGNMENT, ATTENDANCE)

  Usage:
    node scripts/migrate-exam-type-codes.js           # dry-run (prints planned changes)
    node scripts/migrate-exam-type-codes.js --apply   # executes changes in a transaction

  Connection config (same envs as the app prefers):
    MYSQL_PUBLIC_URL, MYSQL_URL, DATABASE_URL, DATABASE_CONNECTION_STRING
    MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE
    DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
    DB_SSL=true (optional)
*/

const mysql = require("mysql2/promise")
const fs = require("fs")
const path = require("path")

function toBool(value) {
  return value === "true" || value === "1"
}

function envValue(value) {
  const v = String(value || "").trim()
  if (!v) return undefined
  if (/^\$\{\{.+\}\}$/.test(v)) return undefined
  return v
}

function envHost(value) {
  const v = envValue(value)
  if (!v) return undefined
  if (v.startsWith("$") || v.includes("${")) return undefined
  if (/private_domain/i.test(v)) return undefined
  if (/\$[A-Z0-9_]+/i.test(v)) return undefined
  return v
}

function parseMysqlUrl(urlString) {
  const urlText = envValue(urlString)
  if (!urlText) return null
  try {
    const url = new URL(urlText)
    if (url.protocol !== "mysql:" && url.protocol !== "mysql2:") return null
    const database = url.pathname ? url.pathname.replace(/^\//, "") : undefined
    return {
      host: url.hostname || undefined,
      port: url.port ? Number(url.port) : undefined,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      database,
    }
  } catch {
    return null
  }
}

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return undefined
  const next = process.argv[idx + 1]
  if (!next || next.startsWith("--")) return undefined
  return next
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function loadEnvFromFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf8")
    const lines = text.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = String(line || "").trim()
      if (!trimmed || trimmed.startsWith("#")) continue

      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (!key) continue
      if (process.env[key] !== undefined) continue

      // Strip optional surrounding quotes.
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }
  } catch {
    // ignore missing/invalid files
  }
}

function loadLocalEnvFiles() {
  const cwd = process.cwd()
  // Next.js commonly uses .env.local; also support .env.
  loadEnvFromFile(path.join(cwd, ".env.local"))
  loadEnvFromFile(path.join(cwd, ".env"))
}

function getDbConfig() {
  const cliUrlConfig = parseMysqlUrl(getArgValue("--url")) || {}
  const urlConfig = {
    ...(parseMysqlUrl(process.env.MYSQL_PUBLIC_URL) || {}),
    ...(parseMysqlUrl(process.env.MYSQL_URL) || {}),
    ...(parseMysqlUrl(process.env.DATABASE_URL) || {}),
    ...(parseMysqlUrl(process.env.DATABASE_CONNECTION_STRING) || {}),
    ...cliUrlConfig,
  }

  const host =
    envHost(getArgValue("--host")) ||
    urlConfig.host ||
    envHost(process.env.MYSQLHOST) ||
    envHost(process.env.DB_HOST) ||
    "localhost"
  const port =
    (getArgValue("--port") ? Number(getArgValue("--port")) : undefined) ||
    (Number.isFinite(urlConfig.port) ? urlConfig.port : undefined) ||
    (envValue(process.env.MYSQLPORT) ? Number(envValue(process.env.MYSQLPORT)) : undefined) ||
    Number.parseInt(process.env.DB_PORT || "3306", 10)
  const user =
    envValue(getArgValue("--user")) ||
    urlConfig.user ||
    envValue(process.env.MYSQLUSER) ||
    envValue(process.env.DB_USER) ||
    "root"
  const password =
    envValue(getArgValue("--password")) ||
    urlConfig.password ||
    envValue(process.env.MYSQLPASSWORD) ||
    envValue(process.env.DB_PASSWORD) ||
    ""
  const database =
    envValue(getArgValue("--database")) ||
    urlConfig.database ||
    envValue(process.env.MYSQLDATABASE) ||
    envValue(process.env.DB_NAME) ||
    "academic_db"

  const ssl = hasFlag("--ssl") || toBool(process.env.DB_SSL)

  return { host, port, user, password, database, ssl }
}

function normalizeCode(code) {
  const upper = String(code || "").trim().toUpperCase()
  if (upper === "ASSIGN") return "ASSIGNMENT"
  if (upper === "ATT") return "ATTENDANCE"
  if (upper === "MIDTERM") return "MID"
  return upper
}

function aliasCodesForCanonical(canonical) {
  const c = String(canonical || "").trim().toUpperCase()
  if (c === "ASSIGNMENT") return ["ASSIGNMENT", "ASSIGN"]
  if (c === "ATTENDANCE") return ["ATTENDANCE", "ATT"]
  if (c === "MID") return ["MID", "MIDTERM"]
  return [c]
}

async function ensureExamTypesTable(conn) {
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
      INDEX idx_isActive (isActive),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
  )
}

async function loadExamTypes(conn) {
  const [rows] = await conn.execute(
    "SELECT id, name, code, weight, isActive FROM academic_module_exam_types ORDER BY createdAt ASC",
    [],
  )
  return rows || []
}

function printPlan(plan) {
  if (!plan.length) {
    console.log("✅ No changes needed.")
    return
  }

  console.log("\nPlanned changes:")
  for (const step of plan) {
    if (step.type === "sql") {
      console.log(`- ${step.label}`)
      console.log(`  SQL: ${step.sql}`)
      console.log(`  Params: ${JSON.stringify(step.params || [])}`)
    } else {
      console.log(`- ${step.label}`)
    }
  }
}

function pickRowByUpperCode(rows, upperCode) {
  const u = String(upperCode || "").trim().toUpperCase()
  return rows.find((r) => String(r.code || "").trim().toUpperCase() === u)
}

async function main() {
  // Allow local env files to provide DATABASE_URL without needing it exported in the terminal session.
  loadLocalEnvFiles()

  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(`\nUsage:\n  node scripts/migrate-exam-type-codes.js [--apply] [--url <mysqlurl>] [--host <h>] [--port <p>] [--user <u>] [--password <pw>] [--database <db>] [--ssl]\n\nDefaults: dry-run mode (no changes). Use --apply to execute.\n\nExamples (PowerShell):\n  $env:DATABASE_URL='mysql://user:pass@host:3306/academic_db'; pnpm -s migrate:exam-types\n  pnpm -s migrate:exam-types -- --url mysql://user:pass@host:3306/academic_db\n  pnpm -s migrate:exam-types:apply -- --host localhost --user root --password YOURPASS --database academic_db\n`)
    return
  }

  const apply = hasFlag("--apply")
  const config = getDbConfig()

  console.log(`DB: ${config.user}@${config.host}:${config.port}/${config.database}  SSL=${config.ssl ? "on" : "off"}`)
  console.log(apply ? "Mode: APPLY" : "Mode: DRY-RUN")

  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  })

  try {
    await ensureExamTypesTable(conn)

    const rows = await loadExamTypes(conn)

    const canonicalTargets = [
      { code: "MID", name: "Midterm Exam", defaultWeight: 30 },
      { code: "FINAL", name: "Final Exam", defaultWeight: 50 },
      { code: "ASSIGNMENT", name: "Assignment", defaultWeight: 10 },
      { code: "ATTENDANCE", name: "Attendance", defaultWeight: 10 },
    ]

    const plan = []

    for (const target of canonicalTargets) {
      const canonical = String(target.code).toUpperCase()
      const aliases = aliasCodesForCanonical(canonical)

      const canonicalRow = pickRowByUpperCode(rows, canonical)
      const legacyRows = aliases
        .filter((c) => c !== canonical)
        .map((code) => pickRowByUpperCode(rows, code))
        .filter(Boolean)

      if (!canonicalRow && legacyRows.length === 0) {
        plan.push({
          type: "sql",
          label: `INSERT missing exam type '${canonical}' (weight=${target.defaultWeight})`,
          sql: "INSERT INTO academic_module_exam_types (id, name, code, weight, description, isActive) VALUES (UUID(), ?, ?, ?, ?, TRUE)",
          params: [target.name, canonical, target.defaultWeight, "Created by migrate-exam-type-codes.js"],
        })
        continue
      }

      // If canonical exists, prefer it as the active row.
      if (canonicalRow) {
        if (!canonicalRow.isActive) {
          plan.push({
            type: "sql",
            label: `ACTIVATE canonical '${canonical}' (id=${canonicalRow.id})`,
            sql: "UPDATE academic_module_exam_types SET isActive = TRUE WHERE id = ?",
            params: [String(canonicalRow.id)],
          })
        }

        for (const legacy of legacyRows) {
          if (legacy.isActive) {
            plan.push({
              type: "sql",
              label: `DEACTIVATE legacy '${String(legacy.code).toUpperCase()}' (id=${legacy.id}) in favor of '${canonical}'`,
              sql: "UPDATE academic_module_exam_types SET isActive = FALSE WHERE id = ?",
              params: [String(legacy.id)],
            })
          }
        }

        continue
      }

      // No canonical row, but at least one legacy row exists.
      // Try to rename the legacy row's code to canonical.
      const legacy = legacyRows[0]
      if (legacy) {
        plan.push({
          type: "sql",
          label: `RENAME legacy '${String(legacy.code).toUpperCase()}' -> '${canonical}' (id=${legacy.id})`,
          sql: "UPDATE academic_module_exam_types SET code = ?, isActive = TRUE WHERE id = ?",
          params: [canonical, String(legacy.id)],
        })
      }
    }

    // De-dupe identical SQL steps (can happen if a row participates in two loops).
    const seen = new Set()
    const dedupedPlan = []
    for (const step of plan) {
      const key = `${step.sql}::${JSON.stringify(step.params || [])}`
      if (seen.has(key)) continue
      seen.add(key)
      dedupedPlan.push(step)
    }

    printPlan(dedupedPlan)

    if (!apply) {
      console.log("\nDry-run complete. Re-run with --apply to execute.")
      return
    }

    if (!dedupedPlan.length) {
      console.log("\nNothing to apply.")
      return
    }

    console.log("\nApplying changes...")
    await conn.beginTransaction()

    try {
      for (const step of dedupedPlan) {
        await conn.execute(step.sql, step.params || [])
      }
      await conn.commit()
      console.log("✅ Migration applied successfully.")
    } catch (e) {
      await conn.rollback()
      throw e
    }

    // Post-state summary
    const after = await loadExamTypes(conn)
    const active = after.filter((r) => Boolean(r.isActive))
    const activeCodes = active.map((r) => String(r.code || "").trim().toUpperCase()).sort()

    console.log("\nActive exam type codes (after):")
    console.log(activeCodes.join(", ") || "(none)")
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error("\n❌ Migration failed:")
  console.error(err && err.stack ? err.stack : err)
  process.exitCode = 1
})
