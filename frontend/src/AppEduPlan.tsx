import { useEffect, useState } from 'react'
import './App.css'
import { EduPlanShell, type EduPlanNavKey } from './components/eduplan/EduPlanShell'
import { PlanningPage } from './components/eduplan/PlanningPage'
import { ClassesPage } from './components/eduplan/ClassesPage'
import { TeachersPage } from './components/eduplan/TeachersPage'
import { PlaceholderPage } from './components/eduplan/PlaceholderPage'
import type { Professor } from './components/eduplan/types'

export default function AppEduPlan() {
  const [activeNav, setActiveNav] = useState<EduPlanNavKey>('planning')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [quickClass, setQuickClass] = useState('6ème A')

  const [ping, setPing] = useState<string>('')
  const [pingError, setPingError] = useState<string>('')
  const [dbOk, setDbOk] = useState<boolean | null>(null)
  const [dbError, setDbError] = useState<string>('')

  const [professors, setProfessors] = useState<Professor[]>([])
  const [newProfessorName, setNewProfessorName] = useState<string>('')
  const [profError, setProfError] = useState<string>('')

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

  async function refreshAll() {
    const data = await graphql<{
      ping: string
      dbStatus: { ok: boolean; dbTime: string; dbVersion: string; error?: string | null }
      professors: Array<{ id: string; name: string }>
    }>('query { ping dbStatus { ok dbTime dbVersion error } professors { id name } }')

    setPing(data.ping)
    setDbOk(data.dbStatus.ok)
    setDbError(data.dbStatus.error ?? '')
    setProfessors(data.professors)
  }

  useEffect(() => {
    let cancelled = false

    refreshAll().catch((e) => {
      if (!cancelled) {
        setPingError(e instanceof Error ? e.message : String(e))
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function createProfessor() {
    setProfError('')
    try {
      const name = newProfessorName.trim()
      if (!name) return

      await graphql<{ createProfessor: { id: string; name: string } }>(
        'mutation ($input: CreateProfessorInput!) { createProfessor(input: $input) { id name } }',
        { input: { name } },
      )

      setNewProfessorName('')
      await refreshAll()
    } catch (e) {
      setProfError(e instanceof Error ? e.message : String(e))
    }
  }

  const renderPage = () => {
    if (activeNav === 'planning') return <PlanningPage professorsCount={professors.length} />
    if (activeNav === 'classes') return <ClassesPage />
    if (activeNav === 'teachers')
      return (
        <TeachersPage
          professors={professors}
          newProfessorName={newProfessorName}
          setNewProfessorName={setNewProfessorName}
          onCreateProfessor={createProfessor}
          profError={profError}
          ping={pingError ? '' : ping}
          dbOk={dbOk}
        />
      )

    const meta: Record<string, { title: string; icon: string }> = {
      rooms: { title: 'Salles', icon: '◈' },
      subjects: { title: 'Matières', icon: '◎' },
      settings: { title: 'Paramètres', icon: '⊕' },
    }
    return <PlaceholderPage {...(meta[activeNav] || { title: 'Page', icon: '◉' })} />
  }

  const topError = [
    pingError ? `API: ${pingError}` : '',
    dbError ? `DB: ${dbError}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <EduPlanShell
      activeNav={activeNav}
      setActiveNav={setActiveNav}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      quickClass={quickClass}
      setQuickClass={setQuickClass}
      topError={topError || undefined}
    >
      {renderPage()}
    </EduPlanShell>
  )
}
