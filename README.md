# AI Workspace - Project Knowledge & Guidelines

### 1. Project Identity

**Purpose**: AI Workspace is an Arabic-first AI productivity platform with intelligent chat, memory, image generation, and research capabilities. The core differentiator is native Arabic quality with dialect support, consent-based memory, and transparent cost/model routing.

**Target Users**: Arabic-speaking professionals who need AI assistance that feels native, not translated.

---

### 2. Architecture Principles

#### Frontend
- **Stack**: React + Vite + TypeScript + Tailwind CSS + Shadcn/UI
- **State**: React Query for server state, URL params for navigation state
- **Routing**: React Router with protected routes via `useAuth`

#### Backend (Lovable Cloud)
- **Database**: PostgreSQL with RLS on all tables
- **Auth**: Supabase Auth (email + password, auto-confirm enabled)
- **Edge Functions**:
  - `chat` - AI conversation with memory injection
  - `extract-memory` - Memory extraction from conversations
  - `generate-image` - Image generation via Lovable AI
  - `research` - Web research with citations
  - `export-data` - GDPR-compliant data export
  - `usage-stats` - Usage analytics
  - `summarize-conversation` - Automatic conversation summaries

#### AI Gateway
- Never Use **Lovable AI Gateway** (`ai.gateway.lovable.dev`) for all AI calls
- Only via API keys from the owner
---

### 3. Arabic-First Requirements

#### RTL Layout (CRITICAL)
Always use logical CSS properties, never physical:
```
✅ ms-4 (margin-start) — NOT ml-4
✅ me-4 (margin-end) — NOT mr-4
✅ ps-4 (padding-start) — NOT pl-4
✅ pe-4 (padding-end) — NOT pr-4
✅ text-start — NOT text-left
✅ text-end — NOT text-right
✅ start-0 — NOT left-0
✅ end-0 — NOT right-0
```

Directional icons use `rtl:rotate-180` (e.g., back arrows, chevrons).

#### Translations
- Files: `src/locales/en/translation.json`, `src/locales/ar/translation.json`
- Always add both languages simultaneously
- Use `t('namespace.key')` in components
- Namespace convention: `chat.`, `memory.`, `projects.`, `settings.`, `common.`, etc.

#### Arabic Processing (`src/lib/arabic-processing.ts`)
**Detection functions**:
- `detectScriptMode(text)` → `'arabic' | 'english' | 'mixed' | 'arabizi'`
- `detectDialectWithConfidence(text)` → `{ dialect, confidence, markers }`

**Normalization** (conservative by default):
- Safe: `normalizeYaAtWordEnd`, `fixPunctuation`
- Risky (disabled by default): `normalizeHamza`, `normalizeTaMarbuta`

**Numeral conversion**:
- Use `applyNumeralPolicySafe()` which protects code, URLs, UUIDs
- Never transform numerals in code blocks or technical content

**Bidi isolation**:
- Do NOT apply Unicode isolates to stored text
- Use CSS-based isolation (`unicode-bidi: isolate`) at render time only

---

### 4. Memory System (Consent-Based)

**Core principle**: Memory is NEVER stored without user approval.

**Memory lifecycle**:
1. `extract-memory` function analyzes conversations
2. Creates suggestions with status `'proposed'`
3. User sees suggestion toast → approves/edits/rejects
4. Only `'approved'` memories are injected into prompts

**Scopes**:
- **Conversation summary**: Auto-generated, per-conversation
- **Project memory**: Requires approval, scoped to project
- **Global memory**: Requires approval, applies everywhere

**Retrieval limits** (cost-aware):
- Max 5 project memories
- Max 3 global memories
- Max 300 chars conversation summary

**Sensitive data filtering**:
- Credit cards, phone numbers, emails, passwords, API keys are blocked
- See patterns in `extract-memory/index.ts`

**Audit logging**:
- All memory operations logged to `memory_audit_log`
- Actions: `created`, `approved`, `rejected`, `updated`, `deleted`, `exported`

---

### 5. Dialect System

**Supported dialects**: `msa`, `egyptian`, `gulf`, `levantine`, `maghrebi`

**"Auto" mode** (recommended default):
- Detects dialect from user messages
- Only applies if confidence is `high` (3+ markers)
- Falls back to user preference otherwise

**Settings propagation**:
- Project-level: `dialect_preset`, `dialect_formality`, `code_switch_mode`, `numeral_mode`
- These are injected as policy blocks into system prompts

**Policy blocks** (in edge function):
Use structured rules, NOT example phrases:
```
VARIETY: Egyptian Arabic
GRAMMAR: Egyptian verb conjugations, negation with مش
TONE: Casual, conversational
```

---

### 6. Routing & Fallback System

**Model routing**:
- "Auto" mode: Fast model for simple, Deep model for complex
- User can override to manual model selection
- Routing badge shows current model + mode

**Provider fallbacks**:
- Primary: Google Gemini
- Fallback: OpenAI (if Gemini fails)
- Track fallback usage in `usage_events.meta`

**Budget enforcement**:
- Soft limits with warnings (SessionBudgetWarning)
- Per-project spending limits in project settings
- Provider status indicators in Settings

---

### 7. Database Patterns

**RLS policies**: Required on ALL tables. Pattern:
```sql
CREATE POLICY "Users can access own data" ON table_name
  FOR ALL USING (auth.uid() = user_id);
```

**Audit columns**: Include on state-changing tables:
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`

**Soft deletes**: Use `is_active BOOLEAN DEFAULT true` for recoverable deletes.

**Metadata JSONB**: Use for flexible, future-proof storage (e.g., `messages.metadata`).

---

### 8. UI/UX Standards

**Accessibility**:
- All icon-only buttons need `aria-label`
- Wrap icon buttons in `Tooltip` for sighted users
- Use `role="status"` and `aria-live="polite"` for loading states
- Focus order must work in RTL

**Skeletons**: Use `skeleton.tsx` for loading states. Every data-loading page needs them.

**Error handling**:
- Toast notifications for user-facing errors
- Console logging for debug errors
- Graceful degradation (e.g., memory retrieval fails → continue without)

**Performance**:
- Memoize heavy components with `React.memo`
- Lazy load charts with `React.lazy`
- Debounce search inputs (300ms)

---

### 9. Edge Function Patterns

**Structure**:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check (for protected functions)
  const supabase = createClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // ... function logic
});
```

**Error responses**: Always include CORS headers. Handle 429 (rate limit) and 402 (payment required) explicitly.

**Config**: Add to `supabase/config.toml`:
```toml
[functions.my-function]
verify_jwt = false  # or true if using Supabase auth
```

---

### 10. Testing & Verification Patterns

**E2E flows to verify**:
1. Auth: signup → login → protected route
2. Chat: send message → receive streaming response → memory suggestion → approve
3. Memory: approve → verify in Memory Bank → verify used in new conversation
4. Dialect: change preset → verify response style changes
5. RTL: full flow in Arabic → no layout breaks

**Arabic verification**:
- Same prompt with MSA vs dialect preset → different but appropriate outputs
- Code in response → numerals not converted
- Mixed Arabic/English → proper bidi rendering

---

### 11. Known Limitations (Be Transparent)

1. **Arabizi conversion**: Detection only, no auto-conversion (would produce nonsense)
2. **Vector search**: Not implemented; using SQL for memory retrieval
3. **Real-time collaboration**: Single user only
4. **Offline mode**: No PWA/service worker
5. **Provider spending limits**: Client-side only, not enforced at API level

---

### 12. Common Mistakes to Avoid

❌ Using `ml-4` instead of `ms-4` for margins
❌ Storing Unicode bidi isolates in database text
❌ Converting numerals in code blocks/URLs
❌ Using `applyNumeralPolicy` instead of `applyNumeralPolicySafe`
❌ Auto-approving memories without user consent
❌ Asking users for `LOVABLE_API_KEY` (it's auto-provisioned)
❌ Editing `src/integrations/supabase/client.ts` or `types.ts` (auto-generated)
❌ Calling AI models directly from frontend
❌ Creating tables without RLS policies

---

### 13. File Organization

```
src/
├── components/
│   ├── chat/          # Chat-specific (ChatInput, ChatMessage, ModelPicker)
│   ├── common/        # Shared (KeyboardShortcutsDialog, EmptyState)
│   ├── layout/        # App shell (MainLayout, Header, Sidebar)
│   ├── memory/        # Memory system (MemoryList, MemorySuggestion)
│   ├── mobile/        # Mobile-specific components
│   ├── projects/      # Project management
│   ├── research/      # Research mode
│   ├── settings/      # Settings page components
│   ├── ui/            # Shadcn primitives (DO NOT MODIFY)
│   └── usage/         # Usage tracking
├── hooks/             # Custom React hooks
├── lib/               # Utilities (arabic-processing.ts, utils.ts)
├── locales/           # i18n translation files
└── pages/             # Route pages

supabase/
├── functions/         # Edge functions
└── migrations/        # Database migrations
```

---

## Setup & Deployment

### Prerequisites
- Node.js (v18+)
- npm
- Supabase CLI (optional, for backend development)

### Environment Variables

The application requires the following environment variables.

#### Frontend
These should be set in your deployment environment or a `.env` file for local development.

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | The URL of your Supabase project. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The anonymous public key for your Supabase project. |

#### Backend (Edge Functions)
Edge functions require their own set of secrets, managed via the Supabase Dashboard or CLI.

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory (if not already present) and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:8080`.

### Build & Deployment

#### Frontend

To build the application for production:

```bash
npm run build
```

The output will be in the `dist/` directory. You can deploy this directory to any static hosting provider like **Netlify**, **Vercel**, or **Lovable**.

#### Backend (Supabase)

To deploy Edge Functions:

```bash
supabase functions deploy
```

Ensure you are logged in via `supabase login` and linked to the correct project.

## Support & FAQ

### Common Issues

**Q: Chat is not responding.**
A: Check the `chat` Edge Function logs in Supabase. Ensure you have sufficient credits/quota with the AI provider.

**Q: Images are failing to generate.**
A: Verify the `generate-image` function logs. This often happens if the external image generation API key is invalid or expired.

**Q: "Database error" in the UI.**
A: Check RLS policies. Ensure the user is authenticated and has permission to access the requested resource.

### Getting Help
For support, please contact the project maintainers or open an issue in the repository.
