import { useState } from 'react'
import { DAYS, HOURS, INITIAL_CLASSES, INITIAL_SCHEDULE, SUBJECT_COLORS, WEEKS } from './data'
import { S } from './styles'

export function PlanningPage({ professorsCount }: { professorsCount: number }) {
  const [selectedClass, setSelectedClass] = useState('6ème A')
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null)

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
            {INITIAL_CLASSES.map((c) => (
              <option key={c.id}>
                {c.level} {c.section}
              </option>
            ))}
          </select>
          <button style={S.addBtn}>＋ Ajouter</button>
        </div>
      </header>

      <div style={S.statsRow}>
        {[
          { label: 'Heures / semaine', value: '28h', sub: '+2h vs. moyenne', icon: '◷' },
          { label: 'Matières', value: '9', sub: 'dont 2 labs', icon: '◈' },
          { label: 'Professeurs', value: String(professorsCount), sub: 'Tous disponibles', icon: '⊛' },
          { label: 'Salles utilisées', value: '7', sub: 'sur 14 au total', icon: '⊞' },
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
            <div key={day} style={{ ...S.dayHeader, ...(i === 0 ? S.dayHeaderToday : {}) }}>
              <div style={S.dayName}>{day}</div>
              {i === 0 ? <div style={S.todayBadge}>Aujourd'hui</div> : null}
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
              {INITIAL_SCHEDULE.filter((c) => c.day === dayIdx).map((cls) => (
                <div
                  key={cls.id}
                  className="class-block"
                  style={{
                    ...S.classBlock,
                    top: cls.start * 64 + 4,
                    height: cls.duration * 64 - 8,
                    backgroundColor: SUBJECT_COLORS[cls.subject] || '#1a3a5c',
                    opacity: hoveredBlock && hoveredBlock !== cls.id ? 0.55 : 1,
                  }}
                  onMouseEnter={() => setHoveredBlock(cls.id)}
                  onMouseLeave={() => setHoveredBlock(null)}
                >
                  <div style={S.classSubject}>{cls.subject}</div>
                  {cls.duration >= 2 ? (
                    <>
                      <div style={S.classTeacher}>{cls.teacher}</div>
                      <div style={S.classRoom}>{cls.room}</div>
                    </>
                  ) : null}
                  <div style={S.classDuration}>{cls.duration}h</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={S.legend}>
        {Object.entries(SUBJECT_COLORS).map(([subj, color]) => (
          <div key={subj} style={S.legendItem}>
            <div style={{ ...S.legendDot, background: color }} />
            <span style={S.legendText}>{subj}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
