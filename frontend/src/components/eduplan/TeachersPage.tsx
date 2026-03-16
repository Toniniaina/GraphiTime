import { useEffect, useMemo, useState } from 'react'
import { DAYS, HOURS, SUBJECT_COLORS, WEEKS } from './data'
import type { DbProfessorUnavailability, DbScheduledSession, Professor } from './types'
import { S } from './styles'

const START_MINUTE = 6 * 60
const PX_PER_HOUR = 64

export function TeachersPage({
  professors,
  scheduledSessions,
  professorUnavailability,
  newProfessorName,
  setNewProfessorName,
  onCreateProfessor,
  profError,
  ping,
  dbOk,
}: {
  professors: Professor[]
  scheduledSessions: DbScheduledSession[]
  professorUnavailability: DbProfessorUnavailability[]
  newProfessorName: string
  setNewProfessorName: (v: string) => void
  onCreateProfessor: () => void
  profError: string
  ping: string
  dbOk: boolean | null
}) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'planning'>('planning')
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [selectedProfessorId, setSelectedProfessorId] = useState('')
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null)

  useEffect(() => {
    if (!professors.length) return
    if (selectedProfessorId && professors.some((p) => p.id === selectedProfessorId)) return
    setSelectedProfessorId(professors[0].id)
  }, [professors, selectedProfessorId])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return professors
    return professors.filter((p) => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s))
  }, [professors, search])

  const todayIdx = (() => {
    const jsDay = new Date().getDay()
    const mondayBased = (jsDay + 6) % 7
    return mondayBased >= 0 && mondayBased < DAYS.length ? mondayBased : -1
  })()

  const timeToMinute = (t: string) => {
    const [hh, mm] = t.split(':').map((v) => Number(v))
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0
    return hh * 60 + mm
  }

  const teacherSessions = useMemo(() => {
    if (!selectedProfessorId) return []
    return scheduledSessions.filter((s) => s.course.professor.id === selectedProfessorId)
  }, [scheduledSessions, selectedProfessorId])

  const mergedTeacherSessions = useMemo(() => {
    const byDay = new Map<number, DbScheduledSession[]>()
    for (const ses of teacherSessions) {
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
        a.course.schoolClass.name === b.course.schoolClass.name &&
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
  }, [teacherSessions])

  const teacherUnavailability = useMemo(() => {
    if (!selectedProfessorId) return []
    return professorUnavailability
      .filter((u) => u.professor.id === selectedProfessorId)
      .map((u) => ({
        id: u.id,
        dayOfWeek: u.dayOfWeek,
        startMinute: timeToMinute(u.startTime),
        endMinute: timeToMinute(u.endTime),
      }))
  }, [professorUnavailability, selectedProfessorId])

  return (
    <div style={S.pageWrap}>
      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>Gestion des Professeurs</div>
          <div style={S.breadcrumb}>
            <span>Accueil</span>
            <span style={S.breadSep}>›</span>
            <span style={{ color: '#c8922a' }}>Professeurs</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'white', border: '1px solid rgba(13,31,53,0.12)', borderRadius: 10 }}>
            <button
              style={{
                padding: '8px 12px',
                border: 'none',
                background: view === 'planning' ? 'rgba(200,146,42,0.12)' : 'transparent',
                color: '#0d1f35',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
              onClick={() => setView('planning')}
            >
              Planning
            </button>
            <button
              style={{
                padding: '8px 12px',
                border: 'none',
                background: view === 'list' ? 'rgba(200,146,42,0.12)' : 'transparent',
                color: '#0d1f35',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
              onClick={() => setView('list')}
            >
              Liste
            </button>
          </div>
          <button style={S.addBtn} onClick={onCreateProfessor}>
            ＋ Ajouter
          </button>
        </div>
      </header>

      <div style={S.statsRow}>
        {[
          { label: 'Total professeurs', value: professors.length, sub: 'enregistrés', icon: '⊛' },
          { label: 'API', value: ping ? 'OK' : '...', sub: ping ? 'GraphQL actif' : 'en cours', icon: '◉' },
          { label: 'Base de données', value: dbOk === null ? '...' : dbOk ? 'OK' : 'KO', sub: 'PostgreSQL', icon: '◈' },
          { label: 'Filtrés', value: filtered.length, sub: 'résultats', icon: '◷' },
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

      <div style={S.filterRow}>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>⊛</span>
          <input
            placeholder="Rechercher un professeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={S.searchInput}
          />
          {search ? (
            <button style={S.clearSearch} onClick={() => setSearch('')}>
              ✕
            </button>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={newProfessorName}
            onChange={(e) => setNewProfessorName(e.target.value)}
            placeholder="Nom du professeur"
            style={{ ...S.searchInput, width: 260, paddingLeft: 14 }}
          />
          <button style={S.addBtn} onClick={onCreateProfessor}>
            ✓ Enregistrer
          </button>
        </div>
      </div>

      {profError ? (
        <div style={{ margin: '0 32px 12px', color: '#c0392b', fontSize: 13, fontWeight: 600 }}>{profError}</div>
      ) : null}

      {view === 'planning' ? (
        <>
          <div style={{ display: 'flex', gap: 12, padding: '0 32px 12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={S.weekNav}>
              <button style={S.weekBtn} onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}>
                ‹
              </button>
              <span style={S.weekLabel}>{WEEKS[selectedWeek]}</span>
              <button style={S.weekBtn} onClick={() => setSelectedWeek(Math.min(WEEKS.length - 1, selectedWeek + 1))}>
                ›
              </button>
            </div>
            <select
              value={selectedProfessorId}
              onChange={(e) => setSelectedProfessorId(e.target.value)}
              style={{ ...S.classSelect, minWidth: 260 }}
            >
              {filtered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 700 }}>
              Cours: couleur matière · Indispo: gris
            </div>
          </div>

          <div style={{ ...S.scheduleContainer, marginBottom: 20 }}>
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
                <div key={day} style={S.dayColumn}>
                  {HOURS.map((_, i) => (
                    <div key={i} style={S.hourLine} />
                  ))}

                  {teacherUnavailability
                    .filter((u) => (u.dayOfWeek ?? 1) - 1 === dayIdx)
                    .map((u, idx) => {
                      const topHours = (u.startMinute - START_MINUTE) / 60
                      const durHours = (u.endMinute - u.startMinute) / 60
                      const localId = 100000 + idx + 1
                      return (
                        <div
                          key={u.id}
                          style={{
                            ...S.classBlock,
                            top: topHours * PX_PER_HOUR + 4,
                            height: durHours * PX_PER_HOUR - 8,
                            backgroundColor: '#bdc3c7',
                            color: '#0d1f35',
                            boxShadow: 'none',
                            border: '1px solid rgba(13,31,53,0.12)',
                            opacity: hoveredBlock && hoveredBlock !== localId ? 0.55 : 1,
                          }}
                          onMouseEnter={() => setHoveredBlock(localId)}
                          onMouseLeave={() => setHoveredBlock(null)}
                        >
                          <div style={{ fontSize: 12, fontWeight: 800 }}>Indisponible</div>
                        </div>
                      )
                    })}

                  {mergedTeacherSessions
                    .filter((ses) => (ses.dayOfWeek ?? 1) - 1 === dayIdx)
                    .map((ses, idx) => {
                      const subject = ses.course.subject.name
                      const schoolClass = ses.course.schoolClass.name
                      const room = ses.room.name
                      const topHours = (ses.startMinute - START_MINUTE) / 60
                      const durHours = (ses.endMinute - ses.startMinute) / 60
                      const localId = idx + 1
                      return (
                        <div
                          key={ses.id}
                          style={{
                            ...S.classBlock,
                            top: topHours * PX_PER_HOUR + 4,
                            height: durHours * PX_PER_HOUR - 8,
                            backgroundColor: SUBJECT_COLORS[subject] || '#1a3a5c',
                            opacity: hoveredBlock && hoveredBlock !== localId ? 0.55 : 1,
                          }}
                          onMouseEnter={() => setHoveredBlock(localId)}
                          onMouseLeave={() => setHoveredBlock(null)}
                        >
                          <div style={S.classSubject}>{subject}</div>
                          <div style={S.classTeacher}>{schoolClass}</div>
                          <div style={S.classRoom}>{room}</div>
                          <div style={S.classDuration}>{durHours}h</div>
                        </div>
                      )
                    })}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '0 32px 20px' }}>
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              border: '1px solid rgba(13,31,53,0.08)',
              boxShadow: '0 4px 24px rgba(13,31,53,0.06)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '220px 1fr',
                gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid rgba(13,31,53,0.08)',
                fontSize: 11,
                letterSpacing: '0.12em',
                color: 'rgba(13,31,53,0.45)',
                fontWeight: 800,
              }}
            >
              <div>ID</div>
              <div>Nom</div>
            </div>
            {filtered.length ? (
              filtered.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr',
                    gap: 12,
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(13,31,53,0.06)',
                    fontSize: 13,
                    color: '#0d1f35',
                  }}
                >
                  <div style={{ fontFamily: 'monospace', color: 'rgba(13,31,53,0.7)' }}>{p.id}</div>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: 24, color: 'rgba(13,31,53,0.45)', fontSize: 13 }}>Aucun professeur.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
