---
Task ID: 4
Agent: full-stack-developer
Task: Build ALL backend API routes for AgentExam (Next.js 16 App Router) under src/app/api/** — auth, subjects, materials, PYQs, exam engine (create/start/answer/submit), results, practical, viva, performance, readiness, study plan, profile, dashboard. 26 route files + 1 shared compute module.

Work Log:
- Read worklog.md + contracts: src/lib/types.ts (all response shapes), src/lib/auth.ts (JWT/scrypt), src/lib/ai.ts (4 AI helpers), prisma/schema.prisma, prisma/seed.ts.
- Created src/app/api/lib/compute.ts (shared server computations): evaluated-test rows (sorted by result.createdAt), answer rows w/ topic join, topic performance (strong/weak/insufficient), weak topics, study-plan generate/map/today-tasks, material mapper, size/date/shuffle utils.
- IMPORTANT DISCOVERY #1: Prisma schema has NO `topic`/`unit` relation on Question and NO `subject` relation on MockTest (plain string FKs). All joins done manually via batch topic/subject lookups. Do NOT use `include: { topic: true }` on Question or `include: { subject: true }` on MockTest.
- IMPORTANT DISCOVERY #2: Turbopack (Next 16 dev) fails to resolve RELATIVE parent imports from route files into non-route folders under app/api (e.g. `../../lib/compute`). Use the alias form `@/app/api/lib/compute` everywhere (tsconfig `@/*` → ./src/*). Also underscore-prefixed `_lib` folder failed module resolution — folder is named `lib` (contains no route.ts so it creates no route).
- Built & verified all 26 route files (see worklog.md for the full curl matrix). Auth via `getAuthUser(req)` + `unauthorized()`; every student query filters by user.id; JSON everywhere; `export const dynamic = 'force-dynamic'` on all routes; async `params` (`{ params }: { params: Promise<{id: string}> }`) awaited.
- Exam start NEVER leaks is_correct/correctAnswer/explanation (options mapped to {id,text} only). After submit, correct answers + explanations ARE returned (per contract).
- AI calls: exam submit evaluates subjective answers with Promise.all; viva answer graded per-question via evaluateVivaAnswer; practical via evaluatePracticalSubmission; improvement suggestions via generateImprovementSuggestions. All worked live (real AI, ~2-5s per submit).
- Practical convention honored: PRACTICAL MockTest.questionIds stores [experimentId]; no Answer row is created for practical submissions (FK constraint — Result written directly).
- Data note: aligned the seeded practical test's questionIds to [BFS experiment id] so the seeded 85% practical surfaces as 'completed' in /api/practical (it was '[]' in the seed).

Stage Summary:
- 27 files created: 26 route.ts files + src/app/api/lib/compute.ts. Full list: auth/{register,login,me}, subjects (+[id]/units), materials (+upload), pyqs, exams (+[id]/{start,submit} +[id]/answers/[qid]), results/exam/[id], practical (+start, +[id]/submit), viva/{start, [id]/submit, [id]/answers/[qid]}, performance/{me, me/readiness}, study-plan/{me, generate, tasks/[id]/status}, students/me, dashboard.
- All endpoints curl-tested (login 200, register 201/409, subjects 200/201, units 200/404, materials 200, upload 201/404, pyqs 200, exam create 201 → start 200 → answers 200/400 → submit 200 w/ AI, results 200/404, practical 200/start 201/submit 200, viva start 201/answers 200/submit 200 w/ AI, performance 200, readiness 200, study-plan 200 + generate 200 + PATCH 200/400/404, students 200/PUT 200, dashboard 200, unauthorized 401, bad inputs 400/404).
- bunx eslint on src/app/api/** → clean; tsc --noEmit → no API issues. Dev log: all recent requests 200 (early-session errors were fixed during development).
- Demo user now has extra evaluated history from live tests: theory exam 33% (AI), EASY exam 100%, viva 38% (DBMS), practical 40% (BST) + seeded BFS practical 85% — recentActivity shows all three icons (📝/🔬/🎤).
