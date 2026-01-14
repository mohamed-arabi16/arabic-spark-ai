/**
 * Export Data Edge Function
 * 
 * GDPR-compliant data export functionality.
 * Exports user's memories, conversations, and messages in JSON format.
 * Creates an audit log entry for compliance tracking.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  include_memories?: boolean;
  include_conversations?: boolean;
  include_messages?: boolean;
  format?: 'json' | 'csv';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      include_memories = true, 
      include_conversations = true, 
      include_messages = true,
      format = 'json'
    }: ExportRequest = await req.json();

    console.log(`Export request from user ${user.id} - memories: ${include_memories}, conversations: ${include_conversations}, messages: ${include_messages}`);

    const exportData: Record<string, any> = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
    };

    // Export memories
    if (include_memories) {
      const { data: memories, error: memError } = await supabase
        .from('memory_objects')
        .select('*')
        .order('created_at', { ascending: false });

      if (memError) {
        console.error('Error fetching memories:', memError);
      } else {
        exportData.memories = memories || [];
        console.log(`Exported ${memories?.length || 0} memories`);
      }
    }

    // Export conversations
    if (include_conversations) {
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (convError) {
        console.error('Error fetching conversations:', convError);
      } else {
        exportData.conversations = conversations || [];
        console.log(`Exported ${conversations?.length || 0} conversations`);
      }
    }

    // Export messages
    if (include_messages) {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000); // Limit to prevent huge exports

      if (msgError) {
        console.error('Error fetching messages:', msgError);
      } else {
        exportData.messages = messages || [];
        console.log(`Exported ${messages?.length || 0} messages`);
      }
    }

    // Create audit log entry for export
    try {
      await supabase.from('memory_audit_log').insert({
        user_id: user.id,
        action: 'exported',
        metadata: {
          include_memories,
          include_conversations,
          include_messages,
          memory_count: exportData.memories?.length || 0,
          conversation_count: exportData.conversations?.length || 0,
          message_count: exportData.messages?.length || 0,
        }
      });
      console.log('Audit log entry created for export');
    } catch (auditError) {
      console.error('Failed to create audit log entry:', auditError);
    }

    // Return as JSON (CSV conversion can be done client-side if needed)
    return new Response(
      JSON.stringify(exportData, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="bayt-al-lisan-export-${new Date().toISOString().split('T')[0]}.json"`
        } 
      }
    );

  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});