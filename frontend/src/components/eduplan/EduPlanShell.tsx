import type { ReactNode } from 'react'
import { NAV_ITEMS } from './data'
import { S, css } from './styles'
import type { DbClass, DbMe } from './types'

export type EduPlanNavKey = 'planning' | 'algo' | 'classes' | 'teachers' | 'rooms' | 'subjects' | 'settings'

export function EduPlanShell({
  activeNav,
  setActiveNav,
  sidebarOpen,
  setSidebarOpen,
  me,
  onLogout,
  pageTitle,
  pageIcon,
  quickClass,
  setQuickClass,
  classes,
  topError,
  children,
}: {
  activeNav: EduPlanNavKey
  setActiveNav: (key: EduPlanNavKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  me?: DbMe | null
  onLogout?: () => void | Promise<void>
  pageTitle: string
  pageIcon: string
  quickClass: string
  setQuickClass: (value: string) => void
  classes: DbClass[]
  topError?: string
  children: ReactNode
}) {
  const schoolName = me?.school?.name || '—'
  const login = me?.login || '—'
  const avatar = (() => {
    const s = (me?.login || '').trim()
    if (!s) return '—'
    const parts = s.split(/[^a-zA-Z0-9]+/).filter(Boolean)
    const a = (parts[0]?.[0] ?? s[0] ?? '').toUpperCase()
    const b = (parts[1]?.[0] ?? s[1] ?? '').toUpperCase()
    const out = `${a}${b}`.trim()
    return out || '—'
  })()

  return (
    <div style={S.root}>
      <style>{css}</style>

      <aside style={{ ...S.sidebar, width: sidebarOpen ? 260 : 72 }}>
        <div style={S.sidebarHeader}>
          <div style={S.logoMark}>
            <span style={S.logoIcon}>✦</span>
            {sidebarOpen ? <span style={S.logoText}>EduPlan</span> : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {me && onLogout ? (
              <button
                onClick={() => void onLogout()}
                title="Déconnexion"
                style={{
                  background: 'rgba(244,240,232,0.06)',
                  border: '1px solid rgba(244,240,232,0.14)',
                  color: 'rgba(244,240,232,0.85)',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ⎋
              </button>
            ) : null}
            <button style={S.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? '‹' : '›'}
            </button>
          </div>
        </div>

        {sidebarOpen ? (
          <div style={S.schoolLabel}>
            <div style={S.schoolDot} />
            <div>
              <div style={S.schoolName}>{schoolName}</div>
              <div style={S.schoolSub}>{me ? 'Connecté' : 'Non connecté'}</div>
            </div>
          </div>
        ) : null}

        <div style={S.navSection}>
          {sidebarOpen ? <div style={S.navLabel}>NAVIGATION</div> : null}
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveNav(item.key as EduPlanNavKey)}
              style={{
                ...S.navItem,
                ...(activeNav === item.key ? S.navItemActive : {}),
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
              }}
              title={!sidebarOpen ? item.label : ''}
            >
              <span style={S.navIcon}>{item.icon}</span>
              {sidebarOpen ? <span style={S.navItemLabel}>{item.label}</span> : null}
              {sidebarOpen && activeNav === item.key ? <span style={S.navPip} /> : null}
            </button>
          ))}
        </div>

        {sidebarOpen ? (
          <>
            <div style={S.divider} />
            <div style={S.navSection}>
              <div style={S.navLabel}>CLASSES RAPIDES</div>
              {classes.slice(0, 5).map((cls) => {
                const name = cls.name
                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setQuickClass(cls.id)
                      setActiveNav('planning')
                    }}
                    style={{ ...S.classChip, ...(quickClass === cls.id ? S.classChipActive : {}) }}
                  >
                    <span style={S.classChipDot} />
                    {name}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        <div style={S.sidebarFooter}>
          <div style={S.userAvatar}>{avatar}</div>
          {sidebarOpen ? (
            <div>
              <div style={S.userName}>{login}</div>
              <div style={S.userRole}>Administrateur</div>
            </div>
          ) : null}
          {me && onLogout ? (
            <button
              onClick={() => void onLogout()}
              title="Déconnexion"
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: '1px solid rgba(244,240,232,0.18)',
                color: 'rgba(244,240,232,0.85)',
                borderRadius: 10,
                padding: sidebarOpen ? '8px 10px' : '8px 9px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {sidebarOpen ? 'Déconnexion' : '⎋'}
            </button>
          ) : null}
        </div>
      </aside>

      <main style={S.main}>
        <header style={S.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 20, color: '#c8922a', lineHeight: 1 }}>{pageIcon}</div>
            <div style={S.pageTitle}>{pageTitle}</div>
          </div>
        </header>
        {topError ? (
          <div style={{ padding: '10px 32px', color: '#c0392b', fontSize: 13, fontWeight: 700 }}>{topError}</div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
