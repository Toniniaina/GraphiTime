import { useState } from 'react'
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
  const [error, setError] = useState<string>('')
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null)

  async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, variables }),
    })

    const json = await res.json()
    if (!res.ok || json?.errors?.length) {
      throw new Error(json?.errors?.[0]?.message ?? `HTTP ${res.status}`)
    }
    return json.data as T
  }

  async function runPreview() {
    setBusy('preview')
    setError('')
    try {
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
        throw new Error("Lance d'abord une simulation avant d'enregistrer en base")
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
          Enregistrer en base
        </button>
        {previewSessions ? (
          <div style={{ alignSelf: 'center', fontSize: 12, color: 'rgba(13,31,53,0.55)' }}>
            Simulation active (non enregistrée) — {previewSessions.length} séance(s)
          </div>
        ) : null}
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
        onAddClick={busy !== null ? undefined : runPreview}
      />
    </div>
  )
}
