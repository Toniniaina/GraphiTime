import { useEffect, useRef, useState } from 'react'
import { DAYS, HOURS, SUBJECT_COLORS, WEEKS } from './data'
import { S } from './styles'
import type { DbClass, DbProfessorUnavailability, DbScheduledSession } from './types'

const START_MINUTE = 6 * 60
const PX_PER_HOUR = 64

export function PlanningPage({
  professorsCount,
  classes,
  scheduledSessions,
  professorUnavailability,
  selectedClass,
  setSelectedClass,
  onAddClick,
  onExportCsv,
  onExportXlsx,
  onExportPdf,
  onImportCsv,
  onImportFile,
  onMoveSession,
  sessionExplanations,
  onSelectSession,
  planningIoError,
}: {
  professorsCount: number
  classes: DbClass[]
  scheduledSessions: DbScheduledSession[]
  professorUnavailability: DbProfessorUnavailability[]
  selectedClass: string
  setSelectedClass: (v: string) => void
  onAddClick?: () => void
  onExportCsv?: () => void | Promise<void>
  onExportXlsx?: () => void | Promise<void>
  onExportPdf?: () => void | Promise<void>
  onImportCsv?: (file: File) => void | Promise<void>
  onImportFile?: (file: File) => void | Promise<void>
  onMoveSession?: (sessionId: string, dayOfWeek: number, startMinute: number, endMinute: number) => void | Promise<void>
  sessionExplanations?: Record<
    string,
    {
      totalCost: number
      baseCost: number
      lunchPenalty: number
      holePenalty: number
    }
  >
  onSelectSession?: (sessionId: string) => void
  planningIoError?: string
}) {
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const dragSessionRef = useRef<{ id: string; duration: number } | null>(null)

  const todayIdx = (() => {
    const jsDay = new Date().getDay()
    const mondayBased = (jsDay + 6) % 7
    return mondayBased >= 0 && mondayBased < DAYS.length ? mondayBased : -1
  })()

  useEffect(() => {
    if (!classes.length) return
    if (selectedClass && classes.some((c) => c.id === selectedClass)) return
    setSelectedClass(classes[0].id)
  }, [classes, selectedClass, setSelectedClass])

  const classSessions = scheduledSessions.filter((s) => s.course.schoolClass.id === selectedClass)

  const formatHours = (hours: number) => {
    const rounded = Math.round(hours * 10) / 10
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  }

  const totalHoursForSessions = (sessions: DbScheduledSession[]) =>
    sessions.reduce((acc, s) => acc + (s.endMinute - s.startMinute) / 60, 0)

  const hoursThisClass = totalHoursForSessions(classSessions)

  const hoursByClass = (() => {
    const m = new Map<string, number>()
    for (const ses of scheduledSessions) {
      const cid = ses.course.schoolClass.id
      m.set(cid, (m.get(cid) ?? 0) + (ses.endMinute - ses.startMinute) / 60)
    }
    return m
  })()

  const avgHours = hoursByClass.size
    ? Array.from(hoursByClass.values()).reduce((a, b) => a + b, 0) / hoursByClass.size
    : 0

  const diff = hoursThisClass - avgHours
  const diffLabel = `${diff >= 0 ? '+' : ''}${formatHours(diff)}h vs. moyenne`

  const subjectsCount = new Set(classSessions.map((s) => s.course.subject.name)).size
  const roomsUsedCount = new Set(classSessions.map((s) => s.room.name)).size

  const mergedSessions = (() => {
    const byDay = new Map<number, DbScheduledSession[]>()
    for (const ses of classSessions) {
      const day = ses.dayOfWeek ?? 1
      const arr = byDay.get(day) ?? []
      arr.push(ses)
      byDay.set(day, arr)
    }

    const out: DbScheduledSession[] = []
    for (const [day, arr] of byDay.entries()) {
      const sorted = [...arr].sort((a, b) => a.startMinute - b.startMinute)
      let cur: DbScheduledSession | null = null

      const sameIdentity = (a: DbScheduledSession, b: DbScheduledSession) =>
        a.course.subject.name === b.course.subject.name &&
        a.course.professor.name === b.course.professor.name &&
        a.room.name === b.room.name

      for (const ses of sorted) {
        if (!cur) {
          cur = ses
          continue
        }

        if ((cur.dayOfWeek ?? 1) === day && sameIdentity(cur, ses) && cur.endMinute === ses.startMinute) {
          cur = {
            ...cur,
            endMinute: ses.endMinute,
          }
          continue
        }

        out.push(cur)
        cur = ses
      }

      if (cur) out.push(cur)
    }

    return out
  })()

  const displaySessions = onMoveSession ? classSessions : mergedSessions

  const timeToMinute = (t: string) => {
    const [hh, mm] = t.split(':').map((v) => Number(v))
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0
    return hh * 60 + mm
  }

  const isProfessorUnavailable = (ses: DbScheduledSession) => {
    const profId = ses.course.professor.id
    const day = ses.dayOfWeek
    const start = ses.startMinute
    const end = ses.endMinute

    for (const u of professorUnavailability) {
      if (u.professor.id !== profId) continue
      if (u.dayOfWeek !== day) continue
      const uStart = timeToMinute(u.startTime)
      const uEnd = timeToMinute(u.endTime)
      const overlaps = start < uEnd && end > uStart
      if (overlaps) return true
    }
    return false
  }

  const toHHMM = (minute: number) => {
    const m = Math.max(0, Math.floor(Number(minute) || 0))
    const hh = Math.floor(m / 60)
    const mm = m % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  return (
    <div style={S.pageWrap}>
      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>Planning d'Emploi du Temps</div>
          <div style={S.breadcrumb}>
            <span>Accueil</span>
            <span style={S.breadSep}>›</span>
            <span style={{ color: '#c8922a' }}>Planning</span>
          </div>
        </div>
        <div style={S.topBarRight}>
          {onExportCsv || onExportXlsx || onExportPdf || onImportCsv || onImportFile ? (
            <>
              {onExportCsv ? (
                <button
                  style={{
                    background: 'white',
                    border: '1px solid rgba(13,31,53,0.16)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    color: '#0d1f35',
                  }}
                  onClick={() => void onExportCsv()}
                >
                  Export CSV
                </button>
              ) : null}

              {onExportXlsx ? (
                <button
                  style={{
                    background: 'white',
                    border: '1px solid rgba(13,31,53,0.16)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    color: '#0d1f35',
                  }}
                  onClick={() => void onExportXlsx()}
                >
                  Export Excel
                </button>
              ) : null}

              {onExportPdf ? (
                <button
                  style={{
                    background: 'white',
                    border: '1px solid rgba(13,31,53,0.16)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    color: '#0d1f35',
                  }}
                  onClick={() => void onExportPdf()}
                >
                  Export PDF
                </button>
              ) : null}

              {onImportCsv || onImportFile ? (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (onImportFile) {
                        void onImportFile(f)
                      } else if (onImportCsv) {
                        void onImportCsv(f)
                      }
                      e.target.value = ''
                    }}
                  />
                  <button
                    style={{
                      background: 'white',
                      border: '1px solid rgba(13,31,53,0.16)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: 'pointer',
                      color: '#0d1f35',
                    }}
                    onClick={() => fileRef.current?.click()}
                  >
                    Import (CSV/Excel)
                  </button>
                </>
              ) : null}
            </>
          ) : null}
          <div style={S.weekNav}>
            <button style={S.weekBtn} onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}>
              ‹
            </button>
            <span style={S.weekLabel}>{WEEKS[selectedWeek]}</span>
            <button
              style={S.weekBtn}
              onClick={() => setSelectedWeek(Math.min(WEEKS.length - 1, selectedWeek + 1))}
            >
              ›
            </button>
          </div>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={S.classSelect}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button style={S.addBtn} onClick={onAddClick}>
            {onAddClick ? 'Générer' : '＋ Ajouter'}
          </button>
        </div>
      </header>

      {planningIoError ? (
        <div style={{ margin: '0 32px 12px', color: '#c0392b', fontSize: 13, fontWeight: 700, whiteSpace: 'pre-wrap' }}>
          {planningIoError}
        </div>
      ) : null}

      <div style={S.statsRow}>
        {[
          { label: 'Heures / semaine', value: `${formatHours(hoursThisClass)}h`, sub: diffLabel, icon: '◷' },
          { label: 'Matières', value: String(subjectsCount), sub: 'Sur la classe sélectionnée', icon: '◈' },
          { label: 'Professeurs', value: String(professorsCount), sub: 'Tous disponibles', icon: '⊛' },
          { label: 'Salles utilisées', value: String(roomsUsedCount), sub: 'Sur la classe sélectionnée', icon: '⊞' },
        ].map((stat, i) => (
          <div key={i} style={S.statCard} className="stat-card">
            <div style={S.statIcon}>{stat.icon}</div>
            <div>
              <div style={S.statValue}>{stat.value}</div>
              <div style={S.statLabel}>{stat.label}</div>
              <div style={S.statSub}>{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={S.scheduleContainer}>
        <div style={S.gridHeader}>
          <div style={S.timeCol} />
          {DAYS.map((day, i) => (
            <div key={day} style={{ ...S.dayHeader, ...(i === todayIdx ? S.dayHeaderToday : {}) }}>
              <div style={S.dayName}>{day}</div>
              {i === todayIdx ? <div style={S.todayBadge}>Aujourd'hui</div> : null}
            </div>
          ))}
        </div>
        <div style={S.gridBody}>
          <div style={S.timeCol}>
            {HOURS.map((h) => (
              <div key={h} style={S.timeCell}>
                {h}
              </div>
            ))}
          </div>
          {DAYS.map((day, dayIdx) => (
            <div
              key={day}
              style={S.dayColumn}
              onDragOver={(e) => {
                if (!onMoveSession) return
                e.preventDefault()
              }}
              onDrop={(e) => {
                if (!onMoveSession) return
                const d = dragSessionRef.current
                if (!d) return

                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                const y = e.clientY - rect.top
                const hoursFromStart = Math.max(0, Math.round(y / PX_PER_HOUR))
                const newStart = START_MINUTE + hoursFromStart * 60
                const newEnd = newStart + d.duration
                void onMoveSession(d.id, dayIdx + 1, newStart, newEnd)
                dragSessionRef.current = null
              }}
            >
              {HOURS.map((_, i) => (
                <div key={i} style={S.hourLine} />
              ))}
              {displaySessions
                .filter((ses) => (ses.dayOfWeek ?? 1) - 1 === dayIdx)
                .map((ses, idx) => {
                  const subject = ses.course.subject.name
                  const teacher = ses.course.professor.name
                  const room = ses.room.name
                  const unavailable = isProfessorUnavailable(ses)
                  const availabilityLabel = unavailable ? 'indispo' : 'dispo'
                  const topHours = (ses.startMinute - START_MINUTE) / 60
                  const durHours = (ses.endMinute - ses.startMinute) / 60
                  const localId = idx + 1
                  return (
                    <div
                      key={ses.id}
                      className="class-block"
                      style={{
                        ...S.classBlock,
                        top: topHours * PX_PER_HOUR + 4,
                        height: durHours * PX_PER_HOUR - 8,
                        backgroundColor: SUBJECT_COLORS[subject] || '#1a3a5c',
                        opacity: hoveredBlock && hoveredBlock !== localId ? 0.55 : 1,
                      }}
                      title={(() => {
                        const ex = sessionExplanations?.[ses.id]
                        if (!ex) return ''
                        const parts = [
                          `${toHHMM(ses.startMinute)}–${toHHMM(ses.endMinute)}`,
                          `Score: ${ex.totalCost}`,
                          ex.lunchPenalty ? `Pause midi: +${ex.lunchPenalty}` : '',
                          ex.holePenalty ? `Trous: +${ex.holePenalty}` : '',
                        ].filter(Boolean)
                        return parts.join(' \n')
                      })()}
                      draggable={!!onMoveSession}
                      onDragStart={() => {
                        if (!onMoveSession) return
                        dragSessionRef.current = { id: ses.id, duration: ses.endMinute - ses.startMinute }
                      }}
                      onDragEnd={() => {
                        dragSessionRef.current = null
                      }}
                      onClick={() => onSelectSession?.(ses.id)}
                      onMouseEnter={() => setHoveredBlock(localId)}
                      onMouseLeave={() => setHoveredBlock(null)}
                    >
                      <div style={S.classSubject}>{subject}</div>
                      <div style={S.classTeacher}>
                        {teacher} ({availabilityLabel})
                      </div>
                      <div style={S.classRoom}>{room}</div>
                      <div style={S.classDuration}>{durHours}h</div>
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      </div>

      <div style={S.legend}>
        {Array.from(new Set(displaySessions.map((s) => s.course.subject.name))).map((subj) => (
          <div key={subj} style={S.legendItem}>
            <div style={{ ...S.legendDot, background: SUBJECT_COLORS[subj] || '#1a3a5c' }} />
            <span style={S.legendText}>{subj}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
