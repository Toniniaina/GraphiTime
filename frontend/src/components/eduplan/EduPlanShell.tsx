import type { ReactNode } from 'react'
import { INITIAL_CLASSES, NAV_ITEMS } from './data'
import { S, css } from './styles'

export type EduPlanNavKey = 'planning' | 'classes' | 'teachers' | 'rooms' | 'subjects' | 'settings'

export function EduPlanShell({
  activeNav,
  setActiveNav,
  sidebarOpen,
  setSidebarOpen,
  quickClass,
  setQuickClass,
  topError,
  children,
}: {
  activeNav: EduPlanNavKey
  setActiveNav: (key: EduPlanNavKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  quickClass: string
  setQuickClass: (value: string) => void
  topError?: string
  children: ReactNode
}) {
  return (
    <div style={S.root}>
      <style>{css}</style>

      <aside style={{ ...S.sidebar, width: sidebarOpen ? 260 : 72 }}>
        <div style={S.sidebarHeader}>
          <div style={S.logoMark}>
            <span style={S.logoIcon}>✦</span>
            {sidebarOpen ? <span style={S.logoText}>EduPlan</span> : null}
          </div>
          <button style={S.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {sidebarOpen ? (
          <div style={S.schoolLabel}>
            <div style={S.schoolDot} />
            <div>
              <div style={S.schoolName}>Lycée Rajoelina</div>
              <div style={S.schoolSub}>Antananarivo — 2025/2026</div>
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
              {INITIAL_CLASSES.slice(0, 5).map((cls) => {
                const name = `${cls.level} ${cls.section}`
                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setQuickClass(name)
                      setActiveNav('planning')
                    }}
                    style={{ ...S.classChip, ...(quickClass === name ? S.classChipActive : {}) }}
                  >
                    <span style={S.classChipDot} />
                    {name}
                  </button>
                )
              })}
            </div>
            <div style={S.sidebarFooter}>
              <div style={S.userAvatar}>JR</div>
              <div>
                <div style={S.userName}>Jean Rakoto</div>
                <div style={S.userRole}>Administrateur</div>
              </div>
            </div>
          </>
        ) : null}
      </aside>

      <main style={S.main}>
        {topError ? (
          <div style={{ padding: '10px 32px', color: '#c0392b', fontSize: 13, fontWeight: 700 }}>{topError}</div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
