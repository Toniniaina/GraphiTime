import { useState } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const HOURS = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
const WEEKS = ["Semaine 10 — Mars 2026", "Semaine 11 — Mars 2026", "Semaine 12 — Avril 2026"];
const LEVELS = ["6ème","5ème","4ème","3ème","2nde","1ère","Terminale"];
const SECTIONS = ["A","B","C","D"];

const SUBJECT_COLORS = {
  "Mathématiques":"#1a3a5c","Physique-Chimie":"#c8922a","Français":"#2d6a4f",
  "Histoire-Géo":"#7b3f6e","Anglais":"#c0392b","SVT":"#1a6b8a",
  "EPS":"#e67e22","Philosophie":"#5d4e75","Informatique":"#2c7873",
};

const INITIAL_SCHEDULE = [
  { id:1, subject:"Mathématiques", teacher:"M. Rakoto", room:"Salle 12", day:1, start:1, duration:2 },
  { id:2, subject:"Physique-Chimie", teacher:"Mme. Rabe", room:"Labo 2", day:1, start:3, duration:2 },
  { id:3, subject:"Français", teacher:"M. Andry", room:"Salle 05", day:2, start:0, duration:2 },
  { id:4, subject:"Histoire-Géo", teacher:"Mme. Soazig", room:"Salle 08", day:2, start:3, duration:1 },
  { id:5, subject:"Anglais", teacher:"M. James", room:"Salle 14", day:3, start:1, duration:2 },
  { id:6, subject:"SVT", teacher:"Mme. Vola", room:"Labo 1", day:4, start:2, duration:2 },
  { id:7, subject:"EPS", teacher:"M. Feno", room:"Gymnase", day:4, start:5, duration:2 },
  { id:8, subject:"Philosophie", teacher:"Mme. Niry", room:"Salle 03", day:5, start:0, duration:2 },
  { id:9, subject:"Informatique", teacher:"M. Haja", room:"Salle Info", day:3, start:4, duration:2 },
  { id:10, subject:"Mathématiques", teacher:"M. Rakoto", room:"Salle 12", day:5, start:3, duration:2 },
];

const INITIAL_CLASSES = [
  { id:1, level:"6ème", section:"A", capacity:32, headTeacher:"Mme. Rabe", room:"Salle 01", students:30, createdAt:"2025-09-01" },
  { id:2, level:"6ème", section:"B", capacity:32, headTeacher:"M. Andry", room:"Salle 02", students:28, createdAt:"2025-09-01" },
  { id:3, level:"5ème", section:"A", capacity:30, headTeacher:"M. Rakoto", room:"Salle 03", students:29, createdAt:"2025-09-01" },
  { id:4, level:"5ème", section:"B", capacity:30, headTeacher:"Mme. Soazig", room:"Salle 04", students:27, createdAt:"2025-09-01" },
  { id:5, level:"4ème", section:"A", capacity:35, headTeacher:"M. James", room:"Salle 05", students:33, createdAt:"2025-09-01" },
  { id:6, level:"3ème", section:"A", capacity:35, headTeacher:"Mme. Niry", room:"Salle 06", students:31, createdAt:"2025-09-01" },
];

const navItems = [
  { icon:"◉", label:"Planning", key:"planning" },
  { icon:"⊞", label:"Classes", key:"classes" },
  { icon:"⊛", label:"Professeurs", key:"teachers" },
  { icon:"◈", label:"Salles", key:"rooms" },
  { icon:"◎", label:"Matières", key:"subjects" },
  { icon:"⊕", label:"Paramètres", key:"settings" },
];

// ─── PLANNING PAGE ────────────────────────────────────────────────────────────

function PlanningPage() {
  const [selectedClass, setSelectedClass] = useState("6ème A");
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [hoveredBlock, setHoveredBlock] = useState(null);

  return (
    <div style={S.pageWrap}>
      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>Planning d'Emploi du Temps</div>
          <div style={S.breadcrumb}><span>Accueil</span><span style={S.breadSep}>›</span><span style={{color:"#c8922a"}}>Planning</span></div>
        </div>
        <div style={S.topBarRight}>
          <div style={S.weekNav}>
            <button style={S.weekBtn} onClick={() => setSelectedWeek(Math.max(0, selectedWeek-1))}>‹</button>
            <span style={S.weekLabel}>{WEEKS[selectedWeek]}</span>
            <button style={S.weekBtn} onClick={() => setSelectedWeek(Math.min(WEEKS.length-1, selectedWeek+1))}>›</button>
          </div>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={S.classSelect}>
            {INITIAL_CLASSES.map(c => <option key={c.id}>{c.level} {c.section}</option>)}
          </select>
          <button style={S.addBtn}>＋ Ajouter</button>
        </div>
      </header>

      <div style={S.statsRow}>
        {[
          { label:"Heures / semaine", value:"28h", sub:"+2h vs. moyenne", icon:"◷" },
          { label:"Matières", value:"9", sub:"dont 2 labs", icon:"◈" },
          { label:"Professeurs", value:"9", sub:"Tous disponibles", icon:"⊛" },
          { label:"Salles utilisées", value:"7", sub:"sur 14 au total", icon:"⊞" },
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
            <div key={day} style={{...S.dayHeader, ...(i===0?S.dayHeaderToday:{})}}>
              <div style={S.dayName}>{day}</div>
              {i===0 && <div style={S.todayBadge}>Aujourd'hui</div>}
            </div>
          ))}
        </div>
        <div style={S.gridBody}>
          <div style={S.timeCol}>
            {HOURS.map(h => <div key={h} style={S.timeCell}>{h}</div>)}
          </div>
          {DAYS.map((day, dayIdx) => (
            <div key={day} style={S.dayColumn}>
              {HOURS.map((_, i) => <div key={i} style={S.hourLine} />)}
              {INITIAL_SCHEDULE.filter(c => c.day === dayIdx).map(cls => (
                <div
                  key={cls.id}
                  className="class-block"
                  style={{
                    ...S.classBlock,
                    top: cls.start*64+4,
                    height: cls.duration*64-8,
                    backgroundColor: SUBJECT_COLORS[cls.subject] || "#1a3a5c",
                    opacity: hoveredBlock && hoveredBlock !== cls.id ? 0.55 : 1,
                  }}
                  onMouseEnter={() => setHoveredBlock(cls.id)}
                  onMouseLeave={() => setHoveredBlock(null)}
                >
                  <div style={S.classSubject}>{cls.subject}</div>
                  {cls.duration >= 2 && <>
                    <div style={S.classTeacher}>{cls.teacher}</div>
                    <div style={S.classRoom}>{cls.room}</div>
                  </>}
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
            <div style={{...S.legendDot, background: color}} />
            <span style={S.legendText}>{subj}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADD CLASS MODAL ──────────────────────────────────────────────────────────

function AddClassModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ level:"6ème", section:"A", capacity:30, headTeacher:"", room:"", students:0 });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const validate = () => {
    const e = {};
    if (!form.headTeacher.trim()) e.headTeacher = "Champ requis";
    if (!form.room.trim()) e.room = "Champ requis";
    if (form.capacity < 1) e.capacity = "Capacité invalide";
    if (form.students > form.capacity) e.students = "Dépasse la capacité";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onAdd({ ...form, id: Date.now(), createdAt: new Date().toISOString().split("T")[0] });
    onClose();
  };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>Nouvelle Classe</div>
            <div style={S.modalSub}>Remplissez les informations de la classe</div>
          </div>
          <button style={S.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={S.formGrid}>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Niveau</label>
            <select value={form.level} onChange={e => set("level", e.target.value)} style={S.formSelect}>
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Section</label>
            <select value={form.section} onChange={e => set("section", e.target.value)} style={S.formSelect}>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Capacité max.</label>
            <input type="number" min="1" max="60" value={form.capacity}
              onChange={e => set("capacity", +e.target.value)}
              style={{...S.formInput, ...(errors.capacity ? S.inputError : {})}} />
            {errors.capacity && <span style={S.errorMsg}>{errors.capacity}</span>}
          </div>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Effectif actuel</label>
            <input type="number" min="0" value={form.students}
              onChange={e => set("students", +e.target.value)}
              style={{...S.formInput, ...(errors.students ? S.inputError : {})}} />
            {errors.students && <span style={S.errorMsg}>{errors.students}</span>}
          </div>
          <div style={{...S.formGroup, gridColumn:"1 / -1"}}>
            <label style={S.formLabel}>Professeur principal</label>
            <input type="text" placeholder="ex: M. Rakoto" value={form.headTeacher}
              onChange={e => set("headTeacher", e.target.value)}
              style={{...S.formInput, ...(errors.headTeacher ? S.inputError : {})}} />
            {errors.headTeacher && <span style={S.errorMsg}>{errors.headTeacher}</span>}
          </div>
          <div style={{...S.formGroup, gridColumn:"1 / -1"}}>
            <label style={S.formLabel}>Salle principale</label>
            <input type="text" placeholder="ex: Salle 07" value={form.room}
              onChange={e => set("room", e.target.value)}
              style={{...S.formInput, ...(errors.room ? S.inputError : {})}} />
            {errors.room && <span style={S.errorMsg}>{errors.room}</span>}
          </div>
        </div>

        <div style={S.previewBadge}>
          <span style={S.previewIcon}>⊞</span>
          <span style={S.previewText}>
            Aperçu : <strong>{form.level} {form.section}</strong> — {form.headTeacher || "Prof. principal"} — {form.room || "Salle"} — {form.students}/{form.capacity} élèves
          </span>
        </div>

        <div style={S.modalActions}>
          <button style={S.cancelBtn} onClick={onClose}>Annuler</button>
          <button style={S.submitBtn} onClick={handleSubmit}>✓ Créer la classe</button>
        </div>
      </div>
    </div>
  );
}

// ─── CLASSES PAGE ─────────────────────────────────────────────────────────────

function ClassesPage() {
  const [classes, setClasses] = useState(INITIAL_CLASSES);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("Tous");
  const [selected, setSelected] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const filtered = classes.filter(c => {
    const name = `${c.level} ${c.section}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || c.headTeacher.toLowerCase().includes(search.toLowerCase());
    const matchLevel = filterLevel === "Tous" || c.level === filterLevel;
    return matchSearch && matchLevel;
  });

  const handleAdd = (cls) => {
    setClasses(prev => [...prev, cls]);
  };
  const handleDelete = (id) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    setDeleteId(null);
    if (selected?.id === id) setSelected(null);
  };

  const fillPct = (cls) => Math.round((cls.students / cls.capacity) * 100);
  const fillColor = (pct) => pct >= 90 ? "#c0392b" : pct >= 70 ? "#c8922a" : "#2d6a4f";
  const shortLevel = (cls) => cls.level.replace("ème","").replace("nde","").replace("ère","");

  return (
    <div style={S.pageWrap}>
      {showModal && <AddClassModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}

      {deleteId && (
        <div style={S.modalOverlay} onClick={() => setDeleteId(null)}>
          <div style={{...S.modal, maxWidth:400}} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>Supprimer la classe ?</div>
              <button style={S.modalClose} onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <p style={{color:"rgba(13,31,53,0.65)", fontSize:14, padding:"8px 0 24px", lineHeight:1.6}}>
              Cette action est irréversible. Toutes les données associées seront supprimées définitivement.
            </p>
            <div style={S.modalActions}>
              <button style={S.cancelBtn} onClick={() => setDeleteId(null)}>Annuler</button>
              <button style={{...S.submitBtn, background:"#c0392b"}} onClick={() => handleDelete(deleteId)}>⊗ Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>Gestion des Classes</div>
          <div style={S.breadcrumb}><span>Accueil</span><span style={S.breadSep}>›</span><span style={{color:"#c8922a"}}>Classes</span></div>
        </div>
        <button style={S.addBtn} onClick={() => setShowModal(true)}>＋ Nouvelle classe</button>
      </header>

      <div style={S.statsRow}>
        {[
          { label:"Total classes", value:classes.length, sub:`${LEVELS.filter(l=>classes.some(c=>c.level===l)).length} niveaux`, icon:"⊞" },
          { label:"Total élèves", value:classes.reduce((a,c)=>a+c.students,0), sub:"inscrits", icon:"⊛" },
          { label:"Capacité totale", value:classes.reduce((a,c)=>a+c.capacity,0), sub:"places", icon:"◈" },
          { label:"Remplissage moyen", value:`${Math.round(classes.reduce((a,c)=>a+(c.students/c.capacity),0)/classes.length*100)}%`, sub:"toutes classes", icon:"◷" },
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
            onChange={e => setSearch(e.target.value)}
            style={S.searchInput}
          />
          {search && (
            <button style={S.clearSearch} onClick={() => setSearch("")}>✕</button>
          )}
        </div>
        <div style={S.filterTabs}>
          {["Tous", ...LEVELS].map(lv => (
            <button key={lv} onClick={() => setFilterLevel(lv)}
              style={{...S.filterTab, ...(filterLevel===lv ? S.filterTabActive : {})}}>
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
              <button style={S.addBtn} onClick={() => setShowModal(true)}>＋ Nouvelle classe</button>
            </div>
          ) : filtered.map(cls => {
            const pct = fillPct(cls);
            const isActive = selected?.id === cls.id;
            return (
              <div key={cls.id} className="class-row"
                style={{...S.classRow, ...(isActive ? S.classRowActive : {})}}
                onClick={() => setSelected(cls)}>
                <div style={{...S.classAvatar, background: isActive ? "#c8922a" : "#0d1f35"}}>
                  {shortLevel(cls)}{cls.section}
                </div>
                <div style={S.classRowInfo}>
                  <div style={S.classRowName}>{cls.level} {cls.section}</div>
                  <div style={S.classRowMeta}>{cls.headTeacher} · {cls.room}</div>
                  <div style={S.fillBar}>
                    <div style={{...S.fillBarFill, width:`${pct}%`, background: fillColor(pct)}} />
                  </div>
                </div>
                <div style={S.classRowRight}>
                  <div style={{...S.fillLabel, color: fillColor(pct)}}>{pct}%</div>
                  <div style={S.studentCount}>{cls.students}/{cls.capacity}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={S.detailPanel}>
          {!selected ? (
            <div style={S.detailEmpty}>
              <div style={S.detailEmptyIcon}>◉</div>
              <div style={S.detailEmptyText}>Sélectionnez une classe pour voir ses détails</div>
            </div>
          ) : (() => {
            const pct = fillPct(selected);
            return (
              <div style={S.detailContent}>
                <div style={S.detailHeaderRow}>
                  <div style={S.detailBigAvatar}>
                    {shortLevel(selected)}{selected.section}
                  </div>
                  <div>
                    <div style={S.detailTitle}>{selected.level} {selected.section}</div>
                    <div style={S.detailSub}>Créée le {selected.createdAt}</div>
                  </div>
                </div>

                <div style={S.detailGrid}>
                  {[
                    { label:"Professeur principal", value:selected.headTeacher, icon:"⊛" },
                    { label:"Salle principale", value:selected.room, icon:"◈" },
                    { label:"Effectif actuel", value:`${selected.students} élèves`, icon:"⊞" },
                    { label:"Capacité max.", value:`${selected.capacity} places`, icon:"◷" },
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
                    <span style={{color: fillColor(pct), fontWeight:700}}>{pct}%</span>
                  </div>
                  <div style={S.meterTrack}>
                    <div style={{...S.meterFill, width:`${pct}%`, background: fillColor(pct)}} />
                  </div>
                  <div style={S.meterNote}>
                    {pct >= 90 ? "⚠ Classe quasi complète" : pct >= 70 ? "◐ Classe bien remplie" : "✓ Places disponibles"}
                  </div>
                </div>

                <div style={S.detailActions}>
                  <button style={S.editBtn} onClick={() => setShowModal(true)}>✎ Modifier</button>
                  <button style={S.deleteBtn} onClick={() => setDeleteId(selected.id)}>⊗ Supprimer</button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── PLACEHOLDER PAGE ─────────────────────────────────────────────────────────

function PlaceholderPage({ title, icon }) {
  return (
    <div style={S.pageWrap}>
      <header style={S.topBar}>
        <div>
          <div style={S.pageTitle}>{title}</div>
          <div style={S.breadcrumb}><span>Accueil</span><span style={S.breadSep}>›</span><span style={{color:"#c8922a"}}>{title}</span></div>
        </div>
      </header>
      <div style={S.placeholderBody}>
        <div style={S.placeholderIcon}>{icon}</div>
        <div style={S.placeholderTitle}>Page en construction</div>
        <div style={S.placeholderText}>Cette section sera disponible prochainement.</div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeNav, setActiveNav] = useState("planning");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quickClass, setQuickClass] = useState("6ème A");

  const renderPage = () => {
    if (activeNav === "planning") return <PlanningPage />;
    if (activeNav === "classes") return <ClassesPage />;
    const meta = { teachers:{ title:"Professeurs", icon:"⊛" }, rooms:{ title:"Salles", icon:"◈" }, subjects:{ title:"Matières", icon:"◎" }, settings:{ title:"Paramètres", icon:"⊕" } };
    return <PlaceholderPage {...(meta[activeNav] || { title:"Page", icon:"◉" })} />;
  };

  return (
    <div style={S.root}>
      <style>{css}</style>

      <aside style={{...S.sidebar, width: sidebarOpen ? 260 : 72}}>
        <div style={S.sidebarHeader}>
          <div style={S.logoMark}>
            <span style={S.logoIcon}>✦</span>
            {sidebarOpen && <span style={S.logoText}>EduPlan</span>}
          </div>
          <button style={S.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>

        {sidebarOpen && (
          <div style={S.schoolLabel}>
            <div style={S.schoolDot} />
            <div>
              <div style={S.schoolName}>Lycée Rajoelina</div>
              <div style={S.schoolSub}>Antananarivo — 2025/2026</div>
            </div>
          </div>
        )}

        <div style={S.navSection}>
          {sidebarOpen && <div style={S.navLabel}>NAVIGATION</div>}
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActiveNav(item.key)}
              style={{...S.navItem, ...(activeNav===item.key?S.navItemActive:{}), justifyContent:sidebarOpen?"flex-start":"center"}}
              title={!sidebarOpen ? item.label : ""}>
              <span style={S.navIcon}>{item.icon}</span>
              {sidebarOpen && <span style={S.navItemLabel}>{item.label}</span>}
              {sidebarOpen && activeNav === item.key && <span style={S.navPip} />}
            </button>
          ))}
        </div>

        {sidebarOpen && <>
          <div style={S.divider} />
          <div style={S.navSection}>
            <div style={S.navLabel}>CLASSES RAPIDES</div>
            {INITIAL_CLASSES.slice(0, 5).map(cls => {
              const name = `${cls.level} ${cls.section}`;
              return (
                <button key={cls.id}
                  onClick={() => { setQuickClass(name); setActiveNav("planning"); }}
                  style={{...S.classChip, ...(quickClass===name?S.classChipActive:{})}}>
                  <span style={S.classChipDot} />{name}
                </button>
              );
            })}
          </div>
          <div style={S.sidebarFooter}>
            <div style={S.userAvatar}>JR</div>
            <div>
              <div style={S.userName}>Jean Rakoto</div>
              <div style={S.userRole}>Administrateur</div>
            </div>
          </div>
        </>}
      </aside>

      <main style={S.main}>
        {renderPage()}
      </main>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  root:{ display:"flex", height:"100vh", fontFamily:"'Georgia','Times New Roman',serif", background:"#f4f0e8", overflow:"hidden" },
  sidebar:{ background:"#0d1f35", display:"flex", flexDirection:"column", transition:"width 0.3s cubic-bezier(.4,0,.2,1)", overflow:"hidden", flexShrink:0, borderRight:"1px solid #1a3a5c" },
  sidebarHeader:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"24px 16px 16px", borderBottom:"1px solid rgba(200,146,42,0.2)" },
  logoMark:{ display:"flex", alignItems:"center", gap:10 },
  logoIcon:{ fontSize:22, color:"#c8922a" },
  logoText:{ fontSize:20, fontWeight:"700", color:"#f4f0e8", letterSpacing:"0.04em" },
  toggleBtn:{ background:"rgba(200,146,42,0.15)", border:"1px solid rgba(200,146,42,0.3)", color:"#c8922a", width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  schoolLabel:{ display:"flex", alignItems:"center", gap:10, padding:"14px 20px", margin:"8px 12px", background:"rgba(200,146,42,0.08)", borderRadius:10, border:"1px solid rgba(200,146,42,0.15)" },
  schoolDot:{ width:8, height:8, background:"#c8922a", borderRadius:"50%", flexShrink:0 },
  schoolName:{ color:"#f4f0e8", fontSize:13, fontWeight:"600" },
  schoolSub:{ color:"rgba(244,240,232,0.45)", fontSize:11, marginTop:2 },
  navSection:{ padding:"8px 12px", flex:1 },
  navLabel:{ fontSize:10, color:"rgba(244,240,232,0.3)", letterSpacing:"0.12em", fontWeight:"700", padding:"8px 8px 6px", fontFamily:"monospace" },
  navItem:{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:"transparent", border:"none", borderRadius:8, cursor:"pointer", color:"rgba(244,240,232,0.6)", fontSize:13, transition:"all 0.2s", marginBottom:2 },
  navItemActive:{ background:"rgba(200,146,42,0.12)", color:"#f4f0e8", borderLeft:"2px solid #c8922a" },
  navIcon:{ fontSize:16, flexShrink:0 },
  navItemLabel:{ flex:1, textAlign:"left" },
  navPip:{ width:6, height:6, background:"#c8922a", borderRadius:"50%" },
  divider:{ height:1, background:"rgba(200,146,42,0.15)", margin:"4px 20px" },
  classChip:{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 12px", background:"transparent", border:"none", borderRadius:6, cursor:"pointer", color:"rgba(244,240,232,0.5)", fontSize:12, transition:"all 0.15s", marginBottom:1 },
  classChipActive:{ color:"#c8922a", background:"rgba(200,146,42,0.1)" },
  classChipDot:{ width:5, height:5, borderRadius:"50%", background:"currentColor", flexShrink:0 },
  sidebarFooter:{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderTop:"1px solid rgba(200,146,42,0.15)", marginTop:"auto" },
  userAvatar:{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#c8922a,#e8b84b)", display:"flex", alignItems:"center", justifyContent:"center", color:"#0d1f35", fontWeight:"700", fontSize:12, flexShrink:0 },
  userName:{ color:"#f4f0e8", fontSize:13, fontWeight:"600" },
  userRole:{ color:"rgba(244,240,232,0.4)", fontSize:11 },

  main:{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  pageWrap:{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" },

  topBar:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 32px", borderBottom:"1px solid rgba(13,31,53,0.1)", background:"#f4f0e8", flexShrink:0 },
  topBarRight:{ display:"flex", alignItems:"center", gap:12 },
  pageTitle:{ fontSize:22, fontWeight:"700", color:"#0d1f35", letterSpacing:"-0.01em" },
  breadcrumb:{ display:"flex", gap:6, fontSize:12, color:"rgba(13,31,53,0.4)", marginTop:3 },
  breadSep:{ opacity:0.4 },
  weekNav:{ display:"flex", alignItems:"center", gap:8, background:"white", border:"1px solid rgba(13,31,53,0.12)", borderRadius:10, padding:"6px 12px" },
  weekBtn:{ background:"none", border:"none", cursor:"pointer", color:"#0d1f35", fontSize:16, fontWeight:"bold", padding:"0 4px", opacity:0.5 },
  weekLabel:{ fontSize:13, fontWeight:"600", color:"#0d1f35", whiteSpace:"nowrap" },
  classSelect:{ background:"white", border:"1px solid rgba(13,31,53,0.12)", borderRadius:10, padding:"8px 14px", fontSize:13, color:"#0d1f35", cursor:"pointer", outline:"none" },
  addBtn:{ background:"#0d1f35", color:"#c8922a", border:"none", borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:"600", cursor:"pointer", letterSpacing:"0.02em" },

  statsRow:{ display:"flex", gap:16, padding:"16px 32px", flexShrink:0 },
  statCard:{ flex:1, background:"white", borderRadius:14, padding:"16px 20px", display:"flex", gap:14, alignItems:"center", border:"1px solid rgba(13,31,53,0.06)", boxShadow:"0 2px 12px rgba(13,31,53,0.04)", transition:"transform 0.2s,box-shadow 0.2s", cursor:"default" },
  statIcon:{ fontSize:24, color:"#c8922a", flexShrink:0 },
  statValue:{ fontSize:22, fontWeight:"700", color:"#0d1f35" },
  statLabel:{ fontSize:11, color:"rgba(13,31,53,0.5)", marginTop:3, letterSpacing:"0.04em" },
  statSub:{ fontSize:11, color:"#c8922a", marginTop:2 },

  scheduleContainer:{ flex:1, overflow:"auto", margin:"0 32px", background:"white", borderRadius:16, border:"1px solid rgba(13,31,53,0.08)", boxShadow:"0 4px 24px rgba(13,31,53,0.06)" },
  gridHeader:{ display:"flex", borderBottom:"2px solid rgba(13,31,53,0.08)", position:"sticky", top:0, background:"white", zIndex:10 },
  timeCol:{ width:64, flexShrink:0 },
  dayHeader:{ flex:1, padding:"14px 12px", textAlign:"center", borderLeft:"1px solid rgba(13,31,53,0.06)" },
  dayHeaderToday:{ background:"rgba(200,146,42,0.04)" },
  dayName:{ fontSize:13, fontWeight:"700", color:"#0d1f35", letterSpacing:"0.05em" },
  todayBadge:{ fontSize:10, color:"#c8922a", fontWeight:"600", marginTop:3 },
  gridBody:{ display:"flex" },
  timeCell:{ height:64, display:"flex", alignItems:"flex-start", justifyContent:"flex-end", paddingRight:10, paddingTop:6, fontSize:11, color:"rgba(13,31,53,0.35)", borderBottom:"1px solid rgba(13,31,53,0.05)", fontFamily:"monospace" },
  dayColumn:{ flex:1, position:"relative", borderLeft:"1px solid rgba(13,31,53,0.06)" },
  hourLine:{ height:64, borderBottom:"1px solid rgba(13,31,53,0.05)" },
  classBlock:{ position:"absolute", left:4, right:4, borderRadius:10, padding:"8px 10px", overflow:"hidden", cursor:"pointer", transition:"opacity 0.2s,transform 0.15s", boxShadow:"0 2px 8px rgba(0,0,0,0.15)" },
  classSubject:{ fontSize:12, fontWeight:"700", color:"rgba(255,255,255,0.95)" },
  classTeacher:{ fontSize:10, color:"rgba(255,255,255,0.7)", marginTop:3 },
  classRoom:{ fontSize:10, color:"rgba(255,255,255,0.55)", marginTop:1 },
  classDuration:{ position:"absolute", top:6, right:8, fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:"monospace" },
  legend:{ display:"flex", gap:16, padding:"12px 32px 0", flexWrap:"wrap", flexShrink:0 },
  legendItem:{ display:"flex", alignItems:"center", gap:6 },
  legendDot:{ width:10, height:10, borderRadius:3, flexShrink:0 },
  legendText:{ fontSize:11, color:"rgba(13,31,53,0.55)" },

  filterRow:{ display:"flex", alignItems:"center", gap:12, padding:"0 32px 12px", flexShrink:0, flexWrap:"wrap" },
  searchWrap:{ position:"relative", flex:1, minWidth:220 },
  searchIcon:{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"rgba(13,31,53,0.35)", pointerEvents:"none" },
  searchInput:{ width:"100%", background:"white", border:"1px solid rgba(13,31,53,0.12)", borderRadius:10, padding:"9px 36px", fontSize:13, color:"#0d1f35", outline:"none", fontFamily:"'Georgia',serif" },
  clearSearch:{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(13,31,53,0.4)", fontSize:12 },
  filterTabs:{ display:"flex", gap:4, flexWrap:"wrap" },
  filterTab:{ padding:"7px 14px", background:"white", border:"1px solid rgba(13,31,53,0.1)", borderRadius:20, fontSize:12, cursor:"pointer", color:"rgba(13,31,53,0.6)", transition:"all 0.15s" },
  filterTabActive:{ background:"#0d1f35", color:"#c8922a", borderColor:"#0d1f35" },

  splitLayout:{ display:"flex", flex:1, gap:16, padding:"0 32px 20px", overflow:"hidden", minHeight:0 },
  classList:{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 },
  classRow:{ display:"flex", alignItems:"center", gap:14, background:"white", border:"1px solid rgba(13,31,53,0.08)", borderRadius:14, padding:"14px 16px", cursor:"pointer", transition:"all 0.2s", flexShrink:0 },
  classRowActive:{ border:"1.5px solid #c8922a", boxShadow:"0 4px 20px rgba(200,146,42,0.12)" },
  classAvatar:{ width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:"700", fontSize:13, flexShrink:0 },
  classRowInfo:{ flex:1, minWidth:0 },
  classRowName:{ fontSize:14, fontWeight:"700", color:"#0d1f35" },
  classRowMeta:{ fontSize:12, color:"rgba(13,31,53,0.5)", marginTop:2 },
  fillBar:{ height:3, background:"rgba(13,31,53,0.08)", borderRadius:99, marginTop:8, overflow:"hidden" },
  fillBarFill:{ height:"100%", borderRadius:99, transition:"width 0.4s" },
  classRowRight:{ textAlign:"right", flexShrink:0 },
  fillLabel:{ fontSize:14, fontWeight:"700" },
  studentCount:{ fontSize:11, color:"rgba(13,31,53,0.4)", marginTop:2 },

  detailPanel:{ width:290, flexShrink:0, background:"white", borderRadius:16, border:"1px solid rgba(13,31,53,0.08)", boxShadow:"0 4px 24px rgba(13,31,53,0.06)", overflowY:"auto" },
  detailEmpty:{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:32 },
  detailEmptyIcon:{ fontSize:40, color:"rgba(13,31,53,0.1)" },
  detailEmptyText:{ fontSize:13, color:"rgba(13,31,53,0.4)", textAlign:"center", lineHeight:1.6 },
  detailContent:{ padding:24 },
  detailHeaderRow:{ display:"flex", alignItems:"center", gap:16, marginBottom:24, paddingBottom:20, borderBottom:"1px solid rgba(13,31,53,0.08)" },
  detailBigAvatar:{ width:56, height:56, borderRadius:16, background:"#0d1f35", display:"flex", alignItems:"center", justifyContent:"center", color:"#c8922a", fontWeight:"700", fontSize:16, flexShrink:0 },
  detailTitle:{ fontSize:20, fontWeight:"700", color:"#0d1f35" },
  detailSub:{ fontSize:12, color:"rgba(13,31,53,0.4)", marginTop:4 },
  detailGrid:{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 },
  detailItem:{ display:"flex", alignItems:"flex-start", gap:12 },
  detailItemIcon:{ fontSize:18, color:"#c8922a", marginTop:2, flexShrink:0 },
  detailItemLabel:{ fontSize:11, color:"rgba(13,31,53,0.4)", letterSpacing:"0.04em" },
  detailItemValue:{ fontSize:14, fontWeight:"600", color:"#0d1f35", marginTop:1 },
  meterSection:{ background:"rgba(13,31,53,0.03)", borderRadius:12, padding:"14px 16px", marginBottom:20 },
  meterLabel:{ display:"flex", justifyContent:"space-between", fontSize:12, color:"rgba(13,31,53,0.6)", marginBottom:10 },
  meterTrack:{ height:6, background:"rgba(13,31,53,0.1)", borderRadius:99, overflow:"hidden" },
  meterFill:{ height:"100%", borderRadius:99, transition:"width 0.5s" },
  meterNote:{ fontSize:11, color:"rgba(13,31,53,0.5)", marginTop:8 },
  detailActions:{ display:"flex", gap:10 },
  editBtn:{ flex:1, background:"#0d1f35", color:"#c8922a", border:"none", borderRadius:10, padding:"9px 0", fontSize:13, fontWeight:"600", cursor:"pointer" },
  deleteBtn:{ flex:1, background:"rgba(192,57,43,0.08)", color:"#c0392b", border:"1px solid rgba(192,57,43,0.2)", borderRadius:10, padding:"9px 0", fontSize:13, fontWeight:"600", cursor:"pointer" },

  emptyState:{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:"60px 32px", background:"white", borderRadius:14, border:"1px dashed rgba(13,31,53,0.15)" },
  emptyIcon:{ fontSize:40, color:"rgba(13,31,53,0.1)" },
  emptyTitle:{ fontSize:15, fontWeight:"700", color:"#0d1f35" },
  emptyText:{ fontSize:13, color:"rgba(13,31,53,0.45)", textAlign:"center" },

  modalOverlay:{ position:"fixed", inset:0, background:"rgba(13,31,53,0.55)", backdropFilter:"blur(4px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
  modal:{ background:"#f4f0e8", borderRadius:20, width:"100%", maxWidth:560, boxShadow:"0 24px 80px rgba(13,31,53,0.3)", border:"1px solid rgba(200,146,42,0.2)" },
  modalHeader:{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"24px 28px 0" },
  modalTitle:{ fontSize:20, fontWeight:"700", color:"#0d1f35" },
  modalSub:{ fontSize:13, color:"rgba(13,31,53,0.5)", marginTop:4 },
  modalClose:{ background:"rgba(13,31,53,0.08)", border:"none", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14, color:"#0d1f35", display:"flex", alignItems:"center", justifyContent:"center" },
  formGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, padding:"20px 28px" },
  formGroup:{ display:"flex", flexDirection:"column", gap:6 },
  formLabel:{ fontSize:11, fontWeight:"700", color:"rgba(13,31,53,0.5)", letterSpacing:"0.08em" },
  formInput:{ background:"white", border:"1.5px solid rgba(13,31,53,0.12)", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#0d1f35", outline:"none", fontFamily:"'Georgia',serif" },
  formSelect:{ background:"white", border:"1.5px solid rgba(13,31,53,0.12)", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#0d1f35", outline:"none", fontFamily:"'Georgia',serif", cursor:"pointer" },
  inputError:{ borderColor:"#c0392b !important" },
  errorMsg:{ fontSize:11, color:"#c0392b" },
  previewBadge:{ display:"flex", alignItems:"center", gap:10, margin:"0 28px 20px", background:"rgba(200,146,42,0.07)", border:"1px solid rgba(200,146,42,0.18)", borderRadius:10, padding:"12px 16px" },
  previewIcon:{ fontSize:18, color:"#c8922a" },
  previewText:{ fontSize:12, color:"rgba(13,31,53,0.65)" },
  modalActions:{ display:"flex", gap:10, padding:"0 28px 24px" },
  cancelBtn:{ flex:1, background:"rgba(13,31,53,0.07)", border:"none", borderRadius:10, padding:"11px 0", fontSize:14, fontWeight:"600", cursor:"pointer", color:"#0d1f35" },
  submitBtn:{ flex:2, background:"#0d1f35", color:"#c8922a", border:"none", borderRadius:10, padding:"11px 0", fontSize:14, fontWeight:"600", cursor:"pointer" },

  placeholderBody:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 },
  placeholderIcon:{ fontSize:56, color:"rgba(13,31,53,0.1)" },
  placeholderTitle:{ fontSize:18, fontWeight:"700", color:"rgba(13,31,53,0.4)" },
  placeholderText:{ fontSize:13, color:"rgba(13,31,53,0.3)" },
};

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,31,53,0.10) !important; }
  .class-block:hover { transform: scaleX(1.02); opacity: 1 !important; }
  .class-row:hover { box-shadow: 0 4px 16px rgba(13,31,53,0.08); transform: translateY(-1px); }
  input:focus, select:focus { border-color: #c8922a !important; box-shadow: 0 0 0 3px rgba(200,146,42,0.12); }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(13,31,53,0.15); border-radius: 99px; }
`;
