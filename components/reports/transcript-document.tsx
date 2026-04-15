import styles from "./transcript-document.module.css"

import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google"

import type { TranscriptData, TranscriptTerm } from "@/types/transcript"

export type { TranscriptData }

const ibmSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const ibmSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
})

function fmtGpa(value: number) {
  if (!Number.isFinite(value)) return "0.00"
  return value.toFixed(2)
}

function termSortKey(t: TranscriptTerm) {
  // Spring is first, Fall is second (per requirement)
  const termOrder = t.term === "Spring Semester" ? 0 : 1
  return `${t.academicYear}::${termOrder}`
}

function groupByAcademicYear(terms: TranscriptTerm[]) {
  const map = new Map<string, TranscriptTerm[]>()
  for (const t of terms) {
    const list = map.get(t.academicYear) || []
    list.push(t)
    map.set(t.academicYear, list)
  }

  const years = Array.from(map.keys()).sort()
  return years.map((y) => {
    const items = (map.get(y) || []).slice().sort((a, b) => (termSortKey(a) < termSortKey(b) ? -1 : 1))
    return { academicYear: y, terms: items }
  })
}

export function TranscriptDocument({
  data,
  variant = "official",
}: {
  data: TranscriptData
  variant?: "official" | "student"
}) {
  const years = groupByAcademicYear(data.terms)
  const totalCourses = data.terms.reduce((sum, t) => sum + (Array.isArray(t.courses) ? t.courses.length : 0), 0)
  const orderedTerms = data.terms.slice().sort((a, b) => (termSortKey(a) < termSortKey(b) ? -1 : 1))

  return (
    <div className={`${styles.page} ${ibmSans.className}`}>
      <div className={styles.borderFrame}>
        <div className={styles.pattern} />
          <div className={styles.watermark} />

        {/* Header */}
        <div className="relative">
          <div className="grid grid-cols-[120px_1fr_140px] items-start gap-3">
            <div className="shrink-0 ml-1 flex flex-col items-center">
              <div className="h-16 w-16 border border-border bg-card/50 flex items-center justify-center overflow-hidden">
                <img src="/api/brand/logo" alt="System logo" className="h-full w-full object-contain" />
              </div>
              <div className="mt-1 text-[9px] leading-none text-muted-foreground text-center">
                Vehicle for Peace &amp;
                <br />
                Development
              </div>
            </div>

            <div className="text-center">
              <div className={`${ibmSerif.className} text-2xl font-bold tracking-wide uppercase leading-tight`}>{data.universityName}</div>
              <div className={`${ibmSerif.className} text-base italic text-muted-foreground leading-tight`}>{data.subtitle}</div>
            </div>

            <div className="text-right text-[10px] text-muted-foreground whitespace-nowrap">
              {variant === "official" ? (
                <>
                  <div>
                    Serial No: <span className="text-foreground font-medium">{data.serialNumber}</span>
                  </div>
                  <div>
                    Date of Issue: <span className="text-foreground font-medium">{data.dateOfIssue}</span>
                  </div>
                  {data.security?.qrDataUrl ? (
                    <div className="mt-2 flex justify-end">
                      <img
                        src={String(data.security.qrDataUrl)}
                        alt="Transcript verification QR"
                        className="h-[72px] w-[72px] border border-border bg-card"
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div>
                    Date of Issue: <span className="text-foreground font-medium">{data.dateOfIssue}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={variant === "official" ? "mt-1.5 border border-border rounded-sm bg-card/30" : "mt-1.5 border border-border rounded-sm bg-card/30"}>
            {/* Student info */}
            {variant === "official" ? (
              <div className="grid grid-cols-2 gap-0 text-[12px]">
                <div className="p-2 border-r border-border">
                  <div className="grid grid-cols-[120px_1fr] gap-y-0.5">
                    <div className="font-medium whitespace-nowrap">Student Name:</div>
                    <div className="truncate">{data.student.studentName}</div>
                    <div className="font-medium whitespace-nowrap">Student ID:</div>
                    <div className="tabular-nums">{data.student.studentId}</div>
                    <div className="font-medium whitespace-nowrap">Faculty:</div>
                    <div className="truncate">{data.student.faculty}</div>
                    <div className="font-medium whitespace-nowrap">Department:</div>
                    <div className="truncate">{data.student.department}</div>
                    <div className="font-medium whitespace-nowrap">CGPA:</div>
                    <div className="font-semibold tabular-nums">{data.student.cgpa}</div>
                  </div>
                </div>

                <div className="p-2">
                  <div className="grid grid-cols-[132px_1fr] gap-y-0.5">
                    <div className="font-medium whitespace-nowrap">Initial Entry:</div>
                    <div className="tabular-nums">{data.student.dateOfInitialEntry}</div>
                    <div className="font-medium whitespace-nowrap">Degree Granted:</div>
                    <div className="truncate">{data.student.degreeGranted}</div>
                    <div className="font-medium whitespace-nowrap">Date Granted:</div>
                    <div className="tabular-nums">{data.student.dateGranted}</div>
                    <div className="font-medium whitespace-nowrap">Total Courses:</div>
                    <div className="tabular-nums">{totalCourses}</div>
                    <div className="font-medium whitespace-nowrap">Comprehensive Exam:</div>
                    <div className="font-medium whitespace-nowrap">Pass</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2">
                <div className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
                  <div className="font-medium">Student:</div>
                  <div className="font-medium">{data.student.studentName}</div>
                  <div className="font-medium">Student ID:</div>
                  <div>{data.student.studentId}</div>
                  <div className="font-medium">Faculty:</div>
                  <div>{data.student.faculty}</div>
                  <div className="font-medium">Department:</div>
                  <div>{data.student.department}</div>
                  <div className="font-medium">CGPA:</div>
                  <div className="font-semibold tabular-nums">{data.student.cgpa}</div>
                </div>
              </div>
            )}

            {/* Academic summary is official-transcript only */}
            {variant === "official" ? (
              <div className="border-t border-border">
                <div className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">Academic Summary</div>
                <div className="px-2 pb-2">
                  <div className="border border-border rounded-sm overflow-hidden">
                    <AcademicSummaryGrid terms={orderedTerms} />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Detailed tables (two-column like the reference) */}
          <div className="mt-2 space-y-2">
            {years.map((y) => {
              const spring = y.terms.find((t) => t.term === "Spring Semester")
              const fall = y.terms.find((t) => t.term === "Fall Semester")

              return (
                <div key={y.academicYear} className="grid grid-cols-2 gap-3">
                  <TermBlock academicYear={y.academicYear} term={spring} fallbackTerm="Spring Semester" />
                  <TermBlock academicYear={y.academicYear} term={fall} fallbackTerm="Fall Semester" />
                </div>
              )
            })}
          </div>

          {variant === "official" ? (
            <div className="mt-2 border border-border rounded-sm bg-card/20 p-2 text-[10px] text-muted-foreground">
              <div>
                Letter grades earn honor points at the rates, per credit hour, of A(90-100)=4, B(80-89)=3, C(65-79)=2, D(50-64)=1.
                A cumulative grade point average (CGPA) of 2.00 is required to remain in good standing and to graduate.
              </div>
              <div className="mt-2">
                This document constitutes an official transcript only when it bears the Bah Habar Gobe embossed Seal and this watermark.
              </div>
            </div>
          ) : null}

          {/* Footer */}
          {variant === "official" ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div className="border border-border rounded-sm p-2 min-h-[56px]">
                <div className="font-semibold uppercase tracking-wide">Official Stamp</div>
                <div className="mt-4 border-t border-border pt-2 text-muted-foreground">&nbsp;</div>
              </div>
              <div className="border border-border rounded-sm p-2 min-h-[56px]">
                <div className="font-semibold uppercase tracking-wide">Signature</div>
                <div className="mt-4 border-t border-border pt-2 text-muted-foreground">&nbsp;</div>
              </div>
              <div className="border border-border rounded-sm p-2 min-h-[56px]">
                <div className="font-semibold uppercase tracking-wide">Verification</div>
                <div className="mt-2 text-muted-foreground">Verification Code</div>
                <div className="font-mono text-[12px] text-foreground">{data.serialNumber}</div>
              </div>
            </div>
          ) : null}

          <div className="mt-3 text-[11px] text-muted-foreground">
            {variant === "official"
              ? "This document is generated by the university system. Any alteration renders it invalid."
              : "Student gradesheet for viewing only. Not an official transcript."}
          </div>
        </div>
      </div>
    </div>
  )
}

function TermBlock({
  academicYear,
  term,
  fallbackTerm,
}: {
  academicYear: string
  term?: TranscriptTerm
  fallbackTerm: "Spring Semester" | "Fall Semester"
}) {
  const termName = term?.term || fallbackTerm

  return (
    <div className={`${styles.termBlock} border border-border rounded-sm bg-card/20 overflow-hidden`}>
      <div className="px-2 py-1 text-[10px] bg-muted/40 border-b border-border flex items-center justify-between">
        <div className="font-semibold">Academic Year: {academicYear}</div>
        <div className="font-semibold">Term: {termName}</div>
      </div>

      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="border border-border px-1 py-0.5 text-left">Course Code</th>
            <th className="border border-border px-1 py-0.5 text-left">Course Title</th>
            <th className="border border-border px-1 py-0.5 text-center">Cr</th>
            <th className="border border-border px-1 py-0.5 text-center">Gr</th>
            <th className="border border-border px-1 py-0.5 text-center">HP</th>
          </tr>
        </thead>
        <tbody>
          {(term?.courses || []).length === 0 ? (
            <tr>
              <td className="border border-border px-2 py-3 text-center text-muted-foreground" colSpan={5}>
                No courses
              </td>
            </tr>
          ) : (
            (term?.courses || []).map((c) => (
              <tr key={`${c.code}-${c.title}`}>
                <td className="border border-border px-1 py-0.5 font-medium">{c.code}</td>
                <td className="border border-border px-1 py-0.5">{c.title}</td>
                <td className="border border-border px-1 py-0.5 text-center tabular-nums">{c.creditHours}</td>
                <td className="border border-border px-1 py-0.5 text-center">{c.grade}</td>
                <td className="border border-border px-1 py-0.5 text-center tabular-nums">{c.honorPoints}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="px-2 py-1 text-[10px] border-t border-border flex items-center justify-between text-muted-foreground">
        <div>
          Credits (Current): <span className="text-foreground tabular-nums">{term?.creditHoursCurrent ?? 0}</span>
        </div>
        <div>
          GPA (Current): <span className="text-foreground tabular-nums">{fmtGpa(term?.gpaCurrent ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}

function AcademicSummaryGrid({ terms }: { terms: TranscriptTerm[] }) {
  const slots = new Array<TranscriptTerm | null>(8).fill(null)
  for (let i = 0; i < Math.min(8, terms.length); i++) {
    slots[i] = terms[i]
  }

  const termHonorPoints = slots.map((t) =>
    t ? (t.courses || []).reduce((sum, c) => sum + (Number.isFinite(c.honorPoints) ? c.honorPoints : 0), 0) : 0,
  )
  const cumHonorPoints = termHonorPoints.reduce<number[]>((acc, hp, idx) => {
    const prev = idx > 0 ? acc[idx - 1] : 0
    acc.push(prev + hp)
    return acc
  }, [])

  const headerLabels = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"]

  const cell = "border border-border px-1 py-0.5"
  const head = `${cell} bg-muted/40 text-center font-semibold`
  const label = `${cell} text-left font-medium whitespace-nowrap`
  const sub = `${cell} text-left text-muted-foreground whitespace-nowrap`
  const num = `${cell} text-center tabular-nums`

  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr>
          <th className={head} colSpan={2}>
            Semester
          </th>
          {headerLabels.map((h) => (
            <th key={h} className={head}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={label} rowSpan={2}>
            Credit Hours
          </td>
          <td className={sub}>Current</td>
          {slots.map((t, idx) => (
            <td key={`ch-cur-${idx}`} className={num}>
              {t ? t.creditHoursCurrent : ""}
            </td>
          ))}
        </tr>
        <tr>
          <td className={sub}>Cumulative</td>
          {slots.map((t, idx) => (
            <td key={`ch-cum-${idx}`} className={num}>
              {t ? t.creditHoursCumulative : ""}
            </td>
          ))}
        </tr>

        <tr>
          <td className={label} rowSpan={2}>
            Honor Points
          </td>
          <td className={sub}>Current</td>
          {slots.map((t, idx) => (
            <td key={`hp-cur-${idx}`} className={num}>
              {t ? termHonorPoints[idx].toFixed(2).replace(/\.00$/, "") : ""}
            </td>
          ))}
        </tr>
        <tr>
          <td className={sub}>Cumulative</td>
          {slots.map((t, idx) => (
            <td key={`hp-cum-${idx}`} className={num}>
              {t ? cumHonorPoints[idx].toFixed(2).replace(/\.00$/, "") : ""}
            </td>
          ))}
        </tr>

        <tr>
          <td className={label} rowSpan={2}>
            Grade Point Average
          </td>
          <td className={sub}>Current</td>
          {slots.map((t, idx) => (
            <td key={`gpa-cur-${idx}`} className={num}>
              {t ? fmtGpa(t.gpaCurrent) : ""}
            </td>
          ))}
        </tr>
        <tr>
          <td className={sub}>Cumulative</td>
          {slots.map((t, idx) => (
            <td key={`gpa-cum-${idx}`} className={num}>
              {t ? fmtGpa(t.gpaCumulative) : ""}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}
