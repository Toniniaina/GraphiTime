import { useState } from 'react'
import { LEVELS } from './data'
import type { SchoolClass } from './types'
import { S } from './styles'
import { AddClassModal } from './AddClassModal'

const INITIAL_CLASSES: SchoolClass[] = [
  { id: 1, level: '6ème', section: 'A', capacity: 32, headTeacher: 'Mme. Rabe', room: 'Salle 01', students: 30, createdAt: '2025-09-01' },
  { id: 2, level: '6ème', section: 'B', capacity: 32, headTeacher: 'M. Andry', room: 'Salle 02', students: 28, createdAt: '2025-09-01' },
  { id: 3, level: '5ème', section: 'A', capacity: 30, headTeacher: 'M. Rakoto', room: 'Salle 03', students: 29, createdAt: '2025-09-01' },
  { id: 4, level: '5ème', section: 'B', capacity: 30, headTeacher: 'Mme. Soazig', room: 'Salle 04', students: 27, createdAt: '2025-09-01' },
  { id: 5, level: '4ème', section: 'A', capacity: 35, headTeacher: 'M. James', room: 'Salle 05', students: 33, createdAt: '2025-09-01' },
  { id: 6, level: '3ème', section: 'A', capacity: 35, headTeacher: 'Mme. Niry', room: 'Salle 06', students: 31, createdAt: '2025-09-01' },
]

export function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>(INITIAL_CLASSES)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('Tous')
  const [selected, setSelected] = useState<SchoolClass | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const filtered = classes.filter((c) => {
    const name = `${c.level} ${c.section}`.toLowerCase()
    const matchSearch =
      name.includes(search.toLowerCase()) || c.headTeacher.toLowerCase().includes(search.toLowerCase())
    const matchLevel = filterLevel === 'Tous' || c.level === filterLevel
    return matchSearch && matchLevel
  })

  const handleAdd = (cls: SchoolClass) => {
    setClasses((prev) => [...prev, cls])
  }

  const handleDelete = (id: number) => {
    setClasses((prev) => prev.filter((c) => c.id !== id))
    setDeleteId(null)
    if (selected?.id === id) setSelected(null)
  }

  const fillPct = (cls: SchoolClass) => Math.round((cls.students / cls.capacity) * 100)
  const fillColor = (pct: number) => (pct >= 90 ? '#c0392b' : pct >= 70 ? '#c8922a' : '#2d6a4f')
  const shortLevel = (cls: SchoolClass) => cls.level.replace('ème', '').replace('nde', '').replace('ère', '')

  return (
    <div style={S.pageWrap}>
      {showModal ? <AddClassModal onClose={() => setShowModal(false)} onAdd={handleAdd} /> : null}

      {deleteId ? (
        <div style={S.modalOverlay} onClick={() => setDeleteId(null)}>
          <div style={{ ...S.modal, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>Supprimer la classe ?</div>
              <button style={S.modalClose} onClick={() => setDeleteId(null)}>
                ✕
              </button>
            </div>
            <p
              style={{
                color: 'rgba(13,31,53,0.65)',
                fontSize: 14,
                padding: '8px 0 24px',
                lineHeight: 1.6,
              }}
            >
              Cette action est irréversible. Toutes les données associées seront supprimées définitivement.
            </p>
            <div style={S.modalActions}>
              <button style={S.cancelBtn} onClick={() => setDeleteId(null)}>
                Annuler
              </button>
              <button style={{ ...S.submitBtn, background: '#c0392b' }} onClick={() => handleDelete(deleteId)}>
                ⊗ Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>Gestion des Classes</div>
          <div style={S.breadcrumb}>
            <span>Accueil</span>
            <span style={S.breadSep}>›</span>
            <span style={{ color: '#c8922a' }}>Classes</span>
          </div>
        </div>
        <button style={S.addBtn} onClick={() => setShowModal(true)}>
          ＋ Nouvelle classe
        </button>
      </header>

      <div style={S.statsRow}>
        {[
          {
            label: 'Total classes',
            value: classes.length,
            sub: `${LEVELS.filter((l) => classes.some((c) => c.level === l)).length} niveaux`,
            icon: '⊞',
          },
          { label: 'Total élèves', value: classes.reduce((a, c) => a + c.students, 0), sub: 'inscrits', icon: '⊛' },
          { label: 'Capacité totale', value: classes.reduce((a, c) => a + c.capacity, 0), sub: 'places', icon: '◈' },
          {
            label: 'Remplissage moyen',
            value: `${Math.round(
              (classes.reduce((a, c) => a + c.students / c.capacity, 0) / classes.length) * 100,
            )}%`,
            sub: 'toutes classes',
            icon: '◷',
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

      <div style={S.filterRow}>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>⊛</span>
          <input
            placeholder="Rechercher une classe ou un professeur..."
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
        <div style={S.filterTabs}>
          {['Tous', ...LEVELS].map((lv) => (
            <button
              key={lv}
              onClick={() => setFilterLevel(lv)}
              style={{ ...S.filterTab, ...(filterLevel === lv ? S.filterTabActive : {}) }}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      <div style={S.splitLayout}>
        <div style={S.classList}>
          {filtered.length === 0 ? (
            <div style={S.emptyState}>
              <div style={S.emptyIcon}>⊞</div>
              <div style={S.emptyTitle}>Aucune classe trouvée</div>
              <div style={S.emptyText}>Modifiez votre recherche ou créez une nouvelle classe.</div>
              <button style={S.addBtn} onClick={() => setShowModal(true)}>
                ＋ Nouvelle classe
              </button>
            </div>
          ) : (
            filtered.map((cls) => {
              const pct = fillPct(cls)
              const isActive = selected?.id === cls.id
              return (
                <div
                  key={cls.id}
                  className="class-row"
                  style={{ ...S.classRow, ...(isActive ? S.classRowActive : {}) }}
                  onClick={() => setSelected(cls)}
                >
                  <div style={{ ...S.classAvatar, background: isActive ? '#c8922a' : '#0d1f35' }}>
                    {shortLevel(cls)}{cls.section}
                  </div>
                  <div style={S.classRowInfo}>
                    <div style={S.classRowName}>
                      {cls.level} {cls.section}
                    </div>
                    <div style={S.classRowMeta}>
                      {cls.headTeacher} · {cls.room}
                    </div>
                    <div style={S.fillBar}>
                      <div style={{ ...S.fillBarFill, width: `${pct}%`, background: fillColor(pct) }} />
                    </div>
                  </div>
                  <div style={S.classRowRight}>
                    <div style={{ ...S.fillLabel, color: fillColor(pct) }}>{pct}%</div>
                    <div style={S.studentCount}>
                      {cls.students}/{cls.capacity}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div style={S.detailPanel}>
          {!selected ? (
            <div style={S.detailEmpty}>
              <div style={S.detailEmptyIcon}>◉</div>
              <div style={S.detailEmptyText}>Sélectionnez une classe pour voir ses détails</div>
            </div>
          ) : (
            (() => {
              const pct = fillPct(selected)
              return (
                <div style={S.detailContent}>
                  <div style={S.detailHeaderRow}>
                    <div style={S.detailBigAvatar}>
                      {shortLevel(selected)}{selected.section}
                    </div>
                    <div>
                      <div style={S.detailTitle}>
                        {selected.level} {selected.section}
                      </div>
                      <div style={S.detailSub}>Créée le {selected.createdAt}</div>
                    </div>
                  </div>

                  <div style={S.detailGrid}>
                    {[
                      { label: 'Professeur principal', value: selected.headTeacher, icon: '⊛' },
                      { label: 'Salle principale', value: selected.room, icon: '◈' },
                      { label: 'Effectif actuel', value: `${selected.students} élèves`, icon: '⊞' },
                      { label: 'Capacité max.', value: `${selected.capacity} places`, icon: '◷' },
                    ].map((item, i) => (
                      <div key={i} style={S.detailItem}>
                        <div style={S.detailItemIcon}>{item.icon}</div>
                        <div>
                          <div style={S.detailItemLabel}>{item.label}</div>
                          <div style={S.detailItemValue}>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={S.meterSection}>
                    <div style={S.meterLabel}>
                      <span>Taux de remplissage</span>
                      <span style={{ color: fillColor(pct), fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={S.meterTrack}>
                      <div style={{ ...S.meterFill, width: `${pct}%`, background: fillColor(pct) }} />
                    </div>
                    <div style={S.meterNote}>
                      {pct >= 90 ? '⚠ Classe quasi complète' : pct >= 70 ? '◐ Classe bien remplie' : '✓ Places disponibles'}
                    </div>
                  </div>

                  <div style={S.detailActions}>
                    <button style={S.editBtn} onClick={() => setShowModal(true)}>
                      ✎ Modifier
                    </button>
                    <button style={S.deleteBtn} onClick={() => setDeleteId(selected.id)}>
                      ⊗ Supprimer
                    </button>
                  </div>
                </div>
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}
