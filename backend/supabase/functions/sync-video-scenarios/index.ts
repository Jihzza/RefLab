import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * sync-video-scenarios
 *
 * Lists all files in the "Learn Videos" storage bucket and inserts
 * a new row into video_scenarios for each file not already tracked.
 *
 * New rows are created with:
 *   - video_url = filename
 *   - title = filename without extension, formatted as title case
 *   - correct_decision = 'TBD' (must be updated before activating)
 *   - is_active = false (won't appear in the app until configured)
 *
 * Usage:
 *   POST /functions/v1/sync-video-scenarios
 *
 * After syncing, go to the Supabase Table Editor and update:
 *   - title, description, topic, correct_decision
 *   - Set is_active = true when ready
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BUCKET = 'learn-videos'

/** Convert "penalty-area-challenge.mp4" → "Penalty Area Challenge" */
function filenameToTitle(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')           // strip extension
    .replace(/[-_]/g, ' ')             // dashes/underscores → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // title case
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 1. List all files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } })

    if (listError) {
      throw new Error(`Failed to list bucket: ${listError.message}`)
    }

    // Filter to video files only
    const videoFiles = (files ?? []).filter((f) =>
      f.name && /\.(mp4|mov|webm|mkv)$/i.test(f.name)
    )

    if (videoFiles.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, message: 'No video files found in bucket' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Get existing video_urls from the table
    const { data: existing, error: fetchError } = await supabase
      .from('video_scenarios')
      .select('video_url')

    if (fetchError) {
      throw new Error(`Failed to fetch existing scenarios: ${fetchError.message}`)
    }

    const existingUrls = new Set((existing ?? []).map((r: { video_url: string }) => r.video_url))

    // 3. Find new files (not yet in the table)
    const newFiles = videoFiles.filter((f) => !existingUrls.has(f.name))

    if (newFiles.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, message: 'All videos already synced' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 4. Insert new rows
    const rows = newFiles.map((f) => ({
      video_url: f.name,
      title: filenameToTitle(f.name),
      correct_action: 'TBD',
      correct_sanction: 'No card',
      is_active: false,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('video_scenarios')
      .insert(rows)
      .select('id, title, video_url')

    if (insertError) {
      throw new Error(`Failed to insert scenarios: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({
        synced: inserted?.length ?? 0,
        scenarios: inserted,
        message: `${inserted?.length ?? 0} new scenario(s) created. Set correct_action, correct_sanction, topic, and is_active=true in the Table Editor.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
