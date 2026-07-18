import { useEffect, useState } from 'react'
import { supabaseBrowserConfiguration } from '@/lib/supabaseClient'
import { createSignedMessageMediaUrl } from '../api/messagesApi'

const SIGNED_URL_TTL_SECONDS = 3600
const SIGNED_URL_REFRESH_MS = 50 * 60 * 1000

function configuredSupabaseOrigin(): string | null {
  try {
    return new URL(supabaseBrowserConfiguration.url).origin
  } catch {
    return null
  }
}

const SUPABASE_ORIGIN = configuredSupabaseOrigin()

function isSafeStoragePath(value: string): boolean {
  if (!value || value.length > 1024 || value.startsWith('/') || value.includes('\\')) {
    return false
  }
  const segments = value.split('/')
  return segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

export function normalizeMessageStoragePath(
  pathOrUrl: string,
  supabaseOrigin: string | null = SUPABASE_ORIGIN,
): string | null {
  if (pathOrUrl.startsWith('blob:')) return null
  if (!/^[a-z][a-z\d+.-]*:/i.test(pathOrUrl)) {
    return isSafeStoragePath(pathOrUrl) ? pathOrUrl : null
  }

  try {
    const url = new URL(pathOrUrl)
    if (!supabaseOrigin || url.origin !== supabaseOrigin) return null
    const markers = [
      '/storage/v1/object/public/message-media/',
      '/storage/v1/object/authenticated/message-media/',
      '/storage/v1/object/sign/message-media/',
    ]
    const marker = markers.find((value) => url.pathname.startsWith(value))
    if (!marker) return null
    const storagePath = decodeURIComponent(url.pathname.slice(marker.length))
    return isSafeStoragePath(storagePath) ? storagePath : null
  } catch {
    return null
  }
}

export function useMessageMediaUrl(pathOrUrl: string | null) {
  const [state, setState] = useState<{
    source: string | null
    url: string | null
    error: string | null
  }>({ source: null, url: null, error: null })

  useEffect(() => {
    let cancelled = false
    let refreshTimer: number | null = null

    if (!pathOrUrl) return
    if (pathOrUrl.startsWith('blob:')) {
      queueMicrotask(() => {
        if (!cancelled) setState({ source: pathOrUrl, url: pathOrUrl, error: null })
      })
      return () => {
        cancelled = true
      }
    }

    const storagePath = normalizeMessageStoragePath(pathOrUrl)
    if (!storagePath) {
      // Historical RefLab uploads were stored as bucket-relative paths (or as
      // Supabase Storage URLs that normalize back to one). Never auto-load an
      // arbitrary legacy URL: it could disclose the viewer's network metadata
      // to an unreviewed host. The database value remains intact for an audited
      // migration/recovery path.
      queueMicrotask(() => {
        if (!cancelled) {
          setState({
            source: pathOrUrl,
            url: null,
            error: 'Message media is unavailable.',
          })
        }
      })
      return () => {
        cancelled = true
      }
    }

    const sign = async () => {
      const { data, error } = await createSignedMessageMediaUrl(
        storagePath,
        SIGNED_URL_TTL_SECONDS,
      )
      if (cancelled) return
      setState({
        source: pathOrUrl,
        url: data,
        error: error?.message ?? (data ? null : 'Message media is unavailable.'),
      })
      if (data) {
        refreshTimer = window.setTimeout(() => void sign(), SIGNED_URL_REFRESH_MS)
      }
    }

    void sign()

    return () => {
      cancelled = true
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
    }
  }, [pathOrUrl])

  return {
    url: state.source === pathOrUrl ? state.url : null,
    error: state.source === pathOrUrl ? state.error : null,
    isLoading: Boolean(pathOrUrl) && state.source !== pathOrUrl,
  }
}
