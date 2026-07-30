/**
 * Shared GPA/CGPA calculation engine.
 * Used by both the manual calculator (Part A) and the auto-fetch result view (Part B).
 * All math lives here — no duplicate logic elsewhere.
 */

/** Standard National University Bangladesh grading scale */
export const GRADE_SCALE: Record<string, number> = {
  'A+': 4.00,
  'A':  3.75,
  'A-': 3.50,
  'B+': 3.25,
  'B':  3.00,
  'B-': 2.75,
  'C+': 2.50,
  'C':  2.25,
  'D':  2.00,
  'F':  0.00,
}

/** Ordered list of grade labels for display */
export const GRADE_LABELS = Object.keys(GRADE_SCALE) as string[]

/**
 * Convert a letter grade to its numeric grade point.
 * Returns null if the grade is not recognised.
 */
export function gradeToPoint(grade: string): number | null {
  const g = grade.trim()
  return g in GRADE_SCALE ? GRADE_SCALE[g] : null
}

export interface GradedCourse {
  credit: number
  gradePoint: number | null
}

/**
 * Year GPA = Σ(gradePoint × credit) / Σ(credit)
 * Only courses with a grade assigned contribute. Returns null if no grades yet.
 */
export function computeYearGPA(courses: GradedCourse[]): number | null {
  const graded = courses.filter(c => c.gradePoint !== null)
  if (graded.length === 0) return null
  const totalWeighted = graded.reduce((sum, c) => sum + c.gradePoint! * c.credit, 0)
  const totalCredits   = graded.reduce((sum, c) => sum + c.credit, 0)
  return totalCredits > 0 ? totalWeighted / totalCredits : null
}

/**
 * Overall CGPA = Σ(all courses' gradePoint × credit) / Σ(all courses' credit)
 * F grades (gradePoint = 0) DO count — per NU rules.
 * Returns null if no grades have been entered at all.
 */
export function computeCGPA(allCourses: GradedCourse[]): number | null {
  const graded = allCourses.filter(c => c.gradePoint !== null)
  if (graded.length === 0) return null
  const totalWeighted = graded.reduce((sum, c) => sum + c.gradePoint! * c.credit, 0)
  const totalCredits   = graded.reduce((sum, c) => sum + c.credit, 0)
  return totalCredits > 0 ? totalWeighted / totalCredits : null
}
