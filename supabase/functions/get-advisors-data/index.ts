import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdvisorsData {
  required_categories: string[];
  projects: Array<{
    Project: string;
    Advisors: string[];
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching advisors data from storage...');

    // Fetch from private storage bucket
    const { data, error } = await supabaseClient.storage
      .from('json')
      .download('advisors_projects_full.json');

    if (error) {
      console.error('Storage error:', error);
      throw new Error(`Failed to fetch file: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data received from storage');
    }

    // Convert blob to text and parse JSON
    const text = await data.text();
    const jsonData: AdvisorsData = JSON.parse(text);

    console.log('Successfully fetched advisors data');

    return new Response(JSON.stringify(jsonData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-advisors-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        // Fallback data structure
        required_categories: [],
        projects: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});