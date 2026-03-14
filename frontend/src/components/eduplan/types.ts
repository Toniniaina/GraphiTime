export type Professor = { id: string; name: string }

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
