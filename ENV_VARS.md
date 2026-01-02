# Environment Variables

## Server-Only Variables (DO NOT EXPOSE TO CLIENT)
These variables should only be used in Supabase Edge Functions or server-side code.
* `OPENAI_API_KEY`: The API key for OpenAI.
* `SUPABASE_SERVICE_ROLE_KEY`: Service role key for Supabase (admin access).
* `SUPABASE_DB_URL`: Direct database connection string.

## Client-Side Variables (VITE_ prefixed)
These variables are safe to expose to the client.
* `VITE_SUPABASE_URL`: The URL of your Supabase project.
* `VITE_SUPABASE_PUBLISHABLE_KEY`: The publishable key for your Supabase project.

## Notes
* `SUPABASE_ANON_KEY`: In Supabase Edge Functions, this is automatically injected via `Deno.env.get('SUPABASE_ANON_KEY')`. It is also often used as `VITE_SUPABASE_PUBLISHABLE_KEY` on the frontend.
