/**
 * Department registry and data loader for the manual CGPA calculator.
 *
 * JSON files live at public/data/{deptId}-{program}.json.
 * Add a new file → set available:true here → it appears in the UI automatically.
 * Departments with available:false are shown as "Coming soon" in the dropdown.
 */

export interface Program {
  id: string
  label: string
  years: number
}

export interface DeptOption {
  id: string
  name: string
  /** Whether course data exists for this department. False = shown as "Coming soon". */
  available: boolean
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
  { id: 'honours',       label: 'Honours (4 Year)',       years: 4 },
  { id: 'degree',        label: 'Degree Pass (3 Year)',   years: 3 },
  { id: 'masters-final', label: 'Masters Final (1 Year)', years: 1 },
]

// Departments that already have a JSON data file
const HONOURS_AVAILABLE = new Set([
  'economics', 'english', 'accounting', 'political-science',
  'mathematics', 'history', 'management',
])
const DEGREE_AVAILABLE = new Set([
  'economics', 'accounting', 'management',
])

/** Map of program id → available departments */
const REGISTRY: Record<string, DeptOption[]> = {
  honours: [
    { id: 'accounting',                       name: 'Accounting' },
    { id: 'anthropology',                     name: 'Anthropology' },
    { id: 'arabic',                           name: 'Arabic' },
    { id: 'bangla',                           name: 'Bangla' },
    { id: 'biochemistry-and-molecular-biology', name: 'Biochemistry & Molecular Biology' },
    { id: 'botany',                           name: 'Botany' },
    { id: 'chemistry',                        name: 'Chemistry' },
    { id: 'economics',                        name: 'Economics' },
    { id: 'english',                          name: 'English' },
    { id: 'environment-science',              name: 'Environment Science' },
    { id: 'finance-and-banking',              name: 'Finance & Banking' },
    { id: 'geography-and-environment',        name: 'Geography & Environment' },
    { id: 'history',                          name: 'History' },
    { id: 'home-economics',                   name: 'Home Economics' },
    { id: 'islamic-history-and-culture',      name: 'Islamic History & Culture' },
    { id: 'islamic-studies',                  name: 'Islamic Studies' },
    { id: 'library-and-information-science',  name: 'Library & Information Science' },
    { id: 'management',                       name: 'Management' },
    { id: 'marketing',                        name: 'Marketing' },
    { id: 'mathematics',                      name: 'Mathematics' },
    { id: 'philosophy',                       name: 'Philosophy' },
    { id: 'physics',                          name: 'Physics' },
    { id: 'political-science',                name: 'Political Science' },
    { id: 'psychology',                       name: 'Psychology' },
    { id: 'sanskrit',                         name: 'Sanskrit' },
    { id: 'social-work',                      name: 'Social Work' },
    { id: 'sociology',                        name: 'Sociology' },
    { id: 'soil-science',                     name: 'Soil Science' },
    { id: 'statistics',                       name: 'Statistics' },
    { id: 'zoology',                          name: 'Zoology' },
  ].map(d => ({ ...d, available: HONOURS_AVAILABLE.has(d.id) })),

  degree: [
    { id: 'accounting',                       name: 'Accounting' },
    { id: 'arabic',                           name: 'Arabic' },
    { id: 'bangla-elective',                  name: 'Bangla (Elective)' },
    { id: 'biochemistry-and-molecular-biology', name: 'Biochemistry & Molecular Biology' },
    { id: 'botany',                           name: 'Botany' },
    { id: 'chemistry',                        name: 'Chemistry' },
    { id: 'computer-science',                 name: 'Computer Science' },
    { id: 'drama-and-media-studies',          name: 'Drama & Media Studies' },
    { id: 'economics',                        name: 'Economics' },
    { id: 'english-elective',                 name: 'English (Elective)' },
    { id: 'finance-and-banking',              name: 'Finance & Banking' },
    { id: 'geography-and-environment',        name: 'Geography & Environment' },
    { id: 'history',                          name: 'History' },
    { id: 'home-economics',                   name: 'Home Economics' },
    { id: 'islamic-history-and-culture',      name: 'Islamic History & Culture' },
    { id: 'islamic-studies',                  name: 'Islamic Studies' },
    { id: 'library-and-information-science',  name: 'Library & Information Science' },
    { id: 'management',                       name: 'Management' },
    { id: 'marine-engineering',               name: 'Marine Engineering' },
    { id: 'marine-fisheries',                 name: 'Marine Fisheries' },
    { id: 'marketing',                        name: 'Marketing' },
    { id: 'mathematics',                      name: 'Mathematics' },
    { id: 'b-music',                          name: 'Music (B)' },
    { id: 'nautical',                         name: 'Nautical' },
    { id: 'pali',                             name: 'Pali' },
    { id: 'philosophy',                       name: 'Philosophy' },
    { id: 'physics',                          name: 'Physics' },
    { id: 'political-science',                name: 'Political Science' },
    { id: 'psychology',                       name: 'Psychology' },
    { id: 'sanskrit',                         name: 'Sanskrit' },
    { id: 'social-work',                      name: 'Social Work' },
    { id: 'sociology',                        name: 'Sociology' },
    { id: 'soil-science',                     name: 'Soil Science' },
    { id: 'b-sports',                         name: 'Sports (B)' },
    { id: 'statistics',                       name: 'Statistics' },
    { id: 'zoology',                          name: 'Zoology' },
  ].map(d => ({ ...d, available: DEGREE_AVAILABLE.has(d.id) })),

  'masters-final': [
    { id: 'economics', name: 'Economics', available: false },
    { id: 'english',   name: 'English',   available: false },
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
