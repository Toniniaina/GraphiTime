import { useMemo, useState } from 'react'
import type { Professor } from './types'
import { S } from './styles'

export function TeachersPage({
  professors,
  newProfessorName,
  setNewProfessorName,
  onCreateProfessor,
  profError,
  ping,
  dbOk,
}: {
  professors: Professor[]
  newProfessorName: string
  setNewProfessorName: (v: string) => void
  onCreateProfessor: () => void
  profError: string
  ping: string
  dbOk: boolean | null
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return professors
    return professors.filter((p) => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s))
  }, [professors, search])

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
        <button style={S.addBtn} onClick={onCreateProfessor}>
          ＋ Ajouter
        </button>
      </header>

      <div style={S.statsRow}>
        {[
          { label: 'Total professeurs', value: professors.length, sub: 'enregistrés', icon: '⊛' },
          { label: 'Backend', value: ping ? 'OK' : '...', sub: ping ? 'GraphQL actif' : 'en cours', icon: '◉' },
          { label: 'DB', value: dbOk === null ? '...' : dbOk ? 'OK' : 'KO', sub: 'PostgreSQL', icon: '◈' },
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
    </div>
  )
}
