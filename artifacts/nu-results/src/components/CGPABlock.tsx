/**
 * CGPABlock — shared CGPA display + fail-gate estimate component.
 *
 * Case A (no failed subjects): shows the real CGPA immediately.
 * Case B (≥1 failed subject): hides the CGPA, shows a per-failed-course
 *   grade dropdown; once every failed course has a hypothetical grade,
 *   computes and shows an estimated CGPA live.
 *
 * Used by both the Lookup page (Home.tsx) and the Calculator (Calculator.tsx).
 * All CGPA logic stays in the shared gpa.ts engine — no math lives here.
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Hypothetical grades for retake estimate — F is excluded
const HYPOTHETICAL_GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D']

export interface FailedCourse {
  code: string
  /** Display name / subject title */
  name: string
  credit: number
}

interface CGPABlockProps {
  /** Real computed CGPA (null while no grades are entered). */
  cgpa: number | null
  /** True when ≥1 course has gradePoint === 0 (grade F). */
  hasFailedSubjects: boolean
  /** The failed courses, for rendering one dropdown each. */
  failedCourses: FailedCourse[]
  /**
   * Given hypothetical grade selections for the failed courses,
   * return the estimated overall CGPA (or null if not computable).
   * Called inside a useMemo — must be stable (wrap in useCallback in the parent).
   */
  computeEstimate: (hypotheticalGrades: Record<string, string>) => number | null
  /** Label shown above the CGPA number in Case A. */
  label?: string
}

export function CGPABlock({
  cgpa,
  hasFailedSubjects,
  failedCourses,
  computeEstimate,
  label = 'Computed CGPA',
}: CGPABlockProps) {
  const [hypotheticalGrades, setHypotheticalGrades] = useState<Record<string, string>>({})

  const estimatedCGPA = useMemo(() => {
    if (!hasFailedSubjects || failedCourses.length === 0) return null
    const allCovered = failedCourses.every((c) => hypotheticalGrades[c.code])
    if (!allCovered) return null
    return computeEstimate(hypotheticalGrades)
  }, [hasFailedSubjects, failedCourses, hypotheticalGrades, computeEstimate])

  // ── Case A: no failed subjects ─────────────────────────────────────────────
  if (!hasFailedSubjects) {
    if (cgpa == null) return null
    return (
      <div className="pt-4 border-t border-border/30">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-2">
          {label}
        </span>
        <span className="text-5xl font-semibold tracking-tighter tabular-nums">
          {cgpa.toFixed(2)}
        </span>
      </div>
    )
  }

  // ── Case B: at least one failed subject ────────────────────────────────────
  return (
    <div className="border border-red-200 dark:border-red-900/50 p-6 space-y-6">
      <div>
        <h3 className="font-mono text-xs uppercase tracking-widest text-red-600 dark:text-red-500 mb-1">
          Failed Subject(s) Detected
        </h3>
        <p className="font-sans text-sm text-muted-foreground leading-relaxed">
          You have failed subject(s) — estimate your CGPA below by selecting the
          grade you expect on retake.
        </p>
      </div>

      <div className="space-y-4">
        {failedCourses.map((course) => (
          <div key={course.code} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{course.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{course.code}</p>
            </div>
            <Select
              value={hypotheticalGrades[course.code] ?? ''}
              onValueChange={(v) =>
                setHypotheticalGrades((prev) => ({ ...prev, [course.code]: v }))
              }
            >
              <SelectTrigger className="w-[120px] rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border focus:border-foreground focus:ring-0 px-0 h-9 bg-transparent font-mono text-sm shrink-0">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {HYPOTHETICAL_GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g} className="font-mono">
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {estimatedCGPA !== null ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 border-t border-border/30"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-2">
            Estimated CGPA (if retake passes as selected)
          </span>
          <span className="text-5xl font-semibold tracking-tighter tabular-nums">
            {estimatedCGPA.toFixed(2)}
          </span>
        </motion.div>
      ) : (
        <p className="font-mono text-xs text-muted-foreground pt-2">
          Select a grade for each failed subject to see your estimated CGPA.
        </p>
      )}
    </div>
  )
}
