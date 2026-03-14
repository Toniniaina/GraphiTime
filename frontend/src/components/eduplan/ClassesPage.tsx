import type { DbClass, DbCourse, DbScheduledSession } from './types'
import { S } from './styles'
export function ClassesPage({
  classes,
  courses,
  scheduledSessions,
}: {
  classes: DbClass[]
  courses: DbCourse[]
  scheduledSessions: DbScheduledSession[]
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
            <div>Nom</div>
            <div>Cours</div>
            <div>Séances</div>
          </div>

          {classes.length ? (
            classes.map((c) => {
              const cCount = coursesByClass.get(c.id) ?? 0
              const sCount = sessionsByClass.get(c.id) ?? 0
              return (
                <div
                  key={c.id}
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
                  <div style={{ fontFamily: 'monospace', color: 'rgba(13,31,53,0.7)' }}>{c.id}</div>
                  <div style={{ fontWeight: 800 }}>{c.name}</div>
                  <div>{cCount || '—'}</div>
                  <div style={{ color: sCount ? '#2d6a4f' : 'rgba(13,31,53,0.45)', fontWeight: 800 }}>
                    {sCount ? sCount : '—'}
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
