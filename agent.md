# Arabic Spark AI - Complete Agent Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Key Features](#key-features)
5. [Database Schema](#database-schema)
6. [API & Edge Functions](#api--edge-functions)
7. [Arabic-First Design Principles](#arabic-first-design-principles)
8. [Memory System](#memory-system)
9. [Dialect System](#dialect-system)
10. [AI Gateway & Model Routing](#ai-gateway--model-routing)
11. [Development Setup](#development-setup)
12. [Testing Strategy](#testing-strategy)
13. [Security](#security)
14. [Deployment](#deployment)
15. [Common Patterns & Best Practices](#common-patterns--best-practices)
16. [Troubleshooting](#troubleshooting)

---

## Project Overview

### Identity

**Arabic Spark AI** (also known as **Bayt Al-Lisan** - "House of Language") is an Arabic-first AI productivity platform that provides intelligent chat, memory management, image generation, and research capabilities. Unlike other AI platforms that simply translate interfaces, this platform is designed from the ground-up for native Arabic speakers.

### Core Differentiators

- **Native Arabic Quality**: Built for Arabic speakers, not translated
- **Dialect Support**: MSA, Egyptian, Gulf, Levantine, and Maghrebi dialects
- **Consent-Based Memory**: Privacy-first memory system requiring user approval
- **Transparent Cost Routing**: Users see which models are used and their costs
- **RTL-First UI**: Properly designed right-to-left interface using logical CSS properties

### Target Users

Arabic-speaking professionals who need AI assistance that feels native and culturally appropriate, with the option to work in English when needed.

---

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   React + Vite  │ ← Frontend (RTL-first UI)
│   TypeScript    │
└────────┬────────┘
         │
         ├─ Supabase Auth (JWT)
         │
         ├─ Supabase Database (PostgreSQL + RLS)
         │
         └─ Edge Functions (Deno)
                 │
                 ├─ AI Gateway (Lovable Cloud)
                 │    ├─ Google Gemini (Primary)
                 │    ├─ OpenAI (Fallback)
                 │    ├─ Anthropic Claude
                 │    └─ Thaura AI
                 │
                 ├─ Perplexity API (Research)
                 └─ OpenAI DALL-E 3 (Images)
```

### Frontend Architecture

- **Framework**: React 18.3 with Vite 5.4
- **Language**: TypeScript 5.8
- **State Management**: 
  - TanStack React Query for server state
  - URL parameters for navigation state
- **Routing**: React Router 6.30 with protected routes via `useAuth`
- **Styling**: Tailwind CSS + Shadcn/UI components
- **Internationalization**: i18next with Arabic and English support

### Backend Architecture

- **Platform**: Supabase
- **Database**: PostgreSQL with Row Level Security (RLS) on all tables
- **Authentication**: Supabase Auth (email + password, auto-confirm enabled)
- **Serverless Functions**: Deno-based Edge Functions
- **Storage**: Supabase Storage for generated images

---

## Technology Stack

### Frontend Dependencies

| Category | Technologies |
|----------|-------------|
| **Core** | React 18.3, TypeScript 5.8, Vite 5.4 |
| **UI Framework** | Tailwind CSS, Shadcn/UI, Radix UI |
| **State Management** | TanStack React Query 5.83 |
| **Routing** | React Router 6.30 |
| **Forms** | React Hook Form, Zod validation |
| **i18n** | i18next, react-i18next |
| **Animation** | Framer Motion |
| **Charts** | Recharts |
| **Markdown** | react-markdown, remark-gfm |
| **Icons** | Lucide React |

### Backend Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Deno |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | Supabase Auth |
| **Edge Functions** | Deno Deploy |
| **AI Gateway** | Lovable AI Gateway |
| **Research API** | Perplexity |
| **Image Generation** | OpenAI DALL-E 3 |

### Development Tools

- **Testing**: Vitest (unit), Playwright (E2E)
- **Linting**: ESLint
- **Type Checking**: TypeScript strict mode
- **Package Manager**: npm (with bun.lockb and pnpm-lock.yaml alternatives)

---

## Key Features

### 1. Intelligent Chat

- **Streaming Responses**: Real-time AI responses with streaming
- **Multi-Model Support**: Access to GPT-4, Gemini, Claude, and Thaura models
- **Automatic Model Routing**: Smart selection between fast and deep models
- **Context-Aware**: Injected memory for personalized responses
- **Code Highlighting**: Proper syntax highlighting for code blocks
- **Markdown Support**: Rich text formatting in responses

### 2. Memory Bank (Consent-Based)

- **Privacy-First**: No memory stored without explicit user approval
- **Three Scopes**:
  - Conversation summaries (auto-generated)
  - Project memories (user-approved, scoped to project)
  - Global memories (user-approved, applies everywhere)
- **Memory Suggestions**: AI extracts potential memories from conversations
- **Audit Trail**: Complete logging of all memory operations
- **Sensitive Data Filtering**: Automatic blocking of credentials, phone numbers, etc.

### 3. Dialect Support

- **Supported Dialects**: Modern Standard Arabic (MSA), Egyptian, Gulf, Levantine, Maghrebi
- **Auto-Detection**: Automatic dialect detection from user messages
- **Formality Levels**: Formal, casual, or auto-selected
- **Code-Switching**: Control how AI handles mixed Arabic/English
- **Numeral Modes**: Eastern Arabic, Western, or auto numerals

### 4. Image Generation

- **DALL-E 3 Integration**: High-quality image generation
- **Gallery View**: Organized view of generated images
- **Download Support**: Save images locally
- **Usage Tracking**: Cost tracking for image generation

### 5. Research Mode

- **Web Research**: Perplexity-powered web search with citations
- **Source Attribution**: Proper citation of sources
- **Multi-Language**: Research in Arabic or English

### 6. Projects

- **Organization**: Group conversations by project
- **Project-Scoped Settings**: Dialect preferences per project
- **Project Memory**: Memories scoped to specific projects
- **Budget Limits**: Per-project spending controls

### 7. Usage Analytics

- **Cost Tracking**: Detailed tracking of AI API costs
- **Model Usage Stats**: Breakdown by model and provider
- **Session Budgets**: Per-session spending warnings
- **Daily Aggregates**: Usage statistics over time

### 8. Anonymous Trial

- **No Signup Required**: Try with 3 free messages
- **Session-Based**: Anonymous sessions tracked separately
- **Upgrade Path**: Easy conversion to full account

---

## Database Schema

### Core Tables

#### `profiles`
User settings and preferences
```sql
- id (uuid, FK to auth.users)
- full_name (text)
- username (text, unique)
- avatar_url (text)
- preferred_language (text)
- preferred_dialect (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `projects`
User projects with dialect settings
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- name (text)
- description (text)
- dialect_preset (text)
- dialect_formality (text)
- code_switch_mode (text)
- numeral_mode (text)
- is_active (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `conversations`
Chat conversations
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- project_id (uuid, FK to projects, nullable)
- title (text)
- model_id (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `messages`
Individual chat messages
```sql
- id (uuid, PK)
- conversation_id (uuid, FK to conversations)
- role (text) -- 'user' | 'assistant' | 'system'
- content (text)
- model_id (text)
- provider (text)
- tokens_used (integer)
- cost_usd (numeric)
- metadata (jsonb)
- created_at (timestamptz)
```

#### `memory_objects`
User memories (consent-based)
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- project_id (uuid, FK to projects, nullable)
- conversation_id (uuid, FK to conversations, nullable)
- content (text)
- scope (text) -- 'global' | 'project' | 'conversation_summary'
- status (text) -- 'proposed' | 'approved' | 'rejected'
- importance (integer) -- 1-5
- tags (text[])
- created_at (timestamptz)
- approved_at (timestamptz)
```

#### `memory_audit_log`
Audit trail for memory operations
```sql
- id (uuid, PK)
- memory_id (uuid, FK to memory_objects)
- user_id (uuid, FK to profiles)
- action (text) -- 'created' | 'approved' | 'rejected' | 'updated' | 'deleted' | 'exported'
- metadata (jsonb)
- created_at (timestamptz)
```

#### `generated_images`
Image generation history
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- prompt (text)
- image_url (text)
- model (text)
- cost_usd (numeric)
- created_at (timestamptz)
```

#### `usage_events`
Individual usage events
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- event_type (text) -- 'chat' | 'image' | 'research'
- model_id (text)
- provider (text)
- tokens_used (integer)
- cost_usd (numeric)
- meta (jsonb)
- created_at (timestamptz)
```

#### `usage_stats`
Daily usage aggregates
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- date (date)
- total_cost_usd (numeric)
- total_tokens (integer)
- message_count (integer)
- image_count (integer)
- research_count (integer)
```

### Additional Tables

- `user_model_settings` - AI model preferences
- `user_roles` - RBAC roles
- `anonymous_sessions` - Trial user tracking
- `conversation_summaries` - Auto-generated summaries
- `prompt_templates` - Reusable prompts
- `message_feedback` - User feedback on responses

### RLS Policies

**All tables have Row Level Security (RLS) enabled** with user-scoped policies:

```sql
CREATE POLICY "Users can access own data" ON table_name
  FOR ALL USING (auth.uid() = user_id);
```

---

## API & Edge Functions

### Edge Functions Overview

All Edge Functions are written in TypeScript for Deno and deployed via Supabase.

#### `chat` - AI Chat with Streaming
- **Auth**: Required (JWT)
- **Purpose**: Main chat endpoint with streaming responses
- **Features**:
  - Memory injection (approved memories only)
  - Multi-provider fallback
  - Automatic model routing
  - Usage tracking
  - Streaming support

#### `ai-gateway` - Multi-Provider AI Gateway
- **Auth**: Required (JWT or session)
- **Purpose**: Unified interface to multiple AI providers
- **Providers**:
  - Google Gemini (primary)
  - OpenAI (fallback)
  - Anthropic Claude
  - Thaura AI
- **Features**:
  - Provider fallback chain
  - Cost calculation
  - Error handling

#### `extract-memory` - Memory Extraction
- **Auth**: Required (JWT)
- **Purpose**: Extract potential memories from conversations
- **Features**:
  - Analyzes conversation context
  - Creates memory suggestions (status: 'proposed')
  - Filters sensitive data
  - Respects user consent

#### `generate-image` - Image Generation
- **Auth**: Required (JWT)
- **Purpose**: Generate images via DALL-E 3
- **Features**:
  - Prompt enhancement
  - Cost tracking
  - Image storage in Supabase

#### `research` - Web Research
- **Auth**: Required (JWT)
- **Purpose**: Perplexity-based web research
- **Features**:
  - Citation support
  - Multi-language queries
  - Source attribution

#### `summarize-conversation` - Conversation Summarization
- **Auth**: Required (JWT)
- **Purpose**: Auto-generate conversation summaries
- **Features**:
  - Extracts key points
  - Creates conversation memory
  - Max 300 characters

#### `export-data` - GDPR Data Export
- **Auth**: Required (JWT)
- **Purpose**: Export user data
- **Features**:
  - Complete data export
  - GDPR compliant
  - JSON format

#### `usage-stats` - Usage Analytics
- **Auth**: Required (JWT)
- **Purpose**: Retrieve usage statistics
- **Features**:
  - Daily aggregates
  - Cost breakdowns
  - Model usage stats

#### `health` - Health Check
- **Auth**: Not required
- **Purpose**: System health monitoring

### Edge Function Structure

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const supabase = createClient(...);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Function logic here
    const result = await processRequest(req, user);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

---

## Arabic-First Design Principles

### RTL Layout (CRITICAL)

**Always use logical CSS properties, never physical directional properties:**

```css
✅ CORRECT                 ❌ WRONG
ms-4 (margin-start)       ml-4 (margin-left)
me-4 (margin-end)         mr-4 (margin-right)
ps-4 (padding-start)      pl-4 (padding-left)
pe-4 (padding-end)        pr-4 (padding-right)
text-start                text-left
text-end                  text-right
start-0                   left-0
end-0                     right-0
```

**Directional icons** require `rtl:rotate-180` class:
```tsx
<ChevronLeft className="rtl:rotate-180" />
```

### Translations

**Files**: 
- `src/locales/en/translation.json`
- `src/locales/ar/translation.json`

**Usage**:
```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
return <h1>{t('chat.title')}</h1>;
```

**Namespacing Convention**:
- `chat.*` - Chat-related strings
- `memory.*` - Memory system strings
- `projects.*` - Project management strings
- `settings.*` - Settings page strings
- `common.*` - Shared UI strings

**Best Practices**:
- Always add both languages simultaneously
- Use descriptive keys
- Avoid hardcoded strings

### Arabic Processing Library

Located in `src/lib/arabic-processing.ts`

#### Detection Functions

```typescript
// Detect script type
detectScriptMode(text: string): 'arabic' | 'english' | 'mixed' | 'arabizi'

// Detect dialect with confidence
detectDialectWithConfidence(text: string): {
  dialect: 'msa' | 'egyptian' | 'gulf' | 'levantine' | 'maghrebi',
  confidence: 'high' | 'medium' | 'low',
  markers: string[]
}
```

#### Normalization (Conservative Approach)

```typescript
// Safe normalization
normalizeYaAtWordEnd(text: string)
fixPunctuation(text: string)

// Risky (disabled by default)
normalizeHamza(text: string)
normalizeTaMarbuta(text: string)
```

#### Numeral Conversion

```typescript
// ALWAYS use the safe version
applyNumeralPolicySafe(text: string, policy: 'eastern' | 'western' | 'auto')

// This protects:
// - Code blocks
// - URLs
// - UUIDs
// - Technical content
```

#### Bidi Isolation

**IMPORTANT**: 
- Do NOT apply Unicode isolates to stored text
- Use CSS-based isolation (`unicode-bidi: isolate`) at render time only

```tsx
// Correct approach
<div className="unicode-bidi-isolate">
  {mixedText}
</div>
```

---

## Memory System

### Core Principle

**Memory is NEVER stored without user approval.**

### Memory Lifecycle

1. **Extraction**: `extract-memory` function analyzes conversations
2. **Suggestion**: Creates memory with status `'proposed'`
3. **User Action**: User sees toast notification and can:
   - Approve (status → `'approved'`)
   - Edit then approve
   - Reject (status → `'rejected'`)
4. **Injection**: Only `'approved'` memories are injected into prompts

### Memory Scopes

#### Conversation Summary
- Auto-generated per conversation
- Max 300 characters
- Provides conversation context
- Does not require approval (metadata only)

#### Project Memory
- Requires user approval
- Scoped to specific project
- Max 5 per conversation retrieval
- Used in all conversations within project

#### Global Memory
- Requires user approval
- Applies to all conversations
- Max 3 per conversation retrieval
- Highest importance/relevance selected

### Retrieval Limits (Cost-Aware)

```typescript
const MEMORY_LIMITS = {
  maxProjectMemories: 5,
  maxGlobalMemories: 3,
  maxSummaryLength: 300
};
```

### Sensitive Data Filtering

The `extract-memory` function blocks:
- Credit card numbers
- Phone numbers
- Email addresses (in certain patterns)
- Passwords
- API keys
- Authentication tokens

### Audit Logging

All operations logged to `memory_audit_log`:
- `created` - Memory suggestion created
- `approved` - User approved memory
- `rejected` - User rejected memory
- `updated` - Memory edited
- `deleted` - Memory removed
- `exported` - Memory included in data export

---

## Dialect System

### Supported Dialects

| Dialect | Code | Region |
|---------|------|--------|
| Modern Standard Arabic | `msa` | Formal/Written |
| Egyptian Arabic | `egyptian` | Egypt |
| Gulf Arabic | `gulf` | Gulf states |
| Levantine Arabic | `levantine` | Syria, Lebanon, Jordan, Palestine |
| Maghrebi Arabic | `maghrebi` | Morocco, Algeria, Tunisia |

### Auto Mode (Recommended)

- Detects dialect from user messages
- Only applies if confidence is `high` (3+ dialect markers)
- Falls back to user preference otherwise
- Most natural user experience

### Dialect Settings

Settings can be configured at:
- **Profile Level**: Default for all conversations
- **Project Level**: Overrides profile settings for project conversations

#### Available Settings

```typescript
interface DialectSettings {
  dialect_preset: 'auto' | 'msa' | 'egyptian' | 'gulf' | 'levantine' | 'maghrebi';
  dialect_formality: 'auto' | 'formal' | 'casual';
  code_switch_mode: 'auto' | 'arabic_only' | 'english_only' | 'mixed';
  numeral_mode: 'auto' | 'eastern' | 'western';
}
```

### Policy Injection

Dialect settings are injected as policy blocks into system prompts:

```
VARIETY: Egyptian Arabic
GRAMMAR: Egyptian verb conjugations, negation with مش
TONE: Casual, conversational
NUMERALS: Eastern Arabic numerals (٠-٩)
CODE_SWITCHING: Allow natural mixing with English technical terms
```

**Note**: Use structured rules, NOT example phrases.

---

## AI Gateway & Model Routing

### Model Routing

#### Auto Mode
- **Fast Model**: For simple queries, quick responses
- **Deep Model**: For complex queries, detailed analysis
- Decision made by analyzing query complexity

#### Manual Mode
- User selects specific model
- Choice persisted in `user_model_settings`

### Routing Badge

Shows current model and routing mode in UI:
```tsx
<Badge>
  {mode === 'auto' ? '🤖 Auto' : '📌 Manual'} - {currentModel}
</Badge>
```

### Provider Fallback Chain

1. **Primary**: Google Gemini
2. **Fallback**: OpenAI
3. **Tertiary**: Anthropic Claude / Thaura

Fallback usage tracked in `usage_events.meta`

### Budget Enforcement

#### Soft Limits
- Session budget warnings
- Daily spending alerts
- Monthly budget notifications

#### Per-Project Limits
Configurable in project settings:
```typescript
interface ProjectBudget {
  daily_limit_usd: number;
  monthly_limit_usd: number;
  alert_threshold_percent: number;
}
```

### Provider Status

Settings page shows:
- Available providers
- Current status (active/down)
- Usage statistics per provider

---

## Development Setup

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: Latest version
- **Supabase CLI**: (Optional, for backend development)
- **Git**: For version control

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/mohamed-arabi16/arabic-spark-ai.git
   cd arabic-spark-ai
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   
   Create `.env` file in project root:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   Application runs at `http://localhost:8080`

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Backend Development (Edge Functions)

1. **Login to Supabase**
   ```bash
   supabase login
   ```

2. **Link Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Deploy Edge Function**
   ```bash
   supabase functions deploy function-name
   ```

4. **View Logs**
   ```bash
   supabase functions logs function-name
   ```

---

## Testing Strategy

### Unit Tests (Vitest)

Located in `src/__tests__/` and co-located with components.

**Key Test Files**:
- Arabic processing utilities
- Formatters and utilities
- Custom hooks (with React Testing Library)

**Run Tests**:
```bash
npm run test           # Single run
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

### E2E Tests (Playwright)

Located in `tests/` directory.

**Test Suites**:
- `auth.spec.ts` - Authentication flows
- `chat.spec.ts` - Chat functionality
- `dialect.spec.ts` - Dialect system
- `baseline.spec.ts` - Core functionality
- `regression.spec.ts` - Regression tests
- `verify_frontend.spec.ts` - Frontend verification

**Run E2E Tests**:
```bash
npx playwright test              # All tests
npx playwright test auth.spec.ts # Specific test
npx playwright test --ui         # UI mode
npx playwright test --debug      # Debug mode
```

### Testing Checklist

**E2E Flows to Verify**:
1. ✅ Auth: signup → login → protected route
2. ✅ Chat: send message → receive streaming response → memory suggestion → approve
3. ✅ Memory: approve → verify in Memory Bank → verify used in new conversation
4. ✅ Dialect: change preset → verify response style changes
5. ✅ RTL: full flow in Arabic → no layout breaks

**Arabic Verification**:
- Same prompt with MSA vs dialect preset → different appropriate outputs
- Code in response → numerals not converted
- Mixed Arabic/English → proper bidi rendering

---

## Security

### Authentication

- **Provider**: Supabase Auth
- **Methods**: Email + Password (auto-confirm enabled)
- **Tokens**: JWT-based with auto-refresh
- **Protected Routes**: Via `useAuth` hook

### Row Level Security (RLS)

**All database tables have RLS enabled.**

Example policy:
```sql
CREATE POLICY "Users can access own data"
  ON table_name
  FOR ALL
  USING (auth.uid() = user_id);
```

### Input Validation

- Zod schemas for form validation
- Server-side validation in Edge Functions
- XSS protection via React's built-in escaping
- SQL injection prevention via Supabase client

### Sensitive Data Protection

**Memory System Filters**:
- Credit card numbers
- Phone numbers
- Email addresses (in memory content)
- Passwords and API keys
- Authentication tokens

**Environment Variables**:
- Server secrets never exposed to client
- `VITE_` prefix for client-safe variables
- Service role key only in Edge Functions

### CORS Configuration

All Edge Functions include CORS headers:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

### Security Headers

Recommended headers for production:
```
Content-Security-Policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
```

---

## Deployment

### Frontend Deployment

#### Build for Production

```bash
npm run build
```

Output directory: `dist/`

#### Supported Platforms

- **Netlify**: Drag & drop `dist/` folder
- **Vercel**: Connect GitHub repo, auto-deploy
- **Lovable**: Native deployment platform
- **Any Static Host**: Upload `dist/` contents

#### Environment Variables

Set in deployment platform:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

### Backend Deployment (Supabase)

#### Database Migrations

```bash
# Apply pending migrations
supabase db push

# Create new migration
supabase migration new migration_name
```

#### Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy function-name

# Set secrets
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set GOOGLE_API_KEY=your_key
```

#### Required Secrets

```bash
OPENAI_API_KEY          # OpenAI API access
GOOGLE_API_KEY          # Google Gemini access
ANTHROPIC_API_KEY       # Anthropic Claude access
THAURA_API_KEY          # Thaura AI access
PERPLEXITY_API_KEY      # Research API
ELEVENLABS_API_KEY      # Voice transcription (optional)
```

### Deployment Checklist

#### Pre-deployment
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Edge functions deployed
- [ ] Secrets configured
- [ ] SSL certificate valid
- [ ] Domain configured

#### Post-deployment
- [ ] Health checks passing (`/health` endpoint)
- [ ] Authentication working
- [ ] Chat functionality working
- [ ] Image generation working
- [ ] Research mode working
- [ ] Memory system working

### Production Readiness

Refer to `PRODUCTION_READINESS.md` for comprehensive checklist including:
- Security hardening
- Monitoring setup
- Performance optimization
- Error tracking
- Load testing

---

## Common Patterns & Best Practices

### 1. Component Structure

```tsx
// Imports
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Types
interface ComponentProps {
  // ...
}

// Component
export const Component = ({ prop }: ComponentProps) => {
  const { t } = useTranslation();
  
  // Hooks
  // State
  // Effects
  
  // Handlers
  
  // Render
  return (
    <div className="ms-4 text-start">
      {/* RTL-safe layout */}
    </div>
  );
};
```

### 2. Custom Hooks

```typescript
export const useCustomHook = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['key'],
    queryFn: async () => {
      // Fetch logic
    },
  });
  
  return { data, isLoading, error };
};
```

### 3. API Calls

```typescript
const { data } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### 4. Error Handling

```typescript
try {
  await performAction();
  toast.success(t('common.success'));
} catch (error) {
  console.error('Error:', error);
  toast.error(t('common.error'));
}
```

### 5. Accessibility

```tsx
// Icon-only buttons need aria-label
<Tooltip>
  <TooltipTrigger asChild>
    <button aria-label={t('chat.send')}>
      <Send className="h-4 w-4" />
    </button>
  </TooltipTrigger>
  <TooltipContent>{t('chat.send')}</TooltipContent>
</Tooltip>
```

### 6. Loading States

```tsx
import { Skeleton } from '@/components/ui/skeleton';

{isLoading ? (
  <Skeleton className="h-10 w-full" />
) : (
  <Content />
)}
```

### 7. Memoization

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(input);
}, [input]);

const MemoizedComponent = React.memo(Component);
```

---

## Common Mistakes to Avoid

### ❌ RTL Mistakes

```css
❌ ml-4, mr-4, text-left, text-right
✅ ms-4, me-4, text-start, text-end
```

### ❌ Numeral Conversion

```typescript
❌ applyNumeralPolicy(text)        // Not safe
✅ applyNumeralPolicySafe(text)    // Protects code/URLs
```

### ❌ Memory Auto-Approval

```typescript
❌ Memory created with status 'approved'
✅ Memory created with status 'proposed', user approves
```

### ❌ Bidi Text Storage

```typescript
❌ Storing Unicode bidi isolates in database
✅ CSS-based isolation at render time only
```

### ❌ Direct AI Calls from Frontend

```typescript
❌ fetch('https://api.openai.com/v1/chat/completions')
✅ supabase.functions.invoke('chat', { ... })
```

### ❌ Tables Without RLS

```sql
❌ CREATE TABLE without RLS policies
✅ CREATE TABLE + RLS enabled + appropriate policies
```

### ❌ Hardcoded Strings

```tsx
❌ <h1>Chat</h1>
✅ <h1>{t('chat.title')}</h1>
```

---

## Troubleshooting

### Common Issues

#### Chat Not Responding

**Symptoms**: Messages sent but no response

**Troubleshooting**:
1. Check Edge Function logs: `supabase functions logs chat`
2. Verify AI provider API keys are set
3. Check API quota/credits
4. Verify network connectivity

#### Images Failing to Generate

**Symptoms**: Image generation returns error

**Troubleshooting**:
1. Check `generate-image` function logs
2. Verify `OPENAI_API_KEY` is valid
3. Check OpenAI account credits
4. Verify prompt doesn't violate content policy

#### Database Error in UI

**Symptoms**: "Database error" toast notification

**Troubleshooting**:
1. Verify user is authenticated
2. Check RLS policies allow the operation
3. Review Edge Function logs for SQL errors
4. Verify database schema matches client expectations

#### RTL Layout Broken

**Symptoms**: UI elements misaligned in Arabic

**Troubleshooting**:
1. Check for physical directional properties (ml-, mr-, left-, right-)
2. Verify `dir` attribute on html element
3. Check for `!important` overrides breaking RTL
4. Test in both LTR and RTL modes

#### Memory Not Being Injected

**Symptoms**: Memories approved but not used in chat

**Troubleshooting**:
1. Verify memory status is 'approved'
2. Check memory scope matches conversation context
3. Review retrieval limits (max 5 project, 3 global)
4. Check conversation has proper project association

### Debug Mode

Enable debug logging:
```typescript
// In Edge Functions
console.log('Debug:', { variable });

// In Frontend
console.debug('Component state:', state);
```

### Performance Issues

#### Slow Chat Responses

- Check network latency
- Verify streaming is working
- Review model selection (fast vs deep)
- Check for memory retrieval bottlenecks

#### Slow Page Loads

- Check bundle size: `npm run build` and review `dist/` sizes
- Implement code splitting for large components
- Lazy load heavy dependencies (charts, markdown)
- Optimize images

---

## File Organization

```
arabic-spark-ai/
├── src/
│   ├── components/
│   │   ├── chat/          # Chat UI (ChatInput, ChatMessage, ModelPicker)
│   │   ├── common/        # Shared components (EmptyState, ErrorBoundary)
│   │   ├── layout/        # App shell (MainLayout, Header, Sidebar)
│   │   ├── memory/        # Memory UI (MemoryList, MemorySuggestion)
│   │   ├── mobile/        # Mobile-specific components
│   │   ├── projects/      # Project management UI
│   │   ├── research/      # Research mode UI
│   │   ├── settings/      # Settings page components
│   │   ├── ui/            # Shadcn primitives (DO NOT MODIFY directly)
│   │   └── usage/         # Usage tracking UI
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.tsx
│   │   ├── useConversations.ts
│   │   ├── useMemory.ts
│   │   ├── useProjects.ts
│   │   └── ...
│   │
│   ├── lib/               # Utility functions
│   │   ├── arabic-processing.ts  # Arabic text processing
│   │   ├── api-utils.ts          # API helpers
│   │   ├── error-handling.ts     # Error utilities
│   │   ├── utils.ts              # General utilities
│   │   └── ...
│   │
│   ├── locales/           # i18n translations
│   │   ├── ar/
│   │   │   └── translation.json
│   │   └── en/
│   │       └── translation.json
│   │
│   ├── pages/             # Route pages
│   │   ├── Auth.tsx
│   │   ├── Chat.tsx
│   │   ├── Memory.tsx
│   │   ├── Settings.tsx
│   │   └── ...
│   │
│   └── integrations/      # External service integrations
│       └── supabase/      # Supabase client (AUTO-GENERATED)
│
├── supabase/
│   ├── functions/         # Edge Functions (Deno TypeScript)
│   │   ├── chat/
│   │   ├── extract-memory/
│   │   ├── generate-image/
│   │   ├── research/
│   │   └── ...
│   │
│   └── migrations/        # Database migrations (SQL)
│
├── tests/                 # E2E tests (Playwright)
│   ├── auth.spec.ts
│   ├── chat.spec.ts
│   └── ...
│
└── public/               # Static assets
```

---

## Additional Resources

### Documentation Files

- **README.md**: Project knowledge and guidelines
- **CONTRIBUTING.md**: Contribution guidelines
- **ENV_VARS.md**: Environment variables reference
- **PRODUCTION_READINESS.md**: Production deployment checklist
- **agent.md**: This file - comprehensive agent documentation

### External Documentation

- [Supabase Docs](https://supabase.com/docs)
- [React Router Docs](https://reactrouter.com/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Shadcn/UI Docs](https://ui.shadcn.com/)
- [i18next Docs](https://www.i18next.com/)

### Support

For support or questions:
1. Review this documentation
2. Check existing GitHub issues
3. Create a new issue with:
   - Clear description
   - Steps to reproduce (if bug)
   - Expected vs actual behavior
   - Screenshots (if applicable)

---

## Appendix: Key Configuration Files

### `package.json`
Main project configuration with dependencies and scripts

### `vite.config.ts`
Vite build configuration

### `tsconfig.json`
TypeScript compiler configuration

### `tailwind.config.ts`
Tailwind CSS configuration with custom theme

### `supabase/config.toml`
Supabase project configuration

### `.env.example`
Template for environment variables

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-14  
**Maintained By**: Arabic Spark AI Team
