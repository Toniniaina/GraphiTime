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
  const [previewScore, setPreviewScore] = useState<number | null>(null)
  const [previewExplanationsCount, setPreviewExplanationsCount] = useState<number | null>(null)
  const [previewExplanations, setPreviewExplanations] = useState<any[] | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
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
      const data = await graphql<{
        generateSchedulePreviewDetailed: { sessions: DbScheduledSession[]; score: number; explanations: any[] }
      }>(
        'query ($input: GenerateScheduleInput!) { generateSchedulePreviewDetailed(input: $input) { score sessions { id dayOfWeek startMinute endMinute createdAt room { id name capacity } course { id requiredHoursPerWeek subject { id name } schoolClass { id name } professor { id name } } } explanations { sessionId classId subjectId professorId dayOfWeek startMinute endMinute baseCost lunchPenalty holePenalty totalCost alternatives { dayOfWeek startMinute endMinute scoreDelta rejectedReasons } } } }',
        {
          input: {
            avoidHoles: true,
            maxConsecutiveHoursPerSubject: 4,
            lunchBreakSoft: true,
            lunchStartMinute: 12 * 60,
            lunchEndMinute: 14 * 60,
          },
        },
      )
      const res = (data as any)?.generateSchedulePreviewDetailed
      const sessions = res?.sessions
      if (!Array.isArray(sessions)) {
        throw new Error("Réponse inattendue de l'API: generateSchedulePreviewDetailed manquant")
      }
      if (sessions.length === 0) {
        setError("L'algo a renvoyé 0 séance. Vérifie que la table courses contient des lignes et que /graphql renvoie generateSchedulePreview.")
      }
      setPreviewSessions(sessions)
      setPreviewScore(typeof res?.score === 'number' ? res.score : null)
      setPreviewExplanationsCount(Array.isArray(res?.explanations) ? res.explanations.length : null)
      setPreviewExplanations(Array.isArray(res?.explanations) ? res.explanations : null)
      setSelectedSessionId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const explanationsBySessionId = (() => {
    const m: Record<string, any> = {}
    for (const ex of previewExplanations ?? []) {
      const sid = ex?.sessionId
      if (typeof sid === 'string' && sid) {
        m[sid] = ex
      }
    }
    return m
  })()

  const selectedSession = selectedSessionId ? (previewSessions ?? []).find((s) => s.id === selectedSessionId) : null
  const selectedExplanation = selectedSessionId ? explanationsBySessionId[selectedSessionId] : null

  const explainReason = (r: string) => {
    const v = (r || '').toLowerCase()
    if (v === 'class_conflict') return 'Conflit avec un autre cours de la classe'
    if (v === 'professor_conflict') return 'Conflit avec un autre cours du professeur'
    if (v === 'professor_unavailable') return 'Professeur indisponible'
    if (v === 'lunch_overlap') return 'Tombe sur la pause midi (préférence)'
    if (v === 'higher_cost') return 'Moins bon score (préférences)'
    return r
  }

  const toHHMM = (minute: number) => {
    const m = Math.max(0, Math.floor(Number(minute) || 0))
    const hh = Math.floor(m / 60)
    const mm = m % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const dayLabel = (dow: number) => {
    const d = Number(dow) || 0
    const map: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' }
    return map[d] ?? `J${d}`
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
        {previewScore !== null ? (
          <div style={{ alignSelf: 'center', fontSize: 12, color: 'rgba(13,31,53,0.55)' }}>Score: {previewScore}</div>
        ) : null}
        {previewExplanationsCount !== null ? (
          <div style={{ alignSelf: 'center', fontSize: 12, color: 'rgba(13,31,53,0.55)' }}>
            Explications: {previewExplanationsCount}
          </div>
        ) : null}
      </div>

      {error ? (
        <div style={{ padding: '0 32px 12px', color: '#c0392b', fontSize: 13, fontWeight: 600 }}>{error}</div>
      ) : null}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PlanningPage
            professorsCount={professorsCount}
            classes={classes}
            scheduledSessions={previewSessions ?? []}
            professorUnavailability={professorUnavailability}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            onAddClick={busy !== null ? undefined : runPreview}
            sessionExplanations={(() => {
              const m: Record<string, { totalCost: number; baseCost: number; lunchPenalty: number; holePenalty: number }> = {}
              for (const [sid, ex] of Object.entries(explanationsBySessionId)) {
                m[sid] = {
                  totalCost: Number(ex?.totalCost ?? 0),
                  baseCost: Number(ex?.baseCost ?? 0),
                  lunchPenalty: Number(ex?.lunchPenalty ?? 0),
                  holePenalty: Number(ex?.holePenalty ?? 0),
                }
              }
              return m
            })()}
            onSelectSession={(id) => setSelectedSessionId(id)}
          />
        </div>

        <div
          style={{
            width: 340,
            borderLeft: '1px solid rgba(13,31,53,0.10)',
            padding: '12px 16px',
            overflow: 'auto',
            background: 'rgba(255,255,255,0.85)',
          }}
        >
          {selectedSession && selectedExplanation ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#0d1f35', marginBottom: 8 }}>Explication</div>
              <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.85)', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 800 }}>{selectedSession.course.subject.name}</div>
                <div>{selectedSession.course.schoolClass.name}</div>
                <div>{selectedSession.course.professor.name}</div>
                <div>{selectedSession.room.name}</div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(13,31,53,0.85)' }}>
                <div>Score total: {selectedExplanation.totalCost}</div>
                <div>Base: {selectedExplanation.baseCost}</div>
                <div>Midi: {selectedExplanation.lunchPenalty}</div>
                <div>Trous: {selectedExplanation.holePenalty}</div>
              </div>

              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 900, color: '#0d1f35' }}>Alternatives rejetées</div>
              {Array.isArray(selectedExplanation.alternatives) && selectedExplanation.alternatives.length ? (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedExplanation.alternatives.map((a: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        border: '1px solid rgba(13,31,53,0.10)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        background: 'white',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#0d1f35' }}>
                        {dayLabel(a?.dayOfWeek)} {toHHMM(a?.startMinute)}–{toHHMM(a?.endMinute)} (Δ {a?.scoreDelta})
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.75)', whiteSpace: 'pre-wrap' }}>
                        {(a?.rejectedReasons ?? []).map((r: string) => `- ${explainReason(r)}`).join('\n')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(13,31,53,0.65)' }}>Aucune alternative diagnostiquée.</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(13,31,53,0.60)' }}>Clique un bloc pour voir l’explication.</div>
          )}
        </div>
      </div>
    </div>
  )
}
