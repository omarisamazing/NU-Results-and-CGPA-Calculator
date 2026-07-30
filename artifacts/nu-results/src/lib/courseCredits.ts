/**
 * Course credit lookup from static department data files.
 *
 * NU's result HTML does not reliably expose credit hours per course.
 * After parsing course codes from the scraped page, call buildCreditMap()
 * once at app start and use getCourseCredit() to enrich each scraped course.
 */

const DATA_FILES = [
  'accounting-degree',
  'accounting-honours',
  'economics-degree',
  'economics-honours',
  'economics-masters-final',
  'english-honours',
  'english-masters-final',
  'history-honours',
  'management-degree',
  'management-honours',
  'mathematics-honours',
  'political-science-honours',
]

interface CourseEntry { code: string; credit: number }
interface DataFile { years: Array<{ courses: CourseEntry[] }> }

/**
 * Fetch all department JSON files and return a courseCode → credit map.
 * Uses the same BASE_URL pattern as loadDepartmentData() in departments.ts.
 */
export async function buildCreditMap(): Promise<Map<string, number>> {
  const base = (import.meta.env.BASE_URL as string).replace(/\/$/, '')
  const map = new Map<string, number>()
  await Promise.all(
    DATA_FILES.map(async (file) => {
      try {
        const res = await fetch(`${base}/data/${file}.json`)
        if (!res.ok) return
        const data: DataFile = await res.json()
        for (const year of data.years) {
          for (const course of year.courses) {
            map.set(course.code, course.credit)
          }
        }
      } catch {
        // silently skip files that fail — one bad file must not break the others
      }
    }),
  )
  return map
}
