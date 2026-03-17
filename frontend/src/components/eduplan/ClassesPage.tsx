import type { DbClass, DbCourse, DbRoom, DbScheduledSession } from './types'
import { useMemo, useState } from 'react'
import { S } from './styles'
export function ClassesPage({
  classes,
  rooms,
  courses,
  scheduledSessions,
  newClassName,
  setNewClassName,
  onCreateClass,
  onRenameClass,
  onDeleteClass,
  onSetHomeRoom,
  classError,
}: {
  classes: DbClass[]
  rooms: DbRoom[]
  courses: DbCourse[]
  scheduledSessions: DbScheduledSession[]
  newClassName: string
  setNewClassName: (v: string) => void
  onCreateClass: () => void
  onRenameClass: (id: string, name: string) => void | Promise<void>
  onDeleteClass: (id: string) => void | Promise<void>
  onSetHomeRoom: (classId: string, roomId: string | null) => void | Promise<void>
  classError: string
}) {
  const sessionsByClass = new Map<string, number>()
  for (const ses of scheduledSessions) {
    const id = ses.course.schoolClass.id
    sessionsByClass.set(id, (sessionsByClass.get(id) ?? 0) + 1)
  }

  const coursesByClass = new Map<string, number>()
  for (const c of courses) {
    const id = c.schoolClass.id
    coursesByClass.set(id, (coursesByClass.get(id) ?? 0) + 1)
  }

  const roomsById = useMemo(() => {
    const m = new Map<string, DbRoom>()
    for (const r of rooms) m.set(r.id, r)
    return m
  }, [rooms])

  const [modal, setModal] = useState<
    | {
        type: 'edit'
        classId: string
        initialName: string
        currentRoomId: string | null
        cCount: number
        sCount: number
      }
    | { type: 'delete'; classId: string; name: string; cCount: number; sCount: number }
    | { type: 'info'; title: string; message: string }
    | null
  >(null)

  const [editNameValue, setEditNameValue] = useState('')
  const [editHomeRoomValue, setEditHomeRoomValue] = useState<string>('')

  return (
    <div style={S.pageWrap}>
      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>Gestion des Classes</div>
          <div style={S.breadcrumb}>
            <span>Accueil</span>
            <span style={S.breadSep}>›</span>
            <span style={{ color: '#c8922a' }}>Classes</span>
          </div>
        </div>
      </header>

      <div style={S.filterRow}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Nom de la classe (ex: 6ème C)"
            style={{ ...S.searchInput, width: 320, paddingLeft: 14 }}
          />
          <button style={S.addBtn} onClick={onCreateClass}>
            ✓ Enregistrer
          </button>
          <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 700 }}>
            Astuce: définis une salle principale (home room) pour améliorer la génération.
          </div>
        </div>
      </div>

      {classError ? (
        <div style={{ margin: '0 32px 12px', color: '#c0392b', fontSize: 13, fontWeight: 600 }}>{classError}</div>
      ) : null}

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
            zIndex: 50,
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
                  ? 'Modifier la classe'
                  : modal.type === 'delete'
                    ? 'Supprimer la classe'
                    : modal.title}
              </div>
              {modal.type !== 'info' ? (
                <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 700 }}>
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

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(13,31,53,0.55)' }}>Salle principale</div>
                    <select
                      value={editHomeRoomValue}
                      onChange={(e) => setEditHomeRoomValue(e.target.value)}
                      style={{ ...S.classSelect, width: '100%' }}
                    >
                      <option value="">—</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 700 }}>
                      Laisser vide pour ne pas définir de salle principale.
                    </div>
                  </div>

                  <div style={{
                    borderTop: '1px solid rgba(13,31,53,0.08)',
                    paddingTop: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}>
                    <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 800 }}>
                      Cours liés: {modal.cCount || '—'} · Séances liées: {modal.sCount || '—'}
                    </div>
                    <button
                      onClick={() => setModal({ type: 'delete', classId: modal.classId, name: modal.initialName, cCount: modal.cCount, sCount: modal.sCount })}
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
                      title="Supprimer la classe"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : modal.type === 'delete' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#0d1f35', fontWeight: 700 }}>
                    Cette action est irréversible.
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 700 }}>
                    Cours liés: {modal.cCount || '—'} · Séances liées: {modal.sCount || '—'}
                  </div>
                  {modal.cCount > 0 || modal.sCount > 0 ? (
                    <div style={{ fontSize: 12, color: '#c0392b', fontWeight: 800 }}>
                      Suppression impossible: la classe est utilisée par des cours/séances.
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
                      void onRenameClass(modal.classId, nextName)
                    }
                    const nextRoomId = editHomeRoomValue ? editHomeRoomValue : null
                    if ((modal.currentRoomId ?? '') !== (nextRoomId ?? '')) {
                      void onSetHomeRoom(modal.classId, nextRoomId)
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
                    cursor: modal.cCount > 0 || modal.sCount > 0 ? 'not-allowed' : 'pointer',
                    opacity: modal.cCount > 0 || modal.sCount > 0 ? 0.5 : 1,
                  }}
                  disabled={modal.cCount > 0 || modal.sCount > 0}
                  onClick={() => {
                    void onDeleteClass(modal.classId)
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

      <div style={S.statsRow}>
        {[
          {
            label: 'Total classes',
            value: classes.length,
            sub: 'enregistrées',
            icon: '⊞',
          },
          { label: 'Cours', value: courses.length, sub: 'associations', icon: '◈' },
          { label: 'Séances', value: scheduledSessions.length, sub: 'planifiées', icon: '◷' },
          {
            label: 'Classes actives',
            value: classes.filter((c) => (sessionsByClass.get(c.id) ?? 0) > 0).length,
            sub: 'avec séances',
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
              gridTemplateColumns: '220px 1fr 180px 120px 120px 120px',
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
            <div>Salle principale</div>
            <div>Cours</div>
            <div>Séances</div>
            <div>Actions</div>
          </div>

          {classes.length ? (
            classes.map((c) => {
              const cCount = coursesByClass.get(c.id) ?? 0
              const sCount = sessionsByClass.get(c.id) ?? 0
              const home = c.homeRoomId ?? ''
              const homeName = home ? roomsById.get(home)?.name : null
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr 180px 120px 120px 120px',
                    gap: 12,
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(13,31,53,0.06)',
                    fontSize: 13,
                    color: '#0d1f35',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontFamily: 'monospace', color: 'rgba(13,31,53,0.7)' }}>{c.id}</div>
                  <div style={{ fontWeight: 800 }}>{c.name}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: homeName ? '#0d1f35' : 'rgba(13,31,53,0.45)' }}>
                      {homeName ?? '—'}
                    </div>
                  </div>
                  <div>{cCount || '—'}</div>
                  <div style={{ color: sCount ? '#2d6a4f' : 'rgba(13,31,53,0.45)', fontWeight: 800 }}>
                    {sCount ? sCount : '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setEditNameValue(c.name)
                        setEditHomeRoomValue(home)
                        setModal({
                          type: 'edit',
                          classId: c.id,
                          initialName: c.name,
                          currentRoomId: c.homeRoomId ?? null,
                          cCount,
                          sCount,
                        })
                      }}
                      style={{
                        background: 'white',
                        border: '1px solid rgba(13,31,53,0.12)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: '#0d1f35',
                      }}
                      title="Modifier"
                    >
                      Modifier
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: 24, color: 'rgba(13,31,53,0.45)', fontSize: 13 }}>Aucune classe.</div>
          )}
        </div>
      </div>
    </div>
  )
}
