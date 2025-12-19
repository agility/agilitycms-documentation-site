'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import nProgress from 'nprogress'
import { Intercom } from '@intercom/messenger-js-sdk'

/**
 * Client-side features wrapper
 * Handles Intercom, progress bar, and scroll behavior
 */
export default function ClientFeatures({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Initialize Intercom
  useEffect(() => {
    Intercom({
      app_id: 'fj9g3mkl',
    })
  }, [])

  // Handle route changes: scroll to top and show progress
  useEffect(() => {
    // Scroll to top on route change
    const $scrollContainer = document.getElementById('ScrollContainer')
    if ($scrollContainer) {
      $scrollContainer.scrollTop = 0
    }

    // Show progress bar
    nProgress.start()
    const timer = setTimeout(() => {
      nProgress.done()
    }, 100)

    return () => {
      clearTimeout(timer)
      nProgress.done()
    }
  }, [pathname])

  return <>{children}</>
}
