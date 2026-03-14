import { useEffect, useState } from 'react'
import { PlanningPage } from './PlanningPage'
import type { DbClass, DbProfessorUnavailability, DbScheduledSession } from './types'

export function AlgoTestPage({
  professorsCount,
  classes,
  professorUnavailability,
  selectedClass,
  setSelectedClass,
  onApplied,
}: {
  professorsCount: number
  classes: DbClass[]
  professorUnavailability: DbProfessorUnavailability[]
  selectedClass: string
  setSelectedClass: (v: string) => void
  onApplied: () => Promise<void>
}) {
  const [previewSessions, setPreviewSessions] = useState<DbScheduledSession[] | null>(null)
  const [previewRuns, setPreviewRuns] = useState(0)
  const [error, setError] = useState<string>('')
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null)
  const [chosenClass, setChosenClass] = useState<string>('')

  useEffect(() => {
    if (!classes.length) return
    if (chosenClass && classes.some((c) => c.id === chosenClass)) return
    if (selectedClass && classes.some((c) => c.id === selectedClass)) {
      setChosenClass(selectedClass)
      return
    }
    setChosenClass(classes[0].id)
  }, [classes, selectedClass, chosenClass])

  async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })

    const json = await res.json()
    if (!res.ok || json?.errors?.length) {
      throw new Error(json?.errors?.[0]?.message ?? `HTTP ${res.status}`)
    }
    return json.data as T
  }

  async function runPreview() {
    setPreviewRuns((v) => v + 1)
    setBusy('preview')
    setError('')
    try {
      if (chosenClass && chosenClass !== selectedClass) {
        setSelectedClass(chosenClass)
      }
      const data = await graphql<{ generateSchedulePreview: DbScheduledSession[] }>(
        'query { generateSchedulePreview { id dayOfWeek startMinute endMinute createdAt room { id name capacity } course { id requiredHoursPerWeek subject { id name } schoolClass { id name } professor { id name } } } }',
      )
      const sessions = (data as any)?.generateSchedulePreview
      if (!Array.isArray(sessions)) {
        throw new Error("Réponse inattendue de l'API: generateSchedulePreview manquant")
      }
      if (sessions.length === 0) {
        setError("L'algo a renvoyé 0 séance. Vérifie que la table courses contient des lignes et que /graphql renvoie generateSchedulePreview.")
      }
      setPreviewSessions(sessions)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function applyToDb() {
    setBusy('apply')
    setError('')
    try {
      if (!previewSessions) {
        throw new Error("Lance d'abord 'Aperçu algo' avant d'appliquer en base")
      }
      const data = await graphql<{ applyGeneratedSchedule: { ok: boolean; count: number; error?: string | null } }>(
        'mutation { applyGeneratedSchedule { ok count error } }',
      )
      if (!data.applyGeneratedSchedule.ok) {
        throw new Error(data.applyGeneratedSchedule.error ?? 'Apply failed')
      }
      await onApplied()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 32px 12px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select
          value={chosenClass}
          onChange={(e) => setChosenClass(e.target.value)}
          disabled={busy !== null}
          style={{
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(13,31,53,0.14)',
            padding: '0 12px',
            fontSize: 13,
            fontWeight: 600,
            color: '#0d1f35',
            background: 'white',
          }}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={runPreview}
          disabled={busy !== null}
          style={{
            background: busy === 'preview' ? 'rgba(13,31,53,0.7)' : '#0d1f35',
            color: '#c8922a',
            border: 'none',
            borderRadius: 10,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: '600',
            cursor: busy !== null ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          Tester (Aperçu algo)
        </button>
        <button
          onClick={applyToDb}
          disabled={busy !== null}
          style={{
            background: 'white',
            color: '#0d1f35',
            border: '1px solid rgba(13,31,53,0.12)',
            borderRadius: 10,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: '600',
            cursor: busy !== null ? 'not-allowed' : 'pointer',
          }}
        >
          Appliquer en DB
        </button>
        {previewSessions ? (
          <div style={{ alignSelf: 'center', fontSize: 12, color: 'rgba(13,31,53,0.55)' }}>
            Aperçu actif (non enregistré) — {previewSessions.length} séance(s)
          </div>
        ) : null}
        <div style={{ alignSelf: 'center', fontSize: 12, color: 'rgba(13,31,53,0.35)' }}>
          Debug: previews lancés={previewRuns} · previewSessions={previewSessions === null ? 'null' : String(previewSessions.length)}
        </div>
      </div>

      {error ? (
        <div style={{ padding: '0 32px 12px', color: '#c0392b', fontSize: 13, fontWeight: 600 }}>{error}</div>
      ) : null}

      <PlanningPage
        professorsCount={professorsCount}
        classes={classes}
        scheduledSessions={previewSessions ?? []}
        professorUnavailability={professorUnavailability}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
      />
    </div>
  )
}
