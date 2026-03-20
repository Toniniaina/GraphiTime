import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { EduPlanShell, type EduPlanNavKey } from './components/eduplan/EduPlanShell'
import { AuthPage } from './components/eduplan/AuthPage.tsx'
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
  DbMe,
  DbSubject,
  Professor,
} from './components/eduplan/types'
import * as XLSX from 'xlsx'
import { DAYS, HOURS, NAV_ITEMS } from './components/eduplan/data'

export default function AppEduPlan() {
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [quickClassId, setQuickClassId] = useState('')

  const [ping, setPing] = useState<string>('')
  const [pingError, setPingError] = useState<string>('')
  const [dbOk, setDbOk] = useState<boolean | null>(null)
  const [dbError, setDbError] = useState<string>('')

  const [me, setMe] = useState<DbMe | null | undefined>(undefined)

  const [professors, setProfessors] = useState<Professor[]>([])
  const [newProfessorName, setNewProfessorName] = useState<string>('')
  const [profError, setProfError] = useState<string>('')

  const [newClassName, setNewClassName] = useState<string>('')
  const [classError, setClassError] = useState<string>('')

  const [newSubjectName, setNewSubjectName] = useState<string>('')
  const [subjectError, setSubjectError] = useState<string>('')

  const [courseError, setCourseError] = useState<string>('')

  const [roomError, setRoomError] = useState<string>('')
  const [newRoomName, setNewRoomName] = useState<string>('')
  const [newRoomCapacity, setNewRoomCapacity] = useState<string>('')

  const [classes, setClasses] = useState<DbClass[]>([])
  const [rooms, setRooms] = useState<DbRoom[]>([])
  const [subjects, setSubjects] = useState<DbSubject[]>([])
  const [courses, setCourses] = useState<DbCourse[]>([])
  const [scheduledSessions, setScheduledSessions] = useState<DbScheduledSession[]>([])
  const [professorUnavailability, setProfessorUnavailability] = useState<DbProfessorUnavailability[]>([])

  const [planningIoError, setPlanningIoError] = useState<string>('')

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

  const navMeta = NAV_ITEMS.find((x) => x.key === activeNav) ?? NAV_ITEMS[0]
  const pageTitle = navMeta?.label ?? 'GraphiTime'
  const pageIcon = navMeta?.icon ?? '✦'

  useEffect(() => {
    const school = me?.school?.name ? ` — ${me.school.name}` : ''
    document.title = `${pageTitle} — GraphiTime${school}`
  }, [pageTitle, me])

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

  async function exportPlanningCsv() {
    setPlanningIoError('')
    try {
      const res = await fetch('/planning/export.csv', { method: 'GET', credentials: 'include' })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'planning.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setPlanningIoError(e instanceof Error ? e.message : String(e))
    }
  }

  async function exportPlanningXlsx() {
    setPlanningIoError('')
    try {
      const wb = XLSX.utils.book_new()

      const selectedClassId = quickClassId || classes[0]?.id || ''
      const selectedClassName = classes.find((c) => c.id === selectedClassId)?.name || ''
      const classSessions = scheduledSessions.filter((s) => s.course.schoolClass.id === selectedClassId)

      const START_MINUTE = 6 * 60

      // Sheet 1: Planning (grid)
      const grid: (string | number)[][] = []
      grid.push(['Heure', ...DAYS])
      for (const h of HOURS) {
        grid.push([h, ...DAYS.map(() => '')])
      }

      const wsPlanning = XLSX.utils.aoa_to_sheet(grid)
      ;(wsPlanning as any)['!cols'] = [{ wch: 10 }, ...DAYS.map(() => ({ wch: 22 }))]

      const merges: XLSX.Range[] = []
      for (const ses of classSessions) {
        const dayIdx = Math.max(0, Math.min(DAYS.length - 1, (ses.dayOfWeek ?? 1) - 1))
        const startSlot = Math.round((ses.startMinute - START_MINUTE) / 60)
        const durationSlots = Math.max(1, Math.round((ses.endMinute - ses.startMinute) / 60))

        if (startSlot < 0 || startSlot >= HOURS.length) continue

        const r0 = 1 + startSlot // +1 for header row
        const c0 = 1 + dayIdx // +1 for time column

        const subject = ses.course.subject.name
        const teacher = ses.course.professor.name
        const room = ses.room.name
        const cellText = `${subject}\n${teacher}\n${room}`

        const addr = XLSX.utils.encode_cell({ r: r0, c: c0 })
        ;(wsPlanning as any)[addr] = {
          t: 's',
          v: cellText,
        }

        if (durationSlots > 1) {
          const r1 = Math.min(r0 + durationSlots - 1, HOURS.length)
          merges.push({ s: { r: r0, c: c0 }, e: { r: r1, c: c0 } })
          for (let r = r0 + 1; r <= r1; r++) {
            const a2 = XLSX.utils.encode_cell({ r, c: c0 })
            ;(wsPlanning as any)[a2] = { t: 's', v: '' }
          }
        }
      }
      ;(wsPlanning as any)['!merges'] = merges

      XLSX.utils.book_append_sheet(wb, wsPlanning, selectedClassName ? `Planning ${selectedClassName}` : 'Planning')

      // Sheet 2: Données (raw)
      const rawHeader = [
        'session_id',
        'day_of_week',
        'start_minute',
        'end_minute',
        'room_id',
        'room_name',
        'course_id',
        'class_id',
        'class_name',
        'subject_id',
        'subject_name',
        'professor_id',
        'professor_name',
      ]
      const rawRows = classSessions.map((s) => [
        s.id,
        s.dayOfWeek,
        s.startMinute,
        s.endMinute,
        s.room.id,
        s.room.name,
        s.course.id,
        s.course.schoolClass.id,
        s.course.schoolClass.name,
        s.course.subject.id,
        s.course.subject.name,
        s.course.professor.id,
        s.course.professor.name,
      ])
      const wsRaw = XLSX.utils.aoa_to_sheet([rawHeader, ...rawRows])
      ;(wsRaw as any)['!cols'] = rawHeader.map(() => ({ wch: 16 }))
      XLSX.utils.book_append_sheet(wb, wsRaw, 'Données')

      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'planning.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setPlanningIoError(e instanceof Error ? e.message : String(e))
    }
  }

  async function importPlanningCsv(file: File) {
    setPlanningIoError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/planning/import.csv?mode=replace', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })

      const json = (await res.json()) as { ok: boolean; count: number; errors?: string[] }
      if (!res.ok) {
        throw new Error((json as any)?.detail ?? `HTTP ${res.status}`)
      }
      if (!json.ok) {
        throw new Error((json.errors ?? []).join('\n') || 'Import failed')
      }
      await refreshAll()
    } catch (e) {
      setPlanningIoError(e instanceof Error ? e.message : String(e))
    }
  }

  async function importPlanningFile(file: File) {
    const name = (file.name || '').toLowerCase()
    if (name.endsWith('.xlsx')) {
      setPlanningIoError('')
      try {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const firstSheet = wb.SheetNames[0]
        if (!firstSheet) {
          throw new Error('Fichier Excel vide')
        }
        const ws = wb.Sheets[firstSheet]
        const csv = XLSX.utils.sheet_to_csv(ws)
        const csvFile = new File([csv], file.name.replace(/\.xlsx$/i, '.csv'), { type: 'text/csv' })
        await importPlanningCsv(csvFile)
      } catch (e) {
        setPlanningIoError(e instanceof Error ? e.message : String(e))
      }
      return
    }

    await importPlanningCsv(file)
  }

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

  async function createRoom() {
    setRoomError('')
    try {
      const name = newRoomName.trim()
      if (!name) return

      const cap = Number(newRoomCapacity || '0')
      if (!Number.isFinite(cap) || cap < 0) {
        throw new Error('Capacité invalide')
      }

      await graphql<{ createRoom: { id: string } }>(
        'mutation ($input: CreateRoomInput!) { createRoom(input: $input) { id } }',
        { input: { name, capacity: cap } },
      )

      setNewRoomName('')
      setNewRoomCapacity('')
      await refreshAll()
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : String(e))
    }
  }

  async function updateRoom(id: string, name: string, capacity: number) {
    setRoomError('')
    try {
      await graphql<{ updateRoom: { id: string } }>(
        'mutation ($input: UpdateRoomInput!) { updateRoom(input: $input) { id } }',
        { input: { id, name, capacity } },
      )
      await refreshAll()
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteRoom(id: string) {
    setRoomError('')
    try {
      await graphql<{ deleteRoom: boolean }>('mutation ($input: DeleteRoomInput!) { deleteRoom(input: $input) }', {
        input: { id },
      })
      await refreshAll()
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : String(e))
    }
  }

  async function createCourse(classId: string, subjectId: string, professorId: string, requiredHoursPerWeek: number) {
    setCourseError('')
    try {
      await graphql<{ createCourse: { id: string } }>(
        'mutation ($input: CreateCourseInput!) { createCourse(input: $input) { id } }',
        {
          input: { classId, subjectId, professorId, requiredHoursPerWeek },
        },
      )
      await refreshAll()
    } catch (e) {
      setCourseError(e instanceof Error ? e.message : String(e))
    }
  }

  async function updateCourse(courseId: string, professorId: string, requiredHoursPerWeek: number) {
    setCourseError('')
    try {
      await graphql<{ updateCourse: { id: string } }>(
        'mutation ($input: UpdateCourseInput!) { updateCourse(input: $input) { id } }',
        {
          input: { id: courseId, professorId, requiredHoursPerWeek },
        },
      )
      await refreshAll()
    } catch (e) {
      setCourseError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteCourse(courseId: string) {
    setCourseError('')
    try {
      await graphql<{ deleteCourse: boolean }>('mutation ($input: DeleteCourseInput!) { deleteCourse(input: $input) }', {
        input: { id: courseId },
      })
      await refreshAll()
    } catch (e) {
      setCourseError(e instanceof Error ? e.message : String(e))
    }
  }

  async function createSubject() {
    setSubjectError('')
    try {
      const name = newSubjectName.trim()
      if (!name) return

      await graphql<{ createSubject: { id: string; name: string } }>(
        'mutation ($input: CreateSubjectInput!) { createSubject(input: $input) { id name } }',
        { input: { name } },
      )

      setNewSubjectName('')
      await refreshAll()
    } catch (e) {
      setSubjectError(e instanceof Error ? e.message : String(e))
    }
  }

  async function renameSubject(id: string, name: string) {
    setSubjectError('')
    try {
      const next = name.trim()
      if (!next) return

      await graphql<{ renameSubject: { id: string; name: string } }>(
        'mutation ($input: RenameSubjectInput!) { renameSubject(input: $input) { id name } }',
        { input: { id, name: next } },
      )

      await refreshAll()
    } catch (e) {
      setSubjectError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteSubject(id: string) {
    setSubjectError('')
    try {
      await graphql<{ deleteSubject: boolean }>('mutation ($input: DeleteSubjectInput!) { deleteSubject(input: $input) }', {
        input: { id },
      })

      await refreshAll()
    } catch (e) {
      setSubjectError(e instanceof Error ? e.message : String(e))
    }
  }

  async function renameProfessor(id: string, name: string) {
    setProfError('')
    try {
      const next = name.trim()
      if (!next) return

      await graphql<{ renameProfessor: { id: string; name: string } }>(
        'mutation ($input: RenameProfessorInput!) { renameProfessor(input: $input) { id name } }',
        { input: { id, name: next } },
      )
      await refreshAll()
    } catch (e) {
      setProfError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteProfessor(id: string) {
    setProfError('')
    try {
      await graphql<{ deleteProfessor: boolean }>(
        'mutation ($input: DeleteProfessorInput!) { deleteProfessor(input: $input) }',
        { input: { id } },
      )
      await refreshAll()
    } catch (e) {
      setProfError(e instanceof Error ? e.message : String(e))
    }
  }

  async function createProfessorUnavailability(professorId: string, dayOfWeek: number, startTime: string, endTime: string) {
    setProfError('')
    try {
      await graphql<{ createProfessorUnavailability: { id: string } }>(
        'mutation ($input: CreateProfessorUnavailabilityInput!) { createProfessorUnavailability(input: $input) { id } }',
        { input: { professorId, dayOfWeek, startTime, endTime } },
      )
      await refreshAll()
    } catch (e) {
      setProfError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteProfessorUnavailability(id: string) {
    setProfError('')
    try {
      await graphql<{ deleteProfessorUnavailability: boolean }>(
        'mutation ($input: DeleteProfessorUnavailabilityInput!) { deleteProfessorUnavailability(input: $input) }',
        { input: { id } },
      )
      await refreshAll()
    } catch (e) {
      setProfError(e instanceof Error ? e.message : String(e))
    }
  }

  async function createClass() {
    setClassError('')
    try {
      const name = newClassName.trim()
      if (!name) return

      await graphql<{ createClass: { id: string; name: string; homeRoomId?: string | null } }>(
        'mutation ($input: CreateClassInput!) { createClass(input: $input) { id name homeRoomId } }',
        { input: { name } },
      )

      setNewClassName('')
      await refreshAll()
    } catch (e) {
      setClassError(e instanceof Error ? e.message : String(e))
    }
  }

  async function renameClass(id: string, name: string) {
    setClassError('')
    try {
      const next = name.trim()
      if (!next) return

      await graphql<{ renameClass: { id: string; name: string; homeRoomId?: string | null } }>(
        'mutation ($input: RenameClassInput!) { renameClass(input: $input) { id name homeRoomId } }',
        { input: { id, name: next } },
      )
      await refreshAll()
    } catch (e) {
      setClassError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteClass(id: string) {
    setClassError('')
    try {
      await graphql<{ deleteClass: boolean }>('mutation ($input: DeleteClassInput!) { deleteClass(input: $input) }', {
        input: { id },
      })
      await refreshAll()
    } catch (e) {
      setClassError(e instanceof Error ? e.message : String(e))
    }
  }

  async function setClassHomeRoom(classId: string, roomId: string | null) {
    setClassError('')
    try {
      await graphql<{ setClassHomeRoom: { id: string; name: string; homeRoomId?: string | null } }>(
        'mutation ($input: SetClassHomeRoomInput!) { setClassHomeRoom(input: $input) { id name homeRoomId } }',
        { input: { classId, roomId } },
      )
      await refreshAll()
    } catch (e) {
      setClassError(e instanceof Error ? e.message : String(e))
    }
  }

  async function graphql<T>(query: string, variables?: Record<string, unknown>, timeoutMs = 8000): Promise<T> {
    const ctrl = new AbortController()
    const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      signal: ctrl.signal,
      body: JSON.stringify({ query, variables }),
    })

    window.clearTimeout(t)

    const json = await res.json()
    if (!res.ok || json?.errors?.length) {
      throw new Error(json?.errors?.[0]?.message ?? `HTTP ${res.status}`)
    }
    return json.data as T
  }

  async function refreshAll() {
    const data = await graphql<{
      ping: string
      dbStatus: {
        ok: boolean
        dbTime: string
        dbVersion: string
        databaseName: string
        databaseUser: string
        error?: string | null
      }
      professors: Array<{ id: string; name: string }>
      classes: Array<{ id: string; name: string; homeRoomId?: string | null }>
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
      'query { ping dbStatus { ok dbTime dbVersion databaseName databaseUser error } professors { id name } classes { id name homeRoomId } rooms { id name capacity } subjects { id name } courses { id requiredHoursPerWeek subject { id name } schoolClass { id name } professor { id name } } scheduledSessions { id dayOfWeek startMinute endMinute createdAt room { id name capacity } course { id requiredHoursPerWeek subject { id name } schoolClass { id name } professor { id name } } } professorUnavailability { id dayOfWeek startTime endTime professor { id name } } }',
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

    graphql<{ me: DbMe | null }>('query { me { accountId login school { id name } } }', undefined, 8000)
      .then((d) => {
        if (cancelled) return
        setMe(d.me)
        if (d.me) {
          refreshAll().catch((e) => {
            if (!cancelled) {
              setPingError(e instanceof Error ? e.message : String(e))
            }
          })
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setMe(null)
          setPingError(
            e instanceof DOMException && e.name === 'AbortError'
              ? "Impossible de joindre le backend (/graphql). Vérifie que l'API tourne sur :8000."
              : e instanceof Error
                ? e.message
                : String(e),
          )
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

  async function logout() {
    try {
      await graphql<{ logout: boolean }>('mutation { logout }', undefined, 8000)
    } catch (e) {
      setPingError(e instanceof Error ? e.message : String(e))
    } finally {
      setMe(null)
      navigate('/login')
    }
  }

  const topError = [
    pingError ? `API: ${pingError}` : '',
    dbError ? `Base de données: ${dbError}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  if (me === undefined) {
    return <div style={{ padding: 24, color: '#0d1f35', fontWeight: 700 }}>Chargement…</div>
  }

  if (me === null) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <AuthPage
              onAuthed={async (nextMe: DbMe) => {
                setMe(nextMe)
                await refreshAll()
                navigate('/planning')
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <EduPlanShell
      activeNav={activeNav}
      setActiveNav={setActiveNav}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      me={me}
      onLogout={logout}
      pageTitle={pageTitle}
      pageIcon={pageIcon}
      quickClass={quickClassId}
      setQuickClass={setQuickClassId}
      classes={classes}
      topError={topError || undefined}
    >
      <Routes>
        <Route path="/login" element={<Navigate to="/planning" replace />} />
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
              onExportCsv={exportPlanningCsv}
              onExportXlsx={exportPlanningXlsx}
              onImportCsv={importPlanningCsv}
              onImportFile={importPlanningFile}
              planningIoError={planningIoError}
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
          element={
            <ClassesPage
              classes={classes}
              rooms={rooms}
              courses={courses}
              scheduledSessions={scheduledSessions}
              newClassName={newClassName}
              setNewClassName={setNewClassName}
              onCreateClass={createClass}
              onRenameClass={renameClass}
              onDeleteClass={deleteClass}
              onSetHomeRoom={setClassHomeRoom}
              classError={classError}
            />
          }
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
              onRenameProfessor={renameProfessor}
              onDeleteProfessor={deleteProfessor}
              onCreateProfessorUnavailability={createProfessorUnavailability}
              onDeleteProfessorUnavailability={deleteProfessorUnavailability}
              profError={profError}
              ping={pingError ? '' : ping}
              dbOk={dbOk}
            />
          }
        />
        <Route
          path="/rooms"
          element={
            <RoomsPage
              rooms={rooms}
              scheduledSessions={scheduledSessions}
              newRoomName={newRoomName}
              setNewRoomName={setNewRoomName}
              newRoomCapacity={newRoomCapacity}
              setNewRoomCapacity={setNewRoomCapacity}
              onCreateRoom={createRoom}
              onUpdateRoom={updateRoom}
              onDeleteRoom={deleteRoom}
              roomError={roomError}
            />
          }
        />
        <Route
          path="/subjects"
          element={
            <SubjectsPage
              professors={professors}
              classes={classes}
              subjects={subjects}
              courses={courses}
              scheduledSessions={scheduledSessions}
              newSubjectName={newSubjectName}
              setNewSubjectName={setNewSubjectName}
              onCreateSubject={createSubject}
              onRenameSubject={renameSubject}
              onDeleteSubject={deleteSubject}
              subjectError={subjectError}
              onCreateCourse={createCourse}
              onUpdateCourse={updateCourse}
              onDeleteCourse={deleteCourse}
              courseError={courseError}
            />
          }
        />
        <Route path="/settings" element={<SettingsPage unavailability={professorUnavailability} />} />
        <Route path="*" element={<Navigate to="/planning" replace />} />
      </Routes>
    </EduPlanShell>
  )
}
