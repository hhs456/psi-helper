<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

## Rules

- **DO NOT** include version numbers in commit messages (e.g., no `(v1.2.3)`)
- Version numbers are tracked in `CHANGELOG.md` and `package.json` only
- Format: `<type>(<scope>): <description>`
- **Commit messages MUST be in English**
- **User-facing responses and documentation MUST be in Traditional Chinese (繁體中文)**

## Examples

✅ Correct:
```
feat(backup): include product images in backup
fix(backup): prevent cleanup step from deleting latest Release
```

❌ Wrong:
```
feat(backup): include product images in backup (v0.17.3)
fix(backup): prevent cleanup step from deleting latest Release (v0.17.4)
feat(備份): 包含商品圖片
```
