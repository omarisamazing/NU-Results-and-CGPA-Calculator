import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearch } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

import {
  PROGRAMS,
  getDepartmentsForProgram,
  getSyllabusesForDept,
  loadDepartmentData,
  type DeptData,
  type CourseDefinition,
} from '@/lib/departments'
import {
  GRADE_LABELS,
  gradeToPoint,
  computeYearGPA,
  computeCGPA,
} from '@/lib/gpa'
import { CGPABlock, type FailedCourse } from '@/components/CGPABlock'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatGPA(value: number | null): string {
  return value !== null ? value.toFixed(2) : '—'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Calculator() {
  const search = useSearch()
  const params = new URLSearchParams(search)

  // Selection state (pre-fillable from URL params for fallback navigation)
  const [program, setProgram] = useState(params.get('program') || '')
  const [deptId, setDeptId] = useState(params.get('department') || '')
  const [syllabus, setSyllabus] = useState('')

  // Data state
  const [deptData, setDeptData] = useState<DeptData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  // Grade selections: courseCode → selected grade letter
  const [selected, setSelected] = useState<Record<string, string>>({})

  // ── Derived lists ──────────────────────────────────────────────────────────
  const departments = useMemo(() => getDepartmentsForProgram(program), [program])
  const syllabuses = useMemo(
    () => (program && deptId ? getSyllabusesForDept(program, deptId) : []),
    [program, deptId],
  )

  // Auto-select syllabus when only one option
  useEffect(() => {
    if (syllabuses.length === 1) setSyllabus(syllabuses[0])
    else setSyllabus('')
  }, [syllabuses])

  // ── Load department data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!program || !deptId || !syllabus) return
    setIsLoading(true)
    setDeptData(null)
    setSelected({})
    setLoadError('')

    loadDepartmentData(program, deptId, syllabus)
      .then((data) => {
        setDeptData(data)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        setLoadError(err.message)
        setIsLoading(false)
      })
  }, [program, deptId, syllabus])

  // ── GPA calculations (shared engine) ──────────────────────────────────────
  const gradePoints = useMemo<Record<string, number | null>>(() => {
    const map: Record<string, number | null> = {}
    Object.entries(selected).forEach(([code, grade]) => {
      map[code] = gradeToPoint(grade)
    })
    return map
  }, [selected])

  const yearGPAs = useMemo<Record<number, number | null>>(() => {
    if (!deptData) return {}
    const result: Record<number, number | null> = {}
    deptData.years.forEach((year) => {
      result[year.year] = computeYearGPA(
        year.courses.map((c) => ({ credit: c.credit, gradePoint: gradePoints[c.code] ?? null })),
      )
    })
    return result
  }, [deptData, gradePoints])

  const { cgpa, hasFailedSubjects } = useMemo(() => {
    if (!deptData) return { cgpa: null, hasFailedSubjects: false }
    return computeCGPA(
      deptData.years.flatMap((y) =>
        y.courses.map((c) => ({ credit: c.credit, gradePoint: gradePoints[c.code] ?? null })),
      ),
    )
  }, [deptData, gradePoints])

  const totalGraded = Object.keys(selected).length
  const totalCourses = deptData?.years.reduce((sum, y) => sum + y.courses.length, 0) ?? 0

  // Build the list of failed courses for CGPABlock (courses where user selected 'F')
  const failedCourses = useMemo<FailedCourse[]>(() => {
    if (!deptData || !hasFailedSubjects) return []
    return deptData.years.flatMap((y) =>
      y.courses
        .filter((c) => selected[c.code] === 'F')
        .map((c) => ({ code: c.code, name: c.name, credit: c.credit })),
    )
  }, [deptData, hasFailedSubjects, selected])

  // Compute estimated CGPA by substituting hypothetical grades for F courses
  const computeCalcEstimate = useCallback(
    (hypotheticalGrades: Record<string, string>): number | null => {
      if (!deptData) return null
      const courses = deptData.years.flatMap((y) =>
        y.courses.map((c) => {
          const isFailed = selected[c.code] === 'F'
          const gp = isFailed
            ? (gradeToPoint(hypotheticalGrades[c.code]) ?? null)
            : (gradePoints[c.code] ?? null)
          return { credit: c.credit, gradePoint: gp }
        }),
      )
      const { cgpa } = computeCGPA(courses)
      return cgpa
    },
    [deptData, selected, gradePoints],
  )

  // ── Grade selection logic ──────────────────────────────────────────────────
  function selectGrade(course: CourseDefinition, grade: string) {
    setSelected((prev) => {
      const next = { ...prev, [course.code]: grade }
      // Elective pairs are mutually exclusive — deselect the other one
      if (course.pairedWith) {
        delete next[course.pairedWith]
      }
      return next
    })
  }

  function isDisabled(course: CourseDefinition): boolean {
    if (!course.pairedWith) return false
    return course.pairedWith in selected
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function handleReset() {
    setSelected({})
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto items-stretch">

      {/* ── Left: Selection Panel ── */}
      <div className="w-full md:w-[400px] lg:w-[460px] p-6 md:p-12 md:border-r border-border/40 shrink-0 flex flex-col">

        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter mb-2">Calculate.</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Manual CGPA Calculator</p>
        </div>

        <div className="space-y-7">
          {/* Program */}
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground block">
              Program
            </label>
            <div className="flex flex-col gap-2">
              {PROGRAMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProgram(p.id)
                    setDeptId('')
                    setSyllabus('')
                    setDeptData(null)
                    setSelected({})
                  }}
                  className={cn(
                    'text-left px-4 py-3 border font-mono text-sm transition-all',
                    program === p.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border/40 text-muted-foreground hover:border-foreground/50 hover:text-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Department */}
          <AnimatePresence>
            {program && (
              <motion.div
                key="dept"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground block">
                  Department
                </label>
                <Select
                  value={deptId}
                  onValueChange={(v) => {
                    setDeptId(v)
                    setSyllabus('')
                    setDeptData(null)
                    setSelected({})
                  }}
                >
                  <SelectTrigger className="rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border focus:border-foreground focus:ring-0 px-0 h-12 bg-transparent font-mono">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem
                        key={d.id}
                        value={d.id}
                        className="font-mono"
                        disabled={!d.available}
                      >
                        {d.name}
                        {!d.available && (
                          <span className="ml-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                            Coming soon
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Syllabus (shown only when multiple are available) */}
          <AnimatePresence>
            {deptId && syllabuses.length > 1 && (
              <motion.div
                key="syllabus"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground block">
                  Syllabus Year
                </label>
                <Select value={syllabus} onValueChange={setSyllabus}>
                  <SelectTrigger className="rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border focus:border-foreground focus:ring-0 px-0 h-12 bg-transparent font-mono">
                    <SelectValue placeholder="Select syllabus" />
                  </SelectTrigger>
                  <SelectContent>
                    {syllabuses.map((s) => (
                      <SelectItem key={s} value={s} className="font-mono">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── CGPA Display ── */}
        <AnimatePresence>
          {deptData && (
            <motion.div
              key="cgpa-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-auto pt-12"
            >
              <div className="border-t border-border/40 pt-8 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <CGPABlock
                    cgpa={cgpa}
                    hasFailedSubjects={hasFailedSubjects}
                    failedCourses={failedCourses}
                    computeEstimate={computeCalcEstimate}
                    label="Calculated CGPA"
                  />
                  {totalGraded > 0 && (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors pt-1 shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {totalGraded} of {totalCourses} courses graded
                  {deptData && (
                    <span className="ml-3 text-muted-foreground/50">
                      · {deptData.department} {deptData.syllabus}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right: Course Entry Panel ── */}
      <div className="flex-1 bg-muted/30 p-6 md:p-12 overflow-y-auto min-h-[50vh]">

        {/* Empty state */}
        {!deptData && !isLoading && !loadError && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 min-h-[40vh]">
            <div className="text-center max-w-sm">
              <div className="font-mono text-xs uppercase tracking-widest mb-4">Select a Program</div>
              <p className="font-sans text-sm leading-relaxed">
                Choose your program, department, and syllabus on the left to load your course list and start calculating your GPA.
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {loadError && !isLoading && (
          <div className="max-w-lg pt-4">
            <div className="border border-border/40 p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Not Available</h3>
              <p className="font-mono text-sm">{loadError}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-12 max-w-3xl mx-auto animate-pulse">
            {[0, 1, 2].map((yi) => (
              <div key={yi} className="space-y-4">
                <div className="flex justify-between pb-4 border-b border-border/30">
                  <Skeleton className="h-4 w-32 rounded-none" />
                  <Skeleton className="h-6 w-16 rounded-none" />
                </div>
                {[0, 1, 2, 3, 4, 5].map((ci) => (
                  <Skeleton key={ci} className="h-20 w-full rounded-none" />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Course list */}
        {deptData && !isLoading && (
          <div className="max-w-3xl mx-auto space-y-16">
            {deptData.years.map((year, yi) => (
              <motion.div
                key={year.year}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: yi * 0.07 }}
              >
                {/* Year header */}
                <div className="flex items-end justify-between border-b-2 border-border/40 pb-4 mb-6">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-1">
                      {year.label}
                    </span>
                    <span className="font-sans text-sm text-muted-foreground">
                      {year.courses.filter((c) => c.code in selected).length} / {year.courses.length} courses
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-1">
                      Year GPA
                    </span>
                    <span className="text-3xl font-semibold tracking-tighter tabular-nums">
                      {formatGPA(yearGPAs[year.year] ?? null)}
                    </span>
                  </div>
                </div>

                {/* Courses */}
                <div className="space-y-2">
                  {year.courses.map((course, ci) => {
                    const disabled = isDisabled(course)
                    const currentGrade = selected[course.code]
                    const currentPoint = currentGrade ? gradeToPoint(currentGrade) : null

                    return (
                      <motion.div
                        key={course.code}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: yi * 0.05 + ci * 0.03 }}
                        className={cn(
                          'border border-border/30 bg-background/60 p-4 transition-all',
                          disabled && 'opacity-30 pointer-events-none',
                          currentGrade && 'border-border/70',
                        )}
                      >
                        {/* Course info */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-snug">{course.name}</p>
                            <p className="font-mono text-xs text-muted-foreground mt-0.5">
                              {course.code} · {course.credit} cr
                              {course.isElective && (
                                <span className="ml-2 px-1.5 py-0.5 bg-muted text-muted-foreground rounded-none text-[10px] uppercase tracking-wider">
                                  Elective
                                </span>
                              )}
                            </p>
                          </div>
                          {currentGrade && (
                            <div className="text-right shrink-0">
                              <span className="font-mono text-sm font-semibold">{currentGrade}</span>
                              {currentPoint !== null && (
                                <span className="block font-mono text-xs text-muted-foreground">
                                  {currentPoint.toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Grade buttons */}
                        <div className="flex flex-wrap gap-1">
                          {GRADE_LABELS.map((g) => (
                            <button
                              key={g}
                              onClick={() => selectGrade(course, g)}
                              className={cn(
                                'px-2 py-1 font-mono text-xs border transition-all',
                                currentGrade === g
                                  ? 'bg-foreground text-background border-foreground'
                                  : 'border-border/40 text-muted-foreground hover:border-foreground/50 hover:text-foreground',
                              )}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ))}

            {/* Final summary at bottom */}
            {totalGraded === totalCourses && totalCourses > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t-2 border-foreground/20 pt-8 pb-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-1">All Courses Graded</span>
                    <span className="font-sans text-sm text-muted-foreground">{totalCourses} courses · {deptData.department}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-1">Final CGPA</span>
                    <span className="text-5xl font-semibold tracking-tighter tabular-nums">{formatGPA(cgpa)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
