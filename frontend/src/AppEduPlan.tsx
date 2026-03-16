import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { EduPlanShell, type EduPlanNavKey } from './components/eduplan/EduPlanShell'
import { PlanningPage } from './components/eduplan/PlanningPage'
import { AlgoTestPage } from './components/eduplan/AlgoTestPage'
import { ClassesPage } from './components/eduplan/ClassesPage'
import { TeachersPage } from './components/eduplan/TeachersPage'
import { RoomsPage } from './components/eduplan/RoomsPage'
import { SubjectsPage } from './components/eduplan/SubjectsPage'
import { SettingsPage } from './components/eduplan/SettingsPage'
import type {
  DbClass,
  DbCourse,
  DbProfessorUnavailability,
  DbRoom,
  DbScheduledSession,
  DbSubject,
  Professor,
} from './components/eduplan/types'

export default function AppEduPlan() {
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [quickClassId, setQuickClassId] = useState('')

  const [ping, setPing] = useState<string>('')
  const [pingError, setPingError] = useState<string>('')
  const [dbOk, setDbOk] = useState<boolean | null>(null)
  const [dbError, setDbError] = useState<string>('')

  const [professors, setProfessors] = useState<Professor[]>([])
  const [newProfessorName, setNewProfessorName] = useState<string>('')
  const [profError, setProfError] = useState<string>('')

  const [classes, setClasses] = useState<DbClass[]>([])
  const [rooms, setRooms] = useState<DbRoom[]>([])
  const [subjects, setSubjects] = useState<DbSubject[]>([])
  const [courses, setCourses] = useState<DbCourse[]>([])
  const [scheduledSessions, setScheduledSessions] = useState<DbScheduledSession[]>([])
  const [professorUnavailability, setProfessorUnavailability] = useState<DbProfessorUnavailability[]>([])

  const activeNav: EduPlanNavKey = (() => {
    const p = location.pathname
    if (p.startsWith('/planning')) return 'planning'
    if (p.startsWith('/algo')) return 'algo'
    if (p.startsWith('/classes')) return 'classes'
    if (p.startsWith('/teachers')) return 'teachers'
    if (p.startsWith('/rooms')) return 'rooms'
    if (p.startsWith('/subjects')) return 'subjects'
    if (p.startsWith('/settings')) return 'settings'
    return 'planning'
  })()

  const setActiveNav = (key: EduPlanNavKey) => {
    const map: Record<EduPlanNavKey, string> = {
      planning: '/planning',
      algo: '/algo',
      classes: '/classes',
      teachers: '/teachers',
      rooms: '/rooms',
      subjects: '/subjects',
      settings: '/settings',
    }
    navigate(map[key])
  }

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
      classes: Array<{ id: string; name: string }>
      rooms: Array<{ id: string; name: string; capacity: number }>
      subjects: Array<{ id: string; name: string }>
      courses: Array<{
        id: string
        requiredHoursPerWeek: number
        subject: { id: string; name: string }
        schoolClass: { id: string; name: string }
        professor: { id: string; name: string }
      }>
      scheduledSessions: Array<{
        id: string
        dayOfWeek: number
        startMinute: number
        endMinute: number
        createdAt: string
        course: {
          id: string
          requiredHoursPerWeek: number
          subject: { id: string; name: string }
          schoolClass: { id: string; name: string }
          professor: { id: string; name: string }
        }
        room: { id: string; name: string; capacity: number }
      }>
      professorUnavailability: Array<{
        id: string
        dayOfWeek: number
        startTime: string
        endTime: string
        professor: { id: string; name: string }
      }>
    }>(
      'query { ping dbStatus { ok dbTime dbVersion error } professors { id name } classes { id name } rooms { id name capacity } subjects { id name } courses { id requiredHoursPerWeek subject { id name } schoolClass { id name } professor { id name } } scheduledSessions { id dayOfWeek startMinute endMinute createdAt room { id name capacity } course { id requiredHoursPerWeek subject { id name } schoolClass { id name } professor { id name } } } professorUnavailability { id dayOfWeek startTime endTime professor { id name } } }',
    )

    setPing(data.ping)
    setDbOk(data.dbStatus.ok)
    setDbError(data.dbStatus.error ?? '')
    setProfessors(data.professors)
    setClasses(data.classes)
    setRooms(data.rooms)
    setSubjects(data.subjects)
    setCourses(data.courses)
    setScheduledSessions(data.scheduledSessions)
    setProfessorUnavailability(data.professorUnavailability)
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

  useEffect(() => {
    if (!classes.length) return
    if (quickClassId && classes.some((c) => c.id === quickClassId)) return
    setQuickClassId(classes[0].id)
  }, [classes, quickClassId])

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

  const topError = [
    pingError ? `API: ${pingError}` : '',
    dbError ? `Base de données: ${dbError}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <EduPlanShell
      activeNav={activeNav}
      setActiveNav={setActiveNav}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      quickClass={quickClassId}
      setQuickClass={setQuickClassId}
      classes={classes}
      topError={topError || undefined}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/planning" replace />} />
        <Route
          path="/planning"
          element={
            <PlanningPage
              professorsCount={professors.length}
              classes={classes}
              scheduledSessions={scheduledSessions}
              professorUnavailability={professorUnavailability}
              selectedClass={quickClassId}
              setSelectedClass={setQuickClassId}
            />
          }
        />
        <Route
          path="/algo"
          element={
            <AlgoTestPage
              professorsCount={professors.length}
              classes={classes}
              professorUnavailability={professorUnavailability}
              selectedClass={quickClassId}
              setSelectedClass={setQuickClassId}
              onApplied={refreshAll}
            />
          }
        />
        <Route
          path="/classes"
          element={<ClassesPage classes={classes} courses={courses} scheduledSessions={scheduledSessions} />}
        />
        <Route
          path="/teachers"
          element={
            <TeachersPage
              professors={professors}
              scheduledSessions={scheduledSessions}
              professorUnavailability={professorUnavailability}
              newProfessorName={newProfessorName}
              setNewProfessorName={setNewProfessorName}
              onCreateProfessor={createProfessor}
              profError={profError}
              ping={pingError ? '' : ping}
              dbOk={dbOk}
            />
          }
        />
        <Route path="/rooms" element={<RoomsPage rooms={rooms} scheduledSessions={scheduledSessions} />} />
        <Route
          path="/subjects"
          element={<SubjectsPage subjects={subjects} courses={courses} scheduledSessions={scheduledSessions} />}
        />
        <Route path="/settings" element={<SettingsPage unavailability={professorUnavailability} />} />
        <Route path="*" element={<Navigate to="/planning" replace />} />
      </Routes>
    </EduPlanShell>
  )
}
