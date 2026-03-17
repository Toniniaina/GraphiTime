export type Professor = { id: string; name: string }

export type DbSchool = { id: string; name: string }

export type DbMe = { accountId: string; login: string; school: DbSchool }

export type DbClass = { id: string; name: string; homeRoomId?: string | null }

export type DbRoom = { id: string; name: string; capacity: number }

export type DbSubject = { id: string; name: string }

export type DbCourse = {
  id: string
  requiredHoursPerWeek: number
  subject: DbSubject
  schoolClass: DbClass
  professor: Professor
}

export type DbProfessorUnavailability = {
  id: string
  professor: Professor
  dayOfWeek: number
  startTime: string
  endTime: string
}

export type DbScheduledSession = {
  id: string
  dayOfWeek: number
  startMinute: number
  endMinute: number
  createdAt: string
  course: DbCourse
  room: DbRoom
}

export type ScheduleItem = {
  id: number
  subject: string
  teacher: string
  room: string
  day: number
  start: number
  duration: number
}

export type SchoolClass = {
  id: number
  level: string
  section: string
  capacity: number
  headTeacher: string
  room: string
  students: number
  createdAt: string
}
