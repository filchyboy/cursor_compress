### README.md
# Cursor Compress Tool

A lightweight CLI that squeezes oversized schemas and directory trees into
compact, information‑dense summaries.  Its primary goal is to cut token
consumption — and therefore latency and cost — when you feed project context to
Cursor, ChatGPT, Claude, or any other LLM‑powered coding assistant.

* **`schema` command**   Scans Drizzle `createTable()` calls (TypeScript) and
automatically produces a one‑line‑per‑table Domain Specific Language (DSL).
* **`structure` command**   Walks the repository and emits a terse “folder: file,
file” listing that stays readable but token‑cheap.

```bash
# Install (locally in a repo)
pm i -D cursor-compress-tool # or `pnpm add -D` once published

# Generate a compressed schema (default output: output/compressed-schema.txt)
pnpm run schema:compress -- --root src/server/db  # add --only table1,table2 as needed

# Generate a compressed file map (default output: output/compressed-structure.txt)
pnpm run structure:compress -- --root . --ignore dist,coverage
```

Both commands copy their output to the clipboard (when available) so you can
`⌘ V` straight into a Cursor chat.

---

### Why this exists
Cursor and similar IDE agents top out at ~20 k tokens of context.  Raw schemas
and deep directory trees eat that allowance fast.  By replacing *"hundreds of
lines"* with *"handfuls of tokens"* the assistant can spend its budget on your
**prompt** and **new code**, not on re‑reading boilerplate.

The implementation is deliberately dependency‑light and framework‑agnostic so it
can ship as a single `npx`.

---

### Road‑map (not yet implemented)
* Prisma & Sequelize adapters (non‑Drizzle ORMs)
* JSON output option for structured post‑processing
* Automated unit benchmarks (token count / latency)
* GitHub Action that attaches compressed artifacts to each PR

---

## Code base
All files live at repository root for clarity; adjust paths as your project
structure dictates.

---