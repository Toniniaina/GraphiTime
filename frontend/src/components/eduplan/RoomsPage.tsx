import type { DbRoom, DbScheduledSession } from './types'
import { useState } from 'react'
import { S } from './styles'

export function RoomsPage({
  rooms,
  scheduledSessions,
  newRoomName,
  setNewRoomName,
  newRoomCapacity,
  setNewRoomCapacity,
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  roomError,
}: {
  rooms: DbRoom[]
  scheduledSessions: DbScheduledSession[]
  newRoomName: string
  setNewRoomName: (v: string) => void
  newRoomCapacity: string
  setNewRoomCapacity: (v: string) => void
  onCreateRoom: () => void | Promise<void>
  onUpdateRoom: (id: string, name: string, capacity: number) => void | Promise<void>
  onDeleteRoom: (id: string) => void | Promise<void>
  roomError: string
}) {
  const usageByRoom = new Map<string, number>()
  for (const ses of scheduledSessions) {
    usageByRoom.set(ses.room.id, (usageByRoom.get(ses.room.id) ?? 0) + 1)
  }

  const [modal, setModal] = useState<
    | { type: 'edit'; roomId: string; initialName: string; initialCapacity: number; usedCount: number }
    | { type: 'delete'; roomId: string; name: string; usedCount: number }
    | null
  >(null)

  const [editNameValue, setEditNameValue] = useState('')
  const [editCapacityValue, setEditCapacityValue] = useState('0')

  return (
    <div style={S.pageWrap}>
      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>Gestion des Salles</div>
          <div style={S.breadcrumb}>
            <span>Accueil</span>
            <span style={S.breadSep}>›</span>
            <span style={{ color: '#c8922a' }}>Salles</span>
          </div>
        </div>
      </header>

      <div style={S.filterRow}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Nom de la salle (ex: Salle A)"
            style={{ ...S.searchInput, width: 300, paddingLeft: 14 }}
          />
          <input
            value={newRoomCapacity}
            onChange={(e) => setNewRoomCapacity(e.target.value)}
            placeholder="Capacité"
            style={{ ...S.searchInput, width: 140, paddingLeft: 14 }}
          />
          <button style={S.addBtn} onClick={onCreateRoom}>
            ✓ Enregistrer
          </button>
        </div>
      </div>

      {roomError ? (
        <div style={{ margin: '0 32px 12px', color: '#c0392b', fontSize: 13, fontWeight: 600 }}>{roomError}</div>
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
                {modal.type === 'edit' ? 'Modifier la salle' : 'Supprimer la salle'}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 700 }}>
                {modal.type === 'edit' ? modal.initialName : modal.name}
              </div>
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
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(13,31,53,0.55)' }}>Capacité</div>
                    <input
                      value={editCapacityValue}
                      onChange={(e) => setEditCapacityValue(e.target.value)}
                      style={{ ...S.searchInput, width: '100%', padding: '10px 12px' }}
                    />
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid rgba(13,31,53,0.08)',
                      paddingTop: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 800 }}>
                      Séances liées: {modal.usedCount || '—'}
                    </div>
                    <button
                      onClick={() =>
                        setModal({ type: 'delete', roomId: modal.roomId, name: modal.initialName, usedCount: modal.usedCount })
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
                      title="Supprimer la salle"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#0d1f35', fontWeight: 700 }}>Cette action est irréversible.</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.55)', fontWeight: 700 }}>
                    Séances liées: {modal.usedCount || '—'}
                  </div>
                  {modal.usedCount > 0 ? (
                    <div style={{ fontSize: 12, color: '#c0392b', fontWeight: 800 }}>
                      Suppression impossible: la salle est utilisée par des séances.
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
                onClick={() => setModal(null)}
              >
                Annuler
              </button>

              {modal.type === 'edit' ? (
                <button
                  style={S.addBtn}
                  onClick={() => {
                    const nextName = editNameValue.trim()
                    const cap = Number(editCapacityValue || '0')
                    if (!Number.isFinite(cap) || cap < 0) return
                    if (nextName) {
                      void onUpdateRoom(modal.roomId, nextName, cap)
                    }
                    setModal(null)
                  }}
                >
                  ✓ Enregistrer
                </button>
              ) : (
                <button
                  style={{
                    background: modal.usedCount > 0 ? 'rgba(192,57,43,0.2)' : '#c0392b',
                    border: 'none',
                    color: 'white',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: modal.usedCount > 0 ? 'not-allowed' : 'pointer',
                  }}
                  disabled={modal.usedCount > 0}
                  onClick={() => {
                    if (modal.usedCount > 0) return
                    void onDeleteRoom(modal.roomId)
                    setModal(null)
                  }}
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div style={S.statsRow}>
        {[
          { label: 'Total salles', value: rooms.length, sub: 'enregistrées', icon: '◈' },
          {
            label: 'Capacité totale',
            value: rooms.reduce((a, r) => a + (r.capacity ?? 0), 0),
            sub: 'places',
            icon: '⊞',
          },
          {
            label: 'Séances planifiées',
            value: scheduledSessions.length,
            sub: 'au total',
            icon: '◷',
          },
          {
            label: 'Salles utilisées',
            value: rooms.filter((r) => (usageByRoom.get(r.id) ?? 0) > 0).length,
            sub: 'au moins 1 séance',
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
              gridTemplateColumns: '220px 1fr 140px 120px 120px',
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
            <div>Capacité</div>
            <div>Usage</div>
            <div></div>
          </div>

          {rooms.length ? (
            rooms.map((r) => {
              const used = usageByRoom.get(r.id) ?? 0
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr 140px 120px 120px',
                    gap: 12,
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(13,31,53,0.06)',
                    fontSize: 13,
                    color: '#0d1f35',
                  }}
                >
                  <div style={{ fontFamily: 'monospace', color: 'rgba(13,31,53,0.7)' }}>{r.id}</div>
                  <div style={{ fontWeight: 800 }}>{r.name}</div>
                  <div>{r.capacity}</div>
                  <div style={{ color: used ? '#2d6a4f' : 'rgba(13,31,53,0.45)', fontWeight: 800 }}>
                    {used ? `${used} séance(s)` : '—'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setEditNameValue(r.name)
                        setEditCapacityValue(String(r.capacity ?? 0))
                        setModal({ type: 'edit', roomId: r.id, initialName: r.name, initialCapacity: r.capacity, usedCount: used })
                      }}
                      style={{
                        background: 'white',
                        border: '1px solid rgba(13,31,53,0.16)',
                        borderRadius: 10,
                        padding: '7px 10px',
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: 'pointer',
                        color: '#0d1f35',
                      }}
                    >
                      Modifier
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: 24, color: 'rgba(13,31,53,0.45)', fontSize: 13 }}>Aucune salle.</div>
          )}
        </div>
      </div>
    </div>
  )
}
