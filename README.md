# AI Workspace

AI Workspace is a comprehensive application designed to streamline project management, facilitate image generation, and provide intelligent conversational assistance with persistent memory.

## Project Purpose

The goal of AI Workspace is to provide a unified interface for:
- **Project Management**: Organize and track tasks and projects.
- **AI Chat**: Interact with a GPT-5.2 powered assistant that retains context and memory across sessions.
- **Image Generation**: Generate images using AI models directly within the workspace.
- **Usage Tracking**: Monitor API usage and credits.

## Architecture

The project follows a modern client-server architecture:

### Frontend
- **Framework**: React with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: React Query (`@tanstack/react-query`) & URL-based state
- **Routing**: React Router

### Backend (Supabase)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Serverless Logic**: Supabase Edge Functions
    - `chat`: Handles AI conversation logic (GPT-5.2).
    - `extract-memory`: Processes chat history to extract and store long-term memories.
    - `generate-image`: Interfaces with image generation APIs.
    - `usage-stats`: Tracks user consumption of AI resources.
- **Storage**: Supabase Storage for assets.

## Environment Variables

The application requires the following environment variables.

### Frontend
These should be set in your deployment environment or a `.env` file for local development.

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | The URL of your Supabase project. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The anonymous public key for your Supabase project. |

### Backend (Edge Functions)
Edge functions require their own set of secrets, managed via the Supabase Dashboard or CLI.

## Setup & Installation

### Prerequisites
- Node.js (v18+)
- npm
- Supabase CLI (optional, for backend development)

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

## Build & Deployment

### Frontend

To build the application for production:

```bash
npm run build
```

The output will be in the `dist/` directory. You can deploy this directory to any static hosting provider like **Netlify**, **Vercel**, or **Lovable**.

### Backend (Supabase)

To deploy Edge Functions:

```bash
supabase functions deploy
```

Ensure you are logged in via `supabase login` and linked to the correct project.

## Security Requirements

- **Row Level Security (RLS)**: All database tables must have RLS enabled. Policies should ensure users can only access their own data.
- **Authentication**: All Edge Functions (except potentially public webhooks) must verify the `Authorization` header using `supabase.auth.getUser()`.
- **Secrets Management**: Never commit API keys (OpenAI, etc.) to the repository. Store them in Supabase Secrets.

## Localization (i18n) & RTL

The application supports English (`en`) and Arabic (`ar`) with full RTL (Right-to-Left) layout support.

### Adding Translations
- Translation files are located in `src/locales/{lang}/translation.json`.
- Organize keys by namespaces (e.g., `dashboard`, `chat`, `projects`).
- Use `t('namespace.key')` in components.

### RTL Guidelines
- Use **Logical Properties** in Tailwind CSS:
    - `ms-` (margin-start) instead of `ml-`
    - `me-` (margin-end) instead of `mr-`
    - `ps-` (padding-start) instead of `pl-`
    - `text-start` / `text-end` instead of `text-left` / `text-right`
- Icons should generally *not* be manually flipped unless they denote direction (like back arrows). Use `rtl:rotate-180` for directional icons.

## Operational Playbooks

### Monitoring
- **Frontend**: Use your hosting provider's analytics (e.g., Netlify Analytics) to monitor client-side errors and traffic.
- **Backend**: Use the [Supabase Dashboard](https://supabase.com/dashboard) to:
    - Monitor Database health (CPU, RAM).
    - View Edge Function logs for errors in chat or image generation.
    - Check Storage usage.

### Alerts
- Set up alerts in Supabase for database downtimes or high error rates in Edge Functions.

### Backups
- The project relies on Supabase's automatic daily backups for the database.
- For critical data, consider enabling Point-in-Time Recovery (PITR) in Supabase project settings.

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
