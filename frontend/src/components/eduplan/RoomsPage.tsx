import type { DbRoom, DbScheduledSession } from './types'
import { S } from './styles'

export function RoomsPage({
  rooms,
  scheduledSessions,
}: {
  rooms: DbRoom[]
  scheduledSessions: DbScheduledSession[]
}) {
  const usageByRoom = new Map<string, number>()
  for (const ses of scheduledSessions) {
    usageByRoom.set(ses.room.id, (usageByRoom.get(ses.room.id) ?? 0) + 1)
  }

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
              gridTemplateColumns: '220px 1fr 140px 120px',
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
          </div>

          {rooms.length ? (
            rooms.map((r) => {
              const used = usageByRoom.get(r.id) ?? 0
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr 140px 120px',
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
