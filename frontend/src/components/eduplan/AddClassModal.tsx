import { useState } from 'react'
import { LEVELS, SECTIONS } from './data'
import type { SchoolClass } from './types'
import { S } from './styles'

export function AddClassModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (cls: SchoolClass) => void
}) {
  const [form, setForm] = useState({
    level: '6ème',
    section: 'A',
    capacity: 30,
    headTeacher: '',
    room: '',
    students: 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!String(form.headTeacher).trim()) e.headTeacher = 'Champ requis'
    if (!String(form.room).trim()) e.room = 'Champ requis'
    if (Number(form.capacity) < 1) e.capacity = 'Capacité invalide'
    if (Number(form.students) > Number(form.capacity)) e.students = 'Dépasse la capacité'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onAdd({
      id: Date.now(),
      level: form.level,
      section: form.section,
      capacity: Number(form.capacity),
      headTeacher: form.headTeacher,
      room: form.room,
      students: Number(form.students),
      createdAt: new Date().toISOString().split('T')[0],
    })
    onClose()
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>Nouvelle Classe</div>
            <div style={S.modalSub}>Remplissez les informations de la classe</div>
          </div>
          <button style={S.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={S.formGrid}>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Niveau</label>
            <select value={form.level} onChange={(e) => set('level', e.target.value)} style={S.formSelect}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Section</label>
            <select value={form.section} onChange={(e) => set('section', e.target.value)} style={S.formSelect}>
              {SECTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Capacité max.</label>
            <input
              type="number"
              min={1}
              max={60}
              value={form.capacity}
              onChange={(e) => set('capacity', Number(e.target.value))}
              style={{ ...S.formInput, ...(errors.capacity ? S.inputError : {}) }}
            />
            {errors.capacity ? <span style={S.errorMsg}>{errors.capacity}</span> : null}
          </div>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Effectif actuel</label>
            <input
              type="number"
              min={0}
              value={form.students}
              onChange={(e) => set('students', Number(e.target.value))}
              style={{ ...S.formInput, ...(errors.students ? S.inputError : {}) }}
            />
            {errors.students ? <span style={S.errorMsg}>{errors.students}</span> : null}
          </div>
          <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
            <label style={S.formLabel}>Professeur principal</label>
            <input
              type="text"
              placeholder="ex: M. Rakoto"
              value={form.headTeacher}
              onChange={(e) => set('headTeacher', e.target.value)}
              style={{ ...S.formInput, ...(errors.headTeacher ? S.inputError : {}) }}
            />
            {errors.headTeacher ? <span style={S.errorMsg}>{errors.headTeacher}</span> : null}
          </div>
          <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
            <label style={S.formLabel}>Salle principale</label>
            <input
              type="text"
              placeholder="ex: Salle 07"
              value={form.room}
              onChange={(e) => set('room', e.target.value)}
              style={{ ...S.formInput, ...(errors.room ? S.inputError : {}) }}
            />
            {errors.room ? <span style={S.errorMsg}>{errors.room}</span> : null}
          </div>
        </div>

        <div style={S.previewBadge}>
          <span style={S.previewIcon}>⊞</span>
          <span style={S.previewText}>
            Aperçu : <strong>
              {form.level} {form.section}
            </strong>{' '}
            — {form.headTeacher || 'Prof. principal'} — {form.room || 'Salle'} — {form.students}/{form.capacity} élèves
          </span>
        </div>

        <div style={S.modalActions}>
          <button style={S.cancelBtn} onClick={onClose}>
            Annuler
          </button>
          <button style={S.submitBtn} onClick={handleSubmit}>
            ✓ Créer la classe
          </button>
        </div>
      </div>
    </div>
  )
}
