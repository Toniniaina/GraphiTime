import type { ScheduleItem, SchoolClass } from './types'

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export const HOURS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
]

export const WEEKS = ['Semaine 10 — Mars 2026', 'Semaine 11 — Mars 2026', 'Semaine 12 — Avril 2026']

export const LEVELS = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']

export const SECTIONS = ['A', 'B', 'C', 'D']

export const SUBJECT_COLORS: Record<string, string> = {
  Mathématiques: '#1a3a5c',
  'Physique-Chimie': '#c8922a',
  Français: '#2d6a4f',
  'Histoire-Géo': '#7b3f6e',
  Anglais: '#c0392b',
  SVT: '#1a6b8a',
  EPS: '#e67e22',
  Philosophie: '#5d4e75',
  Informatique: '#2c7873',
}

export const INITIAL_SCHEDULE: ScheduleItem[] = [
  { id: 1, subject: 'Mathématiques', teacher: 'M. Rakoto', room: 'Salle 12', day: 1, start: 1, duration: 2 },
  { id: 2, subject: 'Physique-Chimie', teacher: 'Mme. Rabe', room: 'Labo 2', day: 1, start: 3, duration: 2 },
  { id: 3, subject: 'Français', teacher: 'M. Andry', room: 'Salle 05', day: 2, start: 0, duration: 2 },
  { id: 4, subject: 'Histoire-Géo', teacher: 'Mme. Soazig', room: 'Salle 08', day: 2, start: 3, duration: 1 },
  { id: 5, subject: 'Anglais', teacher: 'M. James', room: 'Salle 14', day: 3, start: 1, duration: 2 },
  { id: 6, subject: 'SVT', teacher: 'Mme. Vola', room: 'Labo 1', day: 4, start: 2, duration: 2 },
  { id: 7, subject: 'EPS', teacher: 'M. Feno', room: 'Gymnase', day: 4, start: 5, duration: 2 },
  { id: 8, subject: 'Philosophie', teacher: 'Mme. Niry', room: 'Salle 03', day: 5, start: 0, duration: 2 },
  { id: 9, subject: 'Informatique', teacher: 'M. Haja', room: 'Salle Info', day: 3, start: 4, duration: 2 },
  { id: 10, subject: 'Mathématiques', teacher: 'M. Rakoto', room: 'Salle 12', day: 5, start: 3, duration: 2 },
]

export const INITIAL_CLASSES: SchoolClass[] = [
  {
    id: 1,
    level: '6ème',
    section: 'A',
    capacity: 32,
    headTeacher: 'Mme. Rabe',
    room: 'Salle 01',
    students: 30,
    createdAt: '2025-09-01',
  },
  {
    id: 2,
    level: '6ème',
    section: 'B',
    capacity: 32,
    headTeacher: 'M. Andry',
    room: 'Salle 02',
    students: 28,
    createdAt: '2025-09-01',
  },
  {
    id: 3,
    level: '5ème',
    section: 'A',
    capacity: 30,
    headTeacher: 'M. Rakoto',
    room: 'Salle 03',
    students: 29,
    createdAt: '2025-09-01',
  },
  {
    id: 4,
    level: '5ème',
    section: 'B',
    capacity: 30,
    headTeacher: 'Mme. Soazig',
    room: 'Salle 04',
    students: 27,
    createdAt: '2025-09-01',
  },
  {
    id: 5,
    level: '4ème',
    section: 'A',
    capacity: 35,
    headTeacher: 'M. James',
    room: 'Salle 05',
    students: 33,
    createdAt: '2025-09-01',
  },
  {
    id: 6,
    level: '3ème',
    section: 'A',
    capacity: 35,
    headTeacher: 'Mme. Niry',
    room: 'Salle 06',
    students: 31,
    createdAt: '2025-09-01',
  },
]

export const NAV_ITEMS: Array<{ icon: string; label: string; key: string }> = [
  { icon: '◉', label: 'Planning', key: 'planning' },
  { icon: '◎', label: 'Génération', key: 'algo' },
  { icon: '⊞', label: 'Classes', key: 'classes' },
  { icon: '⊛', label: 'Professeurs', key: 'teachers' },
  { icon: '◈', label: 'Salles', key: 'rooms' },
  { icon: '◎', label: 'Matières', key: 'subjects' },
  { icon: '⊕', label: 'Paramètres', key: 'settings' },
]
