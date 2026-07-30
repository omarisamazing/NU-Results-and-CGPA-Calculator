/**
 * Department registry and data loader for the manual CGPA calculator.
 *
 * JSON files live at public/data/{deptId}-{program}.json.
 * Add a new file → add the entry here → it appears in the UI automatically.
 */

export interface Program {
  id: string
  label: string
  years: number
}

export interface DeptOption {
  id: string
  name: string
}

export interface CourseDefinition {
  code: string
  name: string
  credit: number
  isElective: boolean
  pairedWith: string | null
}

export interface YearData {
  year: number
  label: string
  courses: CourseDefinition[]
}

export interface DeptData {
  program: string
  department: string
  syllabus: string
  years: YearData[]
}

export const PROGRAMS: Program[] = [
  { id: 'honours',      label: 'Honours (4 Year)',                years: 4 },
  { id: 'degree',       label: 'Degree Pass (3 Year)',            years: 3 },
  { id: 'masters-final', label: 'Masters Final (1 Year)',         years: 1 },
]

/** Map of program id → available departments (only include depts that have a JSON file) */
const REGISTRY: Record<string, DeptOption[]> = {
  honours: [
    { id: 'economics',         name: 'Economics' },
    { id: 'english',           name: 'English' },
    { id: 'accounting',        name: 'Accounting' },
    { id: 'political-science', name: 'Political Science' },
    { id: 'mathematics',       name: 'Mathematics' },
    { id: 'history',           name: 'History' },
    { id: 'management',        name: 'Management' },
  ],
  degree: [
    { id: 'economics',  name: 'Economics' },
    { id: 'accounting', name: 'Accounting' },
    { id: 'management', name: 'Management' },
  ],
  'masters-final': [
    { id: 'economics', name: 'Economics' },
    { id: 'english',   name: 'English' },
  ],
}

/** Available syllabus years per program+dept combo */
const SYLLABUSES: Record<string, string[]> = {
  'honours-economics':         ['2013-2014'],
  'honours-english':           ['2013-2014'],
  'honours-accounting':        ['2013-2014'],
  'honours-political-science': ['2013-2014'],
  'honours-mathematics':       ['2013-2014'],
  'honours-history':           ['2013-2014'],
  'honours-management':        ['2013-2014'],
  'degree-economics':          ['2013-2014'],
  'degree-accounting':         ['2013-2014'],
  'degree-management':         ['2013-2014'],
  'masters-final-economics':   ['2021-2022'],
  'masters-final-english':     ['2021-2022'],
}

export function getDepartmentsForProgram(program: string): DeptOption[] {
  return REGISTRY[program] ?? []
}

export function getSyllabusesForDept(program: string, deptId: string): string[] {
  return SYLLABUSES[`${program}-${deptId}`] ?? ['2013-2014']
}

/** Fetch and return the department JSON data for the calculator */
export async function loadDepartmentData(
  program: string,
  deptId: string,
  _syllabus: string,
): Promise<DeptData> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const url = `${base}/data/${deptId}-${program}.json`
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(
      `Course data for ${deptId} (${program}) is not available yet. ` +
      `Please try another department or use the auto-fetch feature.`,
    )
  }
  return resp.json() as Promise<DeptData>
}
