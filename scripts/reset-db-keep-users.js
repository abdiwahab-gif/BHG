#!/usr/bin/env node
/*
  Reset helper:
  - Deletes ALL data in the current database EXCEPT the `users` table.
  - Keeps the schema intact.

  Safety:
    - Dry-run by default.
    - Use --apply to execute.

  Connection config (same envs as the app prefers):
    MYSQL_PUBLIC_URL, MYSQL_URL, DATABASE_URL, DATABASE_CONNECTION_STRING
    MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE
    DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
    DB_SSL=true (optional)

  Examples (PowerShell):
    pnpm -s db:reset:keep-users
    pnpm -s db:reset:keep-users:apply

    pnpm -s db:reset:keep-users -- --url mysql://user:pass@host:3306/db
    pnpm -s db:reset:keep-users:apply -- --url mysql://user:pass@host:3306/db
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
  // Ignore unresolved variable interpolation like 'mysql://${VAR}' or 'mysql://${{VAR}}'.
  if (v.includes("${{")) return undefined
  if (v.includes("${")) return undefined
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

    // Guard against placeholder host/db like '${{RAILWAY_TCP_PROXY_DOMAIN}}'.
    const host = url.hostname || undefined
    if (host && (host.includes("{") || host.includes("}") || host.includes("$"))) return null
    if (database && (database.includes("{") || database.includes("}") || database.includes("$"))) return null

    return {
      host,
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

function isLocalHost(host) {
  const h = String(host || "").trim().toLowerCase()
  return h === "localhost" || h === "127.0.0.1" || h === "::1"
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
  loadEnvFromFile(path.join(cwd, ".env.local"))
  loadEnvFromFile(path.join(cwd, ".env"))
}

function parseKeepList(raw) {
  const txt = String(raw || "").trim()
  if (!txt) return []
  return txt
    .split(",")
    .map((x) => String(x || "").trim())
    .filter(Boolean)
}

function getDbConfig() {
  const cliUrlConfig = parseMysqlUrl(getArgValue("--url"))
  const urlConfig =
    cliUrlConfig ||
    parseMysqlUrl(process.env.MYSQL_PUBLIC_URL) ||
    parseMysqlUrl(process.env.MYSQL_URL) ||
    parseMysqlUrl(process.env.DATABASE_URL) ||
    parseMysqlUrl(process.env.DATABASE_CONNECTION_STRING) ||
    {}

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

function printHelp() {
  console.log(`\nUsage:\n  node scripts/reset-db-keep-users.js [--apply --yes] [--allow-remote] [--url <mysqlurl>] [--keep users,table2] [--ssl]\n\nDefaults:\n  - Dry-run mode (no changes).\n  - Keeps only the 'users' table data.\n\nSafety:\n  - APPLY mode requires --yes.\n  - If host is not local (localhost/127.0.0.1), APPLY mode also requires --allow-remote.\n\nExamples (PowerShell):\n  pnpm -s db:reset:keep-users\n  pnpm -s db:reset:keep-users:apply\n  pnpm -s db:reset:keep-users:apply -- --url mysql://user:pass@host:3306/db --allow-remote\n  pnpm -s db:reset:keep-users:apply -- --keep users,_prisma_migrations\n`)
}

async function main() {
  loadLocalEnvFiles()

  if (hasFlag("--help") || hasFlag("-h")) {
    printHelp()
    return
  }

  const apply = hasFlag("--apply")
  const yes = hasFlag("--yes")
  const allowRemote = hasFlag("--allow-remote")
  const keep = new Set(["users", ...parseKeepList(getArgValue("--keep"))].map((t) => String(t).trim()).filter(Boolean))

  const config = getDbConfig()
  console.log(`DB: ${config.user}@${config.host}:${config.port}/${config.database}  SSL=${config.ssl ? "on" : "off"}`)
  console.log(apply ? "Mode: APPLY" : "Mode: DRY-RUN")
  console.log(`Keep tables: ${Array.from(keep).join(", ")}`)

  if (apply && !yes) {
    console.error("\n❌ Refusing to apply without --yes")
    console.error("Re-run with: --apply --yes")
    process.exitCode = 2
    return
  }

  if (apply && !isLocalHost(config.host) && !allowRemote) {
    console.error(`\n❌ Refusing to apply to non-local host (${config.host}) without --allow-remote`)
    console.error("Re-run with: --apply --yes --allow-remote")
    process.exitCode = 2
    return
  }

  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  })

  try {
    const [rows] = await conn.execute(
      "SELECT table_name as tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' ORDER BY table_name ASC",
      [],
    )

    const allTables = (rows || []).map((r) => String(r.tableName || r.TABLE_NAME || "").trim()).filter(Boolean)
    const targetTables = allTables.filter((t) => !keep.has(t))

    if (!allTables.length) {
      console.log("\nNo tables found in this database.")
      return
    }

    console.log(`\nTables in DB: ${allTables.length}`)
    console.log(`Tables to empty: ${targetTables.length}`)

    if (!targetTables.length) {
      console.log("✅ Nothing to reset (only kept tables exist).")
      return
    }

    console.log("\nPlanned truncates:")
    for (const t of targetTables) {
      console.log(`- ${t}`)
    }

    if (!apply) {
      console.log("\nDry-run complete. Re-run with --apply to execute.")
      return
    }

    console.log("\nApplying reset...")
    await conn.execute("SET FOREIGN_KEY_CHECKS = 0")

    for (const t of targetTables) {
      try {
        await conn.execute(`TRUNCATE TABLE \`${t.replace(/`/g, "``")}\``)
      } catch (e) {
        // Fallback for edge cases (permissions / engines).
        await conn.execute(`DELETE FROM \`${t.replace(/`/g, "``")}\``)
      }
    }

    await conn.execute("SET FOREIGN_KEY_CHECKS = 1")

    const [userCountRows] = await conn.execute("SELECT COUNT(*) as c FROM users", []).catch(() => [[{ c: "?" }]])
    const userCount = userCountRows && userCountRows[0] ? String(userCountRows[0].c ?? "?") : "?"

    console.log("✅ Reset complete.")
    console.log(`Users remaining: ${userCount}`)
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error("\n❌ Reset failed:")
  console.error(err && err.stack ? err.stack : err)
  process.exitCode = 1
})
