import { useEffect, useMemo, useState } from 'react'
import type { DbClass, DbCourse, DbScheduledSession, DbSubject, Professor } from './types'
import { S } from './styles'

export function SubjectsPage({
  professors,
  classes,
  subjects,
  courses,
  scheduledSessions,
  newSubjectName,
  setNewSubjectName,
  onCreateSubject,
  onRenameSubject,
  onDeleteSubject,
  subjectError,
  onCreateCourse,
  onUpdateCourse,
  onDeleteCourse,
  courseError,
}: {
  professors: Professor[]
  classes: DbClass[]
  subjects: DbSubject[]
  courses: DbCourse[]
  scheduledSessions: DbScheduledSession[]
  newSubjectName: string
  setNewSubjectName: (value: string) => void
  onCreateSubject: () => void | Promise<void>
  onRenameSubject: (id: string, name: string) => void | Promise<void>
  onDeleteSubject: (id: string) => void | Promise<void>
  subjectError?: string
  onCreateCourse: (
    classId: string,
    subjectId: string,
    professorId: string,
    requiredHoursPerWeek: number,
  ) => void | Promise<void>
  onUpdateCourse: (courseId: string, professorId: string, requiredHoursPerWeek: number) => void | Promise<void>
  onDeleteCourse: (courseId: string) => void | Promise<void>
  courseError?: string
}) {
  const [view, setView] = useState<'list' | 'byClass'>('byClass')
  const [classQuery, setClassQuery] = useState<string>('')
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [backendMatches, setBackendMatches] = useState<Array<{ id: string; name: string }>>([])

  const [modal, setModal] = useState<
    | { type: 'edit'; subjectId: string; initialName: string; usedByCourses: number }
    | { type: 'delete'; subjectId: string; name: string; usedByCourses: number }
    | { type: 'info'; title: string; message: string }
    | null
  >(null)
  const [editNameValue, setEditNameValue] = useState<string>('')

  const [courseModal, setCourseModal] = useState<
    | {
        type: 'create'
        classId: string
        className: string
      }
    | {
        type: 'edit'
        courseId: string
        className: string
        subjectName: string
        professorId: string
        requiredHoursPerWeek: number
        sessionsCount: number
      }
    | {
        type: 'delete'
        courseId: string
        className: string
        subjectName: string
        sessionsCount: number
      }
    | null
  >(null)

  const [courseSubjectId, setCourseSubjectId] = useState<string>('')
  const [courseProfessorId, setCourseProfessorId] = useState<string>('')
  const [courseHours, setCourseHours] = useState<string>('')

  const sessionsByCourse = new Map<string, number>()
  for (const ses of scheduledSessions) {
    const id = ses.course.id
    sessionsByCourse.set(id, (sessionsByCourse.get(id) ?? 0) + 1)
  }

  const coursesByClass = new Map<string, DbCourse[]>()
  for (const c of courses) {
    const clsId = c.schoolClass.id
    const arr = coursesByClass.get(clsId)
    if (arr) arr.push(c)
    else coursesByClass.set(clsId, [c])
  }

  for (const [clsId, arr] of coursesByClass) {
    arr.sort((a, b) => a.subject.name.localeCompare(b.subject.name))
    coursesByClass.set(clsId, arr)
  }

  const linkedClassesBySubject = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const c of courses) {
      const sid = c.subject.id
      const clsId = c.schoolClass.id
      const set = m.get(sid)
      if (set) set.add(clsId)
      else m.set(sid, new Set([clsId]))
    }
    return m
  }, [courses])

  const classesSorted = useMemo(() => {
    return classes.slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [classes])

  const subjectsSorted = useMemo(() => {
    return subjects.slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [subjects])

  const professorsSorted = useMemo(() => {
    return professors.slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [professors])

  async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const json = (await res.json()) as { data?: T; errors?: Array<{ message?: string }> }
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).filter(Boolean).join(' · ') || 'GraphQL error')
    }
    if (!json.data) {
      throw new Error('No data')
    }
    return json.data
  }

  useEffect(() => {
    let cancelled = false
    const q = classQuery.trim()
    if (view !== 'byClass' || !q || selectedClassId) {
      setBackendMatches([])
      return
    }

    const t = window.setTimeout(() => {
      graphql<{ classes: Array<{ id: string; name: string }> }>(
        'query ($q: String) { classes(query: $q) { id name } }',
        { q },
      )
        .then((d) => {
          if (cancelled) return
          setBackendMatches(d.classes)
        })
        .catch(() => {
          if (cancelled) return
          setBackendMatches([])
        })
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [classQuery, selectedClassId, view])

  const classSuggestions = useMemo(() => {
    const q = classQuery.trim()
    if (!q || selectedClassId) return []
    return backendMatches.slice(0, 8)
  }, [backendMatches, classQuery, selectedClassId])

  const visibleClasses = useMemo(() => {
    if (selectedClassId) {
      return classesSorted.filter((c) => c.id === selectedClassId)
    }
    const q = classQuery.trim()
    if (!q) return classesSorted

    const ids = new Set(backendMatches.map((c) => c.id))
    if (!ids.size) return []
    return classesSorted.filter((c) => ids.has(c.id))
  }, [backendMatches, classesSorted, classQuery, selectedClassId])

  return (
    <div style={S.pageWrap}>
      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>Gestion des Matières par Classe</div>
          <div style={S.breadcrumb}>
            <span>Accueil</span>
            <span style={S.breadSep}>›</span>
            <span style={{ color: '#c8922a' }}>Matières</span>
          </div>
        </div>

        <div style={S.filterTabs}>
          <button
            style={{ ...S.filterTab, ...(view === 'byClass' ? S.filterTabActive : {}) }}
            onClick={() => setView('byClass')}
          >
            Par classe
          </button>
          <button
            style={{ ...S.filterTab, ...(view === 'list' ? S.filterTabActive : {}) }}
            onClick={() => setView('list')}
          >
            Liste
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>

      {view === 'list' ? (
        <>
          <div style={{ padding: '0 32px 8px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 280 }}>
              <input
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Nouvelle matière (ex: Maths)"
                style={{ ...S.searchInput, flex: 1, minWidth: 220 }}
              />
              <button style={S.addBtn} onClick={() => void onCreateSubject()}>
                Ajouter
              </button>
            </div>
          </div>

          {subjectError ? (
            <div style={{ margin: '0 32px 10px', color: '#c0392b', fontSize: 13, fontWeight: 700 }}>{subjectError}</div>
          ) : null}
        </>
      ) : null}

      {view === 'byClass' && courseError ? (
        <div style={{ margin: '0 32px 10px', color: '#c0392b', fontSize: 13, fontWeight: 700 }}>{courseError}</div>
      ) : null}

      <div style={S.statsRow}>
        {[
          { label: 'Total matières', value: subjects.length, sub: 'enregistrées', icon: '◎' },
          { label: 'Cours', value: courses.length, sub: 'associations', icon: '◈' },
          { label: 'Séances', value: scheduledSessions.length, sub: 'planifiées', icon: '◷' },
          {
            label: 'Classes',
            value: classes.length,
            sub: 'enregistrées',
            icon: '◉',
          },
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

      {view === 'list' ? (
        <div style={{ padding: '0 32px 16px' }}>
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
                gridTemplateColumns: '1fr 140px 140px',
                gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid rgba(13,31,53,0.08)',
                fontSize: 11,
                letterSpacing: '0.12em',
                color: 'rgba(13,31,53,0.45)',
                fontWeight: 800,
              }}
            >
              <div>Matière</div>
              <div>Classes</div>
              <div></div>
            </div>

            {subjects.length ? (
              subjects
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => {
                  const linkedClasses = linkedClassesBySubject.get(s.id)?.size ?? 0
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 140px 140px',
                        gap: 12,
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(13,31,53,0.06)',
                        fontSize: 13,
                        color: '#0d1f35',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{s.name}</div>
                      <div style={{ fontFamily: 'monospace', color: 'rgba(13,31,53,0.7)' }}>{linkedClasses || '—'}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          style={{
                            background: 'white',
                            border: '1px solid rgba(13,31,53,0.18)',
                            borderRadius: 10,
                            padding: '8px 10px',
                            fontSize: 12,
                            fontWeight: 900,
                            cursor: 'pointer',
                            color: 'rgba(13,31,53,0.85)',
                          }}
                          onClick={() => {
                            setEditNameValue(s.name)
                            setModal({ type: 'edit', subjectId: s.id, initialName: s.name, usedByCourses: linkedClasses })
                          }}
                        >
                          Modifier
                        </button>
                      </div>
                    </div>
                  )
                })
            ) : (
              <div style={{ padding: 16, color: 'rgba(13,31,53,0.45)', fontSize: 13 }}>Aucune matière.</div>
            )}
          </div>
        </div>
      ) : null}

      {view === 'byClass' ? (
        <div style={{ padding: '0 32px 14px' }}>
          <div style={{ position: 'relative', maxWidth: 520 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                value={classQuery}
                onChange={(e) => {
                  setClassQuery(e.target.value)
                  setSelectedClassId('')
                }}
                placeholder="Rechercher une classe (ex: 6e, 5e, A...)"
                style={S.searchInput}
              />
              {(classQuery || selectedClassId) && (
                <button
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(13,31,53,0.18)',
                    color: 'rgba(13,31,53,0.7)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => {
                    setClassQuery('')
                    setSelectedClassId('')
                  }}
                  title="Réinitialiser"
                >
                  Effacer
                </button>
              )}
            </div>

            {!selectedClassId && classSuggestions.length ? (
              <div
                style={{
                  position: 'absolute',
                  top: 46,
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid rgba(13,31,53,0.12)',
                  borderRadius: 14,
                  boxShadow: '0 12px 24px rgba(13,31,53,0.10)',
                  overflow: 'hidden',
                  zIndex: 10,
                }}
              >
                {classSuggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedClassId(c.id)
                      setClassQuery(c.name)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      border: 'none',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#0d1f35',
                    }}
                  >
                    <span style={{ fontWeight: 900 }}>{c.name}</span>
                    <span style={{ color: 'rgba(13,31,53,0.45)', fontSize: 12, fontFamily: 'monospace' }}>{c.id}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {view === 'byClass' ? (
        <div style={{ padding: '0 32px 20px' }}>
          {visibleClasses.length ? (
            visibleClasses.map((cls) => {
              const clsCourses = coursesByClass.get(cls.id) ?? []

              return (
                <div
                  key={cls.id}
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    border: '1px solid rgba(13,31,53,0.08)',
                    boxShadow: '0 4px 24px rgba(13,31,53,0.06)',
                    overflow: 'hidden',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(13,31,53,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ fontWeight: 900, color: '#0d1f35' }}>{cls.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ color: 'rgba(13,31,53,0.45)', fontSize: 12, fontWeight: 800 }}>
                        {clsCourses.length ? `${clsCourses.length} matière(s)` : 'Aucune matière'}
                      </div>
                      <button
                        style={S.addBtn}
                        onClick={() => {
                          setCourseSubjectId('')
                          setCourseProfessorId(professorsSorted[0]?.id ?? '')
                          setCourseHours('')
                          setCourseModal({ type: 'create', classId: cls.id, className: cls.name })
                        }}
                      >
                        Ajouter un cours
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 160px 140px 120px',
                      gap: 12,
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(13,31,53,0.08)',
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      color: 'rgba(13,31,53,0.45)',
                      fontWeight: 800,
                    }}
                  >
                    <div>Matière</div>
                    <div>Heures / semaine</div>
                    <div>Séances</div>
                    <div></div>
                  </div>

                  {clsCourses.length ? (
                    clsCourses.map((c) => {
                      const sesCount = sessionsByCourse.get(c.id) ?? 0
                      return (
                        <div
                          key={c.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 160px 140px 120px',
                            gap: 12,
                            padding: '14px 16px',
                            borderBottom: '1px solid rgba(13,31,53,0.06)',
                            fontSize: 13,
                            color: '#0d1f35',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>{c.subject.name}</div>
                          <div style={{ fontFamily: 'monospace', color: 'rgba(13,31,53,0.7)' }}>{c.requiredHoursPerWeek}</div>
                          <div style={{ color: sesCount ? '#2d6a4f' : 'rgba(13,31,53,0.45)', fontWeight: 800 }}>
                            {sesCount ? sesCount : '—'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              style={{
                                background: 'white',
                                border: '1px solid rgba(13,31,53,0.18)',
                                borderRadius: 10,
                                padding: '8px 10px',
                                fontSize: 12,
                                fontWeight: 900,
                                cursor: 'pointer',
                                color: 'rgba(13,31,53,0.85)',
                                whiteSpace: 'nowrap',
                              }}
                              onClick={() => {
                                setCourseProfessorId(c.professor.id)
                                setCourseHours(String(c.requiredHoursPerWeek))
                                setCourseModal({
                                  type: 'edit',
                                  courseId: c.id,
                                  className: cls.name,
                                  subjectName: c.subject.name,
                                  professorId: c.professor.id,
                                  requiredHoursPerWeek: c.requiredHoursPerWeek,
                                  sessionsCount: sesCount,
                                })
                              }}
                            >
                              Modifier
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div style={{ padding: 16, color: 'rgba(13,31,53,0.45)', fontSize: 13 }}>
                      Aucune matière pour cette classe.
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div style={{ padding: 24, color: 'rgba(13,31,53,0.45)', fontSize: 13 }}>
              {classes.length ? 'Aucune classe ne correspond à la recherche.' : 'Aucune classe.'}
            </div>
          )}
        </div>
      ) : null}

      {courseModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,31,53,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 70,
          }}
          onClick={() => setCourseModal(null)}
        >
          <div
            style={{
              width: 'min(560px, 92vw)',
              background: 'white',
              borderRadius: 16,
              border: '1px solid rgba(13,31,53,0.12)',
              boxShadow: '0 18px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(13,31,53,0.08)' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0d1f35' }}>
                {courseModal.type === 'create'
                  ? 'Ajouter un cours'
                  : courseModal.type === 'edit'
                    ? 'Modifier le cours'
                    : 'Supprimer le cours'}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 800 }}>
                {courseModal.type === 'create'
                  ? courseModal.className
                  : `${courseModal.className} · ${courseModal.subjectName}`}
              </div>
            </div>

            <div style={{ padding: 18 }}>
              {courseModal.type === 'create' ? (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(13,31,53,0.55)' }}>Matière</div>
                    <select
                      value={courseSubjectId}
                      onChange={(e) => setCourseSubjectId(e.target.value)}
                      style={{ ...S.searchInput, width: '100%', padding: '10px 12px' }}
                    >
                      <option value="">Sélectionner…</option>
                      {subjectsSorted.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(13,31,53,0.55)' }}>Professeur</div>
                    <select
                      value={courseProfessorId}
                      onChange={(e) => setCourseProfessorId(e.target.value)}
                      style={{ ...S.searchInput, width: '100%', padding: '10px 12px' }}
                    >
                      <option value="">Sélectionner…</option>
                      {professorsSorted.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(13,31,53,0.55)' }}>Heures / semaine</div>
                    <input
                      value={courseHours}
                      onChange={(e) => setCourseHours(e.target.value)}
                      placeholder="ex: 4"
                      style={{ ...S.searchInput, width: '100%', padding: '10px 12px' }}
                    />
                  </div>
                </div>
              ) : courseModal.type === 'edit' ? (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(13,31,53,0.55)' }}>Professeur</div>
                    <select
                      value={courseProfessorId}
                      onChange={(e) => setCourseProfessorId(e.target.value)}
                      style={{ ...S.searchInput, width: '100%', padding: '10px 12px' }}
                    >
                      <option value="">Sélectionner…</option>
                      {professorsSorted.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(13,31,53,0.55)' }}>Heures / semaine</div>
                    <input
                      value={courseHours}
                      onChange={(e) => setCourseHours(e.target.value)}
                      placeholder="ex: 4"
                      style={{ ...S.searchInput, width: '100%', padding: '10px 12px' }}
                    />
                  </div>

                  <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 800 }}>
                    Séances liées: {courseModal.sessionsCount || '—'}
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid rgba(13,31,53,0.08)',
                      paddingTop: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 12,
                    }}
                  >
                    <button
                      onClick={() =>
                        setCourseModal({
                          type: 'delete',
                          courseId: courseModal.courseId,
                          className: courseModal.className,
                          subjectName: courseModal.subjectName,
                          sessionsCount: courseModal.sessionsCount,
                        })
                      }
                      style={{
                        background: 'white',
                        border: '1px solid rgba(192,57,43,0.35)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: 'pointer',
                        color: '#c0392b',
                        whiteSpace: 'nowrap',
                      }}
                      title="Supprimer le cours"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#0d1f35', fontWeight: 800 }}>Cette action est irréversible.</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 800 }}>
                    Séances liées: {courseModal.sessionsCount || '—'}
                  </div>
                  {courseModal.sessionsCount > 0 ? (
                    <div style={{ fontSize: 12, color: '#c0392b', fontWeight: 900 }}>
                      Suppression impossible: le cours est utilisé par des séances.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '12px 18px 16px',
                borderTop: '1px solid rgba(13,31,53,0.08)',
              }}
            >
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(13,31,53,0.16)',
                  color: 'rgba(13,31,53,0.75)',
                  borderRadius: 10,
                  padding: '9px 14px',
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
                onClick={() => setCourseModal(null)}
              >
                Annuler
              </button>

              {courseModal.type === 'create' ? (
                <button
                  style={S.addBtn}
                  onClick={() => {
                    const hours = Number(courseHours)
                    if (!courseSubjectId || !courseProfessorId || !Number.isFinite(hours)) return
                    void onCreateCourse(courseModal.classId, courseSubjectId, courseProfessorId, hours)
                    setCourseModal(null)
                  }}
                >
                  Ajouter
                </button>
              ) : courseModal.type === 'edit' ? (
                <button
                  style={S.addBtn}
                  onClick={() => {
                    const hours = Number(courseHours)
                    if (!courseProfessorId || !Number.isFinite(hours)) return
                    void onUpdateCourse(courseModal.courseId, courseProfessorId, hours)
                    setCourseModal(null)
                  }}
                >
                  Enregistrer
                </button>
              ) : (
                <button
                  style={{
                    background: '#c0392b',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '9px 14px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: courseModal.sessionsCount > 0 ? 'not-allowed' : 'pointer',
                    opacity: courseModal.sessionsCount > 0 ? 0.5 : 1,
                  }}
                  disabled={courseModal.sessionsCount > 0}
                  onClick={() => {
                    void onDeleteCourse(courseModal.courseId)
                    setCourseModal(null)
                  }}
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      </div>

      {modal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,31,53,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 60,
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              width: 'min(520px, 92vw)',
              background: 'white',
              borderRadius: 16,
              border: '1px solid rgba(13,31,53,0.12)',
              boxShadow: '0 18px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(13,31,53,0.08)' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0d1f35' }}>
                {modal.type === 'edit'
                  ? 'Modifier la matière'
                  : modal.type === 'delete'
                    ? 'Supprimer la matière'
                    : modal.title}
              </div>
              {modal.type !== 'info' ? (
                <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 800 }}>
                  {modal.type === 'edit' ? modal.initialName : modal.name}
                </div>
              ) : null}
            </div>

            <div style={{ padding: 18 }}>
              {modal.type === 'edit' ? (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(13,31,53,0.55)' }}>Nom</div>
                    <input
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      style={{ ...S.searchInput, width: '100%', padding: '10px 12px' }}
                      autoFocus
                    />
                  </div>

                  <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 800 }}>
                    Classes liées: {modal.usedByCourses || '—'}
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid rgba(13,31,53,0.08)',
                      paddingTop: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 12,
                    }}
                  >
                    <button
                      onClick={() =>
                        setModal({
                          type: 'delete',
                          subjectId: modal.subjectId,
                          name: modal.initialName,
                          usedByCourses: modal.usedByCourses,
                        })
                      }
                      style={{
                        background: 'white',
                        border: '1px solid rgba(192,57,43,0.35)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: 'pointer',
                        color: '#c0392b',
                        whiteSpace: 'nowrap',
                      }}
                      title="Supprimer la matière"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : modal.type === 'delete' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#0d1f35', fontWeight: 800 }}>Cette action est irréversible.</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 800 }}>
                    Classes liées: {modal.usedByCourses || '—'}
                  </div>
                  {modal.usedByCourses > 0 ? (
                    <div style={{ fontSize: 12, color: '#c0392b', fontWeight: 900 }}>
                      Suppression impossible: la matière est utilisée par des classes.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'rgba(13,31,53,0.75)', fontWeight: 700, lineHeight: 1.4 }}>
                  {modal.message}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '12px 18px 16px',
                borderTop: '1px solid rgba(13,31,53,0.08)',
              }}
            >
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(13,31,53,0.16)',
                  color: 'rgba(13,31,53,0.75)',
                  borderRadius: 10,
                  padding: '9px 14px',
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
                onClick={() => setModal(null)}
              >
                Annuler
              </button>

              {modal.type === 'edit' ? (
                <button
                  style={S.addBtn}
                  onClick={() => {
                    const nextName = editNameValue.trim()
                    if (nextName && nextName !== modal.initialName) {
                      void onRenameSubject(modal.subjectId, nextName)
                    }
                    setModal(null)
                  }}
                >
                  Enregistrer
                </button>
              ) : modal.type === 'delete' ? (
                <button
                  style={{
                    background: '#c0392b',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '9px 14px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: modal.usedByCourses > 0 ? 'not-allowed' : 'pointer',
                    opacity: modal.usedByCourses > 0 ? 0.5 : 1,
                  }}
                  disabled={modal.usedByCourses > 0}
                  onClick={() => {
                    void onDeleteSubject(modal.subjectId)
                    setModal(null)
                  }}
                >
                  Supprimer
                </button>
              ) : (
                <button style={S.addBtn} onClick={() => setModal(null)}>
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
