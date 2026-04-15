#!/usr/bin/env node
/*
  Fingerprint Attendance Sync (HR)

  Goal:
  - Pull punch logs from a biometric/fingerprint machine and store them in MySQL
  - Attendance UI reads from hr_attendance_events (aggregated by day)

  Current state:
  - This script is "prepared" for common TCP/IP devices (e.g., ZKTeco) but needs the exact machine model/vendor
  - For ZKTeco devices, install an SDK library (example: zklib-js) and configure device rows in DB

  Configuration:
  - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

  Database mapping:
  - hr_employees.biometricUserId should match the device's user id
  - hr_employees.employeeId is the business employee code used in attendance records

  Usage:
    node scripts/sync-fingerprint-attendance.js

  Notes:
  - This script is safe to re-run. It uses INSERT IGNORE with UNIQUE keys.
*/

const mysql = require('mysql2/promise')

function env(name, fallback) {
  const v = process.env[name]
  return v === undefined || v === null || String(v).trim() === '' ? fallback : v
}

async function ensureTables(conn) {
  await conn.query(
    `CREATE TABLE IF NOT EXISTS hr_attendance_events (
      id VARCHAR(36) PRIMARY KEY,
      employeeId VARCHAR(50) NOT NULL,
      eventTime DATETIME NOT NULL,
      eventType VARCHAR(30) NOT NULL DEFAULT '',
      location VARCHAR(100) NOT NULL DEFAULT 'Office',
      notes TEXT NULL,
      source VARCHAR(20) NOT NULL DEFAULT 'device',
      deviceId VARCHAR(36) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_event (employeeId, eventTime, eventType),
      INDEX idx_employee_time (employeeId, eventTime),
      INDEX idx_eventTime (eventTime),
      INDEX idx_source (source),
      INDEX idx_deviceId (deviceId)
    ) ENGINE=InnoDB`
  )

  await conn.query(
    `CREATE TABLE IF NOT EXISTS hr_biometric_devices (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      vendor VARCHAR(50) NOT NULL DEFAULT 'unknown',
      model VARCHAR(100) NULL,
      ip VARCHAR(64) NOT NULL,
      port INT NOT NULL DEFAULT 4370,
      timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      lastSyncAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_ip_port (ip, port),
      INDEX idx_isActive (isActive)
    ) ENGINE=InnoDB`
  )

  await conn.query(
    `CREATE TABLE IF NOT EXISTS hr_biometric_logs (
      id VARCHAR(36) PRIMARY KEY,
      deviceId VARCHAR(36) NOT NULL,
      deviceUserId VARCHAR(50) NOT NULL,
      eventTime DATETIME NOT NULL,
      eventType VARCHAR(30) NOT NULL DEFAULT '',
      rawJson JSON NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_device_event (deviceId, deviceUserId, eventTime, eventType),
      INDEX idx_device_time (deviceId, eventTime),
      INDEX idx_deviceUserId (deviceUserId)
    ) ENGINE=InnoDB`
  )

  await conn.query(
    `CREATE TABLE IF NOT EXISTS hr_employees (
      id VARCHAR(36) PRIMARY KEY,
      sequence BIGINT NOT NULL AUTO_INCREMENT UNIQUE,
      employeeId VARCHAR(50) NULL,
      biometricUserId VARCHAR(50) NULL,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NULL,
      department VARCHAR(100) NULL,
      position VARCHAR(100) NULL,
      employeeType VARCHAR(30) NOT NULL DEFAULT 'full-time',
      employmentStatus VARCHAR(30) NOT NULL DEFAULT 'active',
      hireDate DATE NULL,
      salary DECIMAL(12,2) NOT NULL DEFAULT 0,
      salaryType VARCHAR(20) NOT NULL DEFAULT 'monthly',
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      payGrade VARCHAR(30) NULL,
      workLocation VARCHAR(100) NULL,
      timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
      dateOfBirth DATE NULL,
      gender VARCHAR(10) NOT NULL DEFAULT 'other',
      maritalStatus VARCHAR(15) NOT NULL DEFAULT 'single',
      nationality VARCHAR(100) NULL,
      addressJson JSON NULL,
      emergencyContactJson JSON NULL,
      workScheduleJson JSON NULL,
      benefitsJson JSON NULL,
      skillsJson JSON NULL,
      educationJson JSON NULL,
      certificationsJson JSON NULL,
      languagesJson JSON NULL,
      createdBy VARCHAR(255) NOT NULL DEFAULT 'system',
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_email (email),
      UNIQUE KEY uniq_employeeId (employeeId),
      INDEX idx_biometricUserId (biometricUserId)
    ) ENGINE=InnoDB`
  )
}

function uuid() {
  // node 18+ has crypto.randomUUID
  return require('crypto').randomUUID()
}

async function loadEmployeeMap(conn) {
  const [rows] = await conn.execute(
    `SELECT employeeId, biometricUserId
     FROM hr_employees
     WHERE biometricUserId IS NOT NULL AND biometricUserId <> '' AND employeeId IS NOT NULL AND employeeId <> ''`
  )
  const map = new Map()
  for (const r of rows || []) {
    map.set(String(r.biometricUserId), String(r.employeeId))
  }
  return map
}

async function getActiveDevices(conn) {
  const [rows] = await conn.execute(
    `SELECT id, name, vendor, model, ip, port, timezone
     FROM hr_biometric_devices
     WHERE isActive = TRUE
     ORDER BY createdAt ASC`
  )
  return rows || []
}

async function fetchDeviceLogs(device) {
  const vendor = String(device.vendor || 'unknown').toLowerCase()

  if (vendor === 'zkteco' || vendor === 'zk') {
    let ZKLib
    try {
      // Optional dependency; install with: pnpm add zklib-js
      ZKLib = require('zklib-js')
    } catch {
      throw new Error(
        "Missing optional dependency 'zklib-js'. Install it with: pnpm add zklib-js"
      )
    }

    const zk = new ZKLib(String(device.ip), Number(device.port || 4370), 10000, 4000)
    await zk.createSocket()

    try {
      // Library returns an array of attendance logs; shape varies by device/firmware.
      const att = await zk.getAttendances()
      const data = att && att.data ? att.data : []

      // Normalize to { userId, timestamp, eventType, raw }
      return (data || []).map((x) => {
        const userId = String(x.uid ?? x.userId ?? x.user_id ?? x.user ?? '')
        const ts = x.timestamp || x.time || x.recordTime || x.date || x
        const timestamp = ts instanceof Date ? ts : new Date(ts)
        const eventType = String(x.type ?? x.state ?? x.status ?? '')
        return { userId, timestamp, eventType, raw: x }
      })
    } finally {
      await zk.disconnect()
    }
  }

  throw new Error(`Unsupported vendor '${device.vendor}'. Please provide machine vendor/model/protocol.`)
}

async function main() {
  const dbHost = env('DB_HOST', 'localhost')
  const dbPort = Number(env('DB_PORT', '3306'))
  const dbUser = env('DB_USER', 'root')
  const dbPassword = env('DB_PASSWORD', '')
  const dbName = env('DB_NAME', 'academic_db')

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

    const employeeMap = await loadEmployeeMap(conn)
    const devices = await getActiveDevices(conn)

    if (!devices.length) {
      console.log('No active biometric devices found in hr_biometric_devices.')
      console.log('Add one row first (ip/port/vendor), then re-run this script.')
      process.exit(0)
    }

    for (const device of devices) {
      console.log(`\nSyncing device: ${device.name} (${device.vendor}) ${device.ip}:${device.port}`)

      const logs = await fetchDeviceLogs(device)
      let insertedLogs = 0
      let insertedEvents = 0
      let skippedUnmapped = 0

      for (const l of logs) {
        const userId = String(l.userId || '').trim()
        const eventTime = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
        if (!userId || Number.isNaN(eventTime.getTime())) continue

        const eventType = String(l.eventType || '').trim()
        const logId = uuid()

        // Store raw device log (deduped)
        const [logRes] = await conn.execute(
          `INSERT IGNORE INTO hr_biometric_logs (id, deviceId, deviceUserId, eventTime, eventType, rawJson)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [logId, device.id, userId, eventTime, eventType, JSON.stringify(l.raw || {})]
        )
        if (logRes && logRes.affectedRows) insertedLogs += logRes.affectedRows

        const employeeId = employeeMap.get(userId)
        if (!employeeId) {
          skippedUnmapped += 1
          continue
        }

        // Store attendance event for UI (deduped)
        const evId = uuid()
        const [evRes] = await conn.execute(
          `INSERT IGNORE INTO hr_attendance_events (id, employeeId, eventTime, eventType, location, notes, source, deviceId)
           VALUES (?, ?, ?, ?, 'Office', NULL, 'device', ?)`,
          [evId, employeeId, eventTime, 'punch', device.id]
        )
        if (evRes && evRes.affectedRows) insertedEvents += evRes.affectedRows
      }

      await conn.execute('UPDATE hr_biometric_devices SET lastSyncAt = ? WHERE id = ?', [new Date(), device.id])

      console.log(`Inserted biometric logs: ${insertedLogs}`)
      console.log(`Inserted attendance events: ${insertedEvents}`)
      if (skippedUnmapped) {
        console.log(`Skipped (no employee biometricUserId match): ${skippedUnmapped}`)
      }
    }

    console.log('\n✅ Fingerprint sync complete')
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('\n❌ Fingerprint sync failed:', err && err.message ? err.message : err)
  process.exit(1)
})
