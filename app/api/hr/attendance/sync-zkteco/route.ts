import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { ensureHRAllTables } from '@/app/api/hr/_db'
import { getDbPool } from '@/lib/db'

type PunchRow = RowDataPacket & {
  pin: string
  eventTime: string
  deviceCode: string
  employeeId: string
}

function toDateTime(value: unknown): string {
  const s = String(value || '')
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 19).replace('T', ' ')
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

export async function POST(request: NextRequest) {
  try {
    await ensureHRAllTables()

    const body = await request.json().catch(() => ({} as any))
    const fromRaw = String(body?.from || '').trim()
    const toRaw = String(body?.to || '').trim()

    const now = new Date()
    const defaultFrom = new Date(now)
    defaultFrom.setDate(defaultFrom.getDate() - 30)

    const from = fromRaw ? new Date(fromRaw) : defaultFrom
    const to = toRaw ? new Date(toRaw) : now

    const safeFrom = Number.isNaN(from.getTime()) ? defaultFrom : from
    const safeTo = Number.isNaN(to.getTime()) ? now : to

    const pool = getDbPool()

    // Read raw punches captured from the device (by PIN), then map to employees
    // via hr_employees.biometricUserId (or fallback to employeeId).
    const [rows] = await pool.execute(
      `SELECT
         p.pin as pin,
         p.\`timestamp\` as eventTime,
         p.device_id as deviceCode,
         emp.employeeId as employeeId
       FROM zkteco_punches p
       JOIN hr_employees emp
         ON (emp.biometricUserId IS NOT NULL AND emp.biometricUserId <> '' AND emp.biometricUserId = p.pin)
         OR (emp.employeeId IS NOT NULL AND emp.employeeId <> '' AND emp.employeeId = p.pin)
       WHERE p.\`timestamp\` >= ? AND p.\`timestamp\` <= ?
       ORDER BY p.\`timestamp\` ASC`,
      [toDateTime(safeFrom.toISOString()), toDateTime(safeTo.toISOString())],
    )

    const punches = (rows as any as PunchRow[]) || []
    if (punches.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          matched: 0,
          inserted: 0,
          message:
            'No punches found to import. Ensure the device has uploaded logs and employees have biometricUserId set to match device PINs.',
        },
      })
    }

    let inserted = 0
    for (const batch of chunk(punches, 300)) {
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',')
      const params: any[] = []

      for (const p of batch) {
        const id = crypto.randomUUID()
        const employeeId = String(p.employeeId).trim()
        const eventTime = new Date(p.eventTime)
        if (!employeeId || Number.isNaN(eventTime.getTime())) continue

        params.push(
          id,
          employeeId,
          eventTime,
          'punch',
          'Office',
          `Device: ${String(p.deviceCode || '').slice(0, 80)}; PIN: ${String((p as any).pin || '').slice(0, 30)}`.trim(),
          'biometric',
          null,
        )
      }

      if (params.length === 0) continue

      const [result] = await pool.execute(
        `INSERT IGNORE INTO hr_attendance_events (
           id, employeeId, eventTime, eventType, location, notes, source, deviceId
         ) VALUES ${placeholders}`,
        params,
      )

      const affected = Number((result as any)?.affectedRows ?? 0)
      inserted += Number.isFinite(affected) ? affected : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        matched: punches.length,
        inserted,
      },
      message: 'Imported biometric punches into HR attendance.',
    })
  } catch (e: any) {
    console.error('sync-zkteco error', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to sync biometric attendance' },
      { status: 500 },
    )
  }
}
