import { S } from './styles'

export function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={S.pageWrap}>
      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>{title}</div>
          <div style={S.breadcrumb}>
            <span>Accueil</span>
            <span style={S.breadSep}>›</span>
            <span style={{ color: '#c8922a' }}>{title}</span>
          </div>
        </div>
      </header>
      <div style={S.placeholderBody}>
        <div style={S.placeholderIcon}>{icon}</div>
        <div style={S.placeholderTitle}>Page en construction</div>
        <div style={S.placeholderText}>Cette section sera disponible prochainement.</div>
      </div>
    </div>
  )
}
