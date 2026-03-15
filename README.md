# PageForge — RBAC Page Builder

A production-ready Next.js 14 + MongoDB application demonstrating server-side role-based access control (RBAC) with a minimal WYSIWYG page builder and full draft → preview → publish workflow.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/rbac-page-builder.git
cd rbac-page-builder
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and NextAuth secret

# 3. Seed demo users (development only)
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/seed

# 4. Open the app
open http://localhost:3000
```

---

## Demo Accounts

| Role        | Email                  | Password    | Capabilities                              |
|-------------|------------------------|-------------|-------------------------------------------|
| viewer      | viewer@demo.com        | Demo1234!   | Read published pages only                 |
| editor      | editor@demo.com        | Demo1234!   | Create/edit own drafts, request preview   |
| admin       | admin@demo.com         | Demo1234!   | Publish/archive any page, view users      |
| super-admin | superadmin@demo.com    | Demo1234!   | Everything + manage users and roles       |

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   ├── pages/               # CRUD + publish endpoints
│   │   │   └── publish/         # Status transition endpoint
│   │   ├── users/               # User management (admin+)
│   │   └── seed/                # Dev-only seeder
│   ├── admin/                   # Admin dashboard (publish controls)
│   ├── editor/                  # Editor dashboard (create/edit drafts)
│   ├── super-admin/             # Super-admin (full control + users)
│   ├── viewer/                  # Read-only published pages
│   └── login/                   # Auth page
├── components/
│   └── Editor.tsx               # TipTap WYSIWYG
├── lib/
│   ├── auth/options.ts          # NextAuth config
│   ├── db.ts                    # MongoDB singleton
│   └── rbac.ts                  # Permission matrix (source of truth)
├── models/
│   ├── Page.ts                  # Mongoose Page schema
│   └── User.ts                  # Mongoose User schema
└── middleware.ts                # Edge-level route protection
```

---

## RBAC Permission Matrix

| Permission     | viewer | editor | admin | super-admin |
|----------------|:------:|:------:|:-----:|:-----------:|
| page:read      |   ✓    |   ✓    |   ✓   |      ✓      |
| page:create    |        |   ✓    |   ✓   |      ✓      |
| page:edit      |        |   ✓*   |   ✓   |      ✓      |
| page:delete    |        |        |   ✓   |      ✓      |
| page:publish   |        |        |   ✓   |      ✓      |
| user:read      |        |        |   ✓   |      ✓      |
| user:manage    |        |        |       |      ✓      |

*Editors can only edit their own pages.

---

## Page Status Workflow

```
[editor]  draft ──────────────────► preview
                                       │
[admin]                    draft ◄────┼────► published ──► archived
                                       │
[super]           (all transitions available)
```

---

## Environment Variables

```bash
# .env.local
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rbac_page_builder
NEXTAUTH_SECRET=min-32-char-random-string
NEXTAUTH_URL=http://localhost:3000   # change to your Vercel URL in production
```

---

## Deployment (Vercel)

### Manual
```bash
npm i -g vercel
vercel --prod
```

### Via GitHub Actions (automated)
1. Push code to GitHub
2. Add secrets in **Settings → Secrets**:
   - `VERCEL_TOKEN` — from vercel.com/account/tokens
   - `VERCEL_ORG_ID` — from `.vercel/project.json`
   - `VERCEL_PROJECT_ID` — from `.vercel/project.json`
3. Every push to `main`:
   - Runs unit tests
   - Runs lint / type-check
   - On success → deploys to Vercel automatically

---

## Running Tests

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:ci       # CI mode with coverage
```

Tests live in `tests/rbac.test.ts` and cover all permission combinations.

---

## Commit Convention

```
feat:     new feature
fix:      bug fix
chore:    tooling / deps
docs:     documentation only
test:     adding / fixing tests
refactor: no behaviour change
ci:       CI/CD pipeline changes
```

Examples:
```
feat: add draft-to-preview status transition for editors
fix: prevent editors from editing other users pages
chore: upgrade mongoose to 8.x
ci: add Vercel deploy step after tests pass
```
