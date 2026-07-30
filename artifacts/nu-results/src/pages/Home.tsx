import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { ChevronRight, Loader2, Calculator } from "lucide-react"
import { Link } from "wouter"

import { useListExamNames, useLookupResult } from "@workspace/api-client-react"
import type { ResultData, CourseResult } from "@workspace/api-client-react"

import { computeCGPA, computeYearGPA } from "@/lib/gpa"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const formSchema = z.object({
  examName: z.string().min(1, "Please select an examination"),
  examYear: z.string().min(4, "Enter a valid year").max(4),
  roll: z.string().min(1, "Roll number is required"),
  registrationNo: z.string().min(1, "Registration number is required"),
})

// Whether an error is a NU portal connectivity issue (→ show manual calc link)
function isPortalError(msg: string): boolean {
  return /slow|unavailable|portal|busy|timeout|502|connection/i.test(msg)
}

export default function Home() {
  const { data: examNames, isLoading: isExamsLoading } = useListExamNames()
  const lookupMutation = useLookupResult()

  const [result, setResult] = useState<ResultData | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      examName: "",
      examYear: "",
      roll: "",
      registrationNo: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    setErrorMsg(null)
    setResult(null)

    lookupMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setResult(data)
        },
        onError: (err) => {
          const msg = (err.data as { error?: string } | null)?.error ?? err.message ?? "Failed to lookup result"
          setErrorMsg(msg)
        },
      },
    )
  }

  // Compute CGPA client-side from courses (using shared engine) when not provided by server
  const { displayCGPA, hasFailedSubjects } = useMemo(() => {
    if (!result) return { displayCGPA: null, hasFailedSubjects: false }
    const courses = result.courses.map((c: CourseResult) => ({
      credit: c.credit ?? 0,
      gradePoint: c.gradePoint ?? null,
    }))
    const { cgpa: computed, hasFailedSubjects } = computeCGPA(courses)
    const displayCGPA = result.cgpa ?? result.computedCGPA ?? computed
    return { displayCGPA, hasFailedSubjects }
  }, [result])

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto items-stretch">

      {/* ── Search Sidebar ── */}
      <div className="no-print w-full md:w-[400px] lg:w-[460px] p-6 md:p-12 md:border-r border-border/40 shrink-0">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter mb-2">Query.</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            National University Result System
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="examName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Examination
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border focus:border-foreground focus:ring-0 px-0 h-12 bg-transparent">
                        <SelectValue placeholder={isExamsLoading ? "Loading..." : "Select Examination"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {examNames?.map((name) => (
                        <SelectItem key={name} value={name} className="font-sans">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="font-mono text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="examYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Exam Year
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 2023"
                      {...field}
                      className="rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border focus-visible:border-foreground focus-visible:ring-0 px-0 h-12 bg-transparent text-lg font-mono"
                    />
                  </FormControl>
                  <FormMessage className="font-mono text-[10px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roll"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Roll No
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="7890123"
                        {...field}
                        className="rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border focus-visible:border-foreground focus-visible:ring-0 px-0 h-12 bg-transparent font-mono text-lg"
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Reg No
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="16223456"
                        {...field}
                        className="rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border focus-visible:border-foreground focus-visible:ring-0 px-0 h-12 bg-transparent font-mono text-lg"
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-8">
              <Button
                type="submit"
                disabled={lookupMutation.isPending}
                className="w-full rounded-full h-14 text-sm font-semibold uppercase tracking-widest flex items-center justify-between px-6 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {lookupMutation.isPending ? "Searching..." : "Retrieve Transcript"}
                {lookupMutation.isPending
                  ? <Loader2 className="animate-spin w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />
                }
              </Button>
            </div>
          </form>
        </Form>

        {/* Manual calc hint — always visible below the form */}
        <div className="mt-10 pt-8 border-t border-border/30">
          <p className="font-mono text-xs text-muted-foreground mb-3">
            Already have your results? Enter grades manually.
          </p>
          <Link href="/calculator">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full font-mono text-xs uppercase tracking-widest border-border/50 gap-2"
            >
              <Calculator className="w-3 h-3" />
              Open Calculator
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Result Panel ── */}
      <div className="flex-1 bg-muted/30 p-6 md:p-12 overflow-y-auto min-h-[50vh] print-area">

        {/* Loading skeleton */}
        {lookupMutation.isPending && (
          <div className="w-full max-w-3xl mx-auto space-y-8 animate-pulse">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32 rounded-none" />
              <Skeleton className="h-16 w-64 rounded-none" />
              <Skeleton className="h-4 w-48 rounded-none" />
            </div>
            <div className="space-y-3 pt-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-none" />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {errorMsg && !lookupMutation.isPending && (
          <div className="w-full max-w-3xl mx-auto pt-4">
            <div className="border border-border/50 p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
                {isPortalError(errorMsg) ? "Connection Issue" : "No Result Found"}
              </h3>
              <p className="font-mono text-sm text-foreground/80 mb-6 leading-relaxed">
                {isPortalError(errorMsg)
                  ? "NU's server is slow or unavailable right now. You can enter your grades manually using the calculator below."
                  : errorMsg}
              </p>
              {isPortalError(errorMsg) && (
                <Link href="/calculator">
                  <Button
                    variant="outline"
                    className="rounded-full px-6 font-mono text-xs uppercase tracking-widest border-border/50 gap-2 hover:bg-background"
                  >
                    <Calculator className="w-3 h-3" />
                    Open Manual Calculator
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Result display */}
        {result && !lookupMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-3xl mx-auto space-y-16"
          >
            {/* Header info */}
            <div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border/50 pb-8">
                <div className="flex-1 min-w-0">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
                    {result.examName} · {result.examYear}
                  </h2>
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground break-words">
                    {result.studentName || "Unknown Candidate"}
                  </h1>
                  {result.fathersName && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Father: <span className="text-foreground">{result.fathersName}</span>
                    </p>
                  )}
                  {result.college && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      College: <span className="text-foreground">{result.college}</span>
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-6 font-mono text-sm text-muted-foreground">
                    <div>
                      <span className="uppercase text-[10px] tracking-wider block mb-1">Roll No</span>
                      <span className="text-foreground">{result.roll}</span>
                    </div>
                    <div>
                      <span className="uppercase text-[10px] tracking-wider block mb-1">Reg No</span>
                      <span className="text-foreground">{result.registrationNo}</span>
                    </div>
                    {result.resultStatus && (
                      <div>
                        <span className="uppercase text-[10px] tracking-wider block mb-1">Status</span>
                        <span className="text-foreground font-semibold">{result.resultStatus}</span>
                      </div>
                    )}
                  </div>
                </div>

                {displayCGPA != null && (
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-2">
                      {result.cgpa != null
                        ? "Final CGPA"
                        : hasFailedSubjects
                          ? "Provisional CGPA"
                          : "Computed CGPA"}
                    </span>
                    <span className="text-6xl md:text-7xl font-semibold tracking-tighter tabular-nums">
                      {displayCGPA.toFixed(2)}
                    </span>
                    {hasFailedSubjects && (
                      <p className="font-mono text-[10px] text-muted-foreground mt-2 max-w-[200px] leading-relaxed">
                        Excludes failed subjects — retake required to finalize
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Courses Table */}
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                    <TableHead className="font-mono uppercase text-[10px] tracking-widest w-[90px]">Code</TableHead>
                    <TableHead className="font-mono uppercase text-[10px] tracking-widest">Subject</TableHead>
                    <TableHead className="font-mono uppercase text-[10px] tracking-widest text-right w-[60px]">Credit</TableHead>
                    <TableHead className="font-mono uppercase text-[10px] tracking-widest text-right w-[70px]">Grade</TableHead>
                    <TableHead className="font-mono uppercase text-[10px] tracking-widest text-right w-[70px]">Point</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.courses.map((course: CourseResult, i: number) => (
                    <motion.tr
                      key={course.code + i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors group"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        {course.code}
                      </TableCell>
                      <TableCell className="font-sans font-medium text-sm">{course.subject}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {course.credit != null ? course.credit : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {course.grade}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {course.gradePoint != null ? course.gradePoint.toFixed(2) : "—"}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-center pb-12">
              <Button
                variant="outline"
                className="rounded-full px-8 py-6 font-mono text-xs uppercase tracking-widest border-border/50 bg-transparent hover:bg-muted/50"
                onClick={() => window.print()}
              >
                Print Transcript
              </Button>
            </div>
          </motion.div>
        )}

        {/* Idle state */}
        {!result && !lookupMutation.isPending && !errorMsg && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 min-h-[40vh]">
            <div className="text-center max-w-sm">
              <div className="font-mono text-xs uppercase tracking-widest mb-4">Awaiting Input</div>
              <p className="font-sans text-sm leading-relaxed">
                Enter the candidate's exam details in the panel to retrieve the academic transcript.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
