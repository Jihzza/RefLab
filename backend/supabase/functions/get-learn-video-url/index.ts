import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Retired launch-compatibility endpoint. The previous deployed implementation
// queried the non-existent video_decision table with a service-role client.
// Keeping an explicit authenticated tombstone is safer for older clients than
// leaving that privileged implementation live or returning an ambiguous 404.
serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(JSON.stringify({
    error: 'This legacy video endpoint has been retired.',
    code: 'LEGACY_VIDEO_ENDPOINT_RETIRED',
  }), {
    status: 410,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
