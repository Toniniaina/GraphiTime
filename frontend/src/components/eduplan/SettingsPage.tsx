import type { DbProfessorUnavailability } from './types'
import { S } from './styles'

const DOW: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

export function SettingsPage({ unavailability }: { unavailability: DbProfessorUnavailability[] }) {
  return (
    <div style={S.pageWrap}>
      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>Paramètres</div>
          <div style={S.breadcrumb}>
            <span>Accueil</span>
            <span style={S.breadSep}>›</span>
            <span style={{ color: '#c8922a' }}>Paramètres</span>
          </div>
        </div>
      </header>

      <div style={S.statsRow}>
        {[
          { label: 'Indisponibilités', value: unavailability.length, sub: 'professeurs', icon: '⊕' },
          {
            label: 'Professeurs concernés',
            value: new Set(unavailability.map((u) => u.professor.id)).size,
            sub: 'au moins 1 plage',
            icon: '⊛',
          },
          { label: 'Règles', value: 'EXCLUDE', sub: 'anti-conflit', icon: '◈' },
          { label: 'Base', value: 'PostgreSQL', sub: 'graphitime', icon: '◉' },
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
              gridTemplateColumns: '220px 1fr 140px 140px',
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
            <div>Professeur</div>
            <div>Jour</div>
            <div>Plage</div>
          </div>

          {unavailability.length ? (
            unavailability.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 1fr 140px 140px',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(13,31,53,0.06)',
                  fontSize: 13,
                  color: '#0d1f35',
                }}
              >
                <div style={{ fontFamily: 'monospace', color: 'rgba(13,31,53,0.7)' }}>{u.id}</div>
                <div style={{ fontWeight: 800 }}>{u.professor.name}</div>
                <div>{DOW[u.dayOfWeek] ?? String(u.dayOfWeek)}</div>
                <div style={{ fontFamily: 'monospace' }}>
                  {u.startTime}–{u.endTime}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: 24, color: 'rgba(13,31,53,0.45)', fontSize: 13 }}>
              Aucune indisponibilité.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
