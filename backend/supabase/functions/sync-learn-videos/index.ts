import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Retired launch-compatibility endpoint. Its predecessor let any authenticated
// user trigger service-role writes into a table that is not part of the live
// RefLab contract. Administration uses sync-video-scenarios instead.
serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(JSON.stringify({
    error: 'This legacy video sync endpoint has been retired.',
    code: 'LEGACY_VIDEO_ENDPOINT_RETIRED',
  }), {
    status: 410,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
