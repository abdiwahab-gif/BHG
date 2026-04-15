import mysql, { type Pool, type RowDataPacket } from "mysql2/promise"

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: Pool | undefined
}

function toBool(value: string | undefined): boolean {
  return value === "true" || value === "1"
}

function envValue(value: string | undefined): string | undefined {
  const v = String(value || "").trim()
  if (!v) return undefined
  // Guard against accidentally pasting CI-style placeholders into Vercel env vars.
  if (/^\$\{\{.+\}\}$/.test(v)) return undefined
  // Also ignore unresolved variable interpolation like 'mysql://${VAR}' or 'mysql://${{VAR}}'.
  if (v.includes("${{")) return undefined
  if (v.includes("${")) return undefined
  return v
}

function envHost(value: string | undefined): string | undefined {
  const v = envValue(value)
  if (!v) return undefined

  // Common misconfig: setting DB_HOST to '$RAILWAY_PRIVATE_DOMAIN' or similar.
  // Treat anything that looks like an unresolved env var reference as missing.
  if (v.startsWith("$") || v.includes("${")) return undefined
  if (/private_domain/i.test(v)) return undefined
  if (/\$[A-Z0-9_]+/i.test(v)) return undefined

  return v
}

type DbEnvConfig = {
  host: string
  port: number
  user: string
  password: string
  database: string
}

function parseMysqlUrl(urlString: string | undefined): Partial<DbEnvConfig> | null {
  if (!urlString) return null

  try {
    const url = new URL(urlString)
    if (url.protocol !== "mysql:" && url.protocol !== "mysql2:") return null

    const database = url.pathname?.replace(/^\//, "") || undefined
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

export function getDbPool(): Pool {
  if (global.__mysqlPool) {
    return global.__mysqlPool
  }

  const mysqlPublicUrl = envValue(process.env.MYSQL_PUBLIC_URL)
  const mysqlUrl = envValue(process.env.MYSQL_URL)
  const databaseUrl = envValue(process.env.DATABASE_URL)
  const databaseConnStr = envValue(process.env.DATABASE_CONNECTION_STRING)

  const urlConfig =
    parseMysqlUrl(mysqlPublicUrl) ??
    parseMysqlUrl(mysqlUrl) ??
    parseMysqlUrl(databaseUrl) ??
    parseMysqlUrl(databaseConnStr) ??
    {}

  const host = urlConfig.host || envHost(process.env.MYSQLHOST) || envHost(process.env.DB_HOST) || "localhost"
  const port =
    (urlConfig.port && Number.isFinite(urlConfig.port) ? urlConfig.port : undefined) ||
    (envValue(process.env.MYSQLPORT) ? Number(envValue(process.env.MYSQLPORT)) : undefined) ||
    Number.parseInt(process.env.DB_PORT || "3306", 10)
  const user = urlConfig.user || envValue(process.env.MYSQLUSER) || envValue(process.env.DB_USER) || "root"
  const password = urlConfig.password || envValue(process.env.MYSQLPASSWORD) || envValue(process.env.DB_PASSWORD) || ""
  const database =
    urlConfig.database || envValue(process.env.MYSQLDATABASE) || envValue(process.env.DB_NAME) || "academic_db"

  const isProbablyProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL)
  const hasValidUrl = Boolean(
    parseMysqlUrl(mysqlPublicUrl) ||
      parseMysqlUrl(mysqlUrl) ||
      parseMysqlUrl(databaseUrl) ||
      parseMysqlUrl(databaseConnStr),
  )

  if (isProbablyProduction && !hasValidUrl && host === "localhost") {
    // Fail fast with a clear message instead of silently trying localhost.
    throw new Error(
      "Database is not configured for production. Set MYSQL_PUBLIC_URL (Railway public MySQL URL) or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in Vercel environment variables.",
    )
  }

  global.__mysqlPool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: toBool(process.env.DB_SSL) ? { rejectUnauthorized: false } : undefined,
  })

  return global.__mysqlPool
}

export async function dbQuery<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getDbPool().execute(sql, params)
  return rows as T[]
}
