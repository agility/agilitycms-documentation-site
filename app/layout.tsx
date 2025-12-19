import '../styles/lightfair.css'
import '../styles/globals.css'
import '../styles/nprogress.css'

import { Mulish } from 'next/font/google'
import type { Metadata } from 'next'
import type React from 'react'
import { GoogleTagManager } from '@next/third-parties/google'
import Header from '../components/common/Header'
import ClientFeatures from '../components/common/ClientFeatures'
import { getHeaderContent } from '../lib/cms-content/getHeaderContent'
import { getFooterContent } from '../lib/cms-content/getFooterContent'
import { getMainMenuLinks } from '../lib/cms-content/getMainMenuLinks'
import { getMarketingContent } from '../lib/cms-content/getMarketingContent'

// If loading a variable font, you don't need to specify the font weight
const mulish = Mulish({
  subsets: ['latin'],
  display: 'auto',
  variable: '--font-mulish',
})

export const metadata: Metadata = {
  title: {
    template: '%s',
    default: 'Agility CMS Documentation'
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Get locale (single locale for now, but pass to functions for future multi-locale support)
  const locale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us'

  // Fetch all global data in parallel
  const [headerContent, footerContent, mainMenuLinks, marketingContent] = await Promise.all([
    getHeaderContent({ locale }),
    getFooterContent({ locale }),
    getMainMenuLinks({ locale }),
    getMarketingContent({ locale }),
  ])

  // Build preHeader from header content
  const preHeader = headerContent ? {
    showPreHeader: headerContent.showPreHeader,
    signInLink: headerContent.signInLink,
    documentationLink: headerContent.documentationLink,
  } : null

  return (
    <html lang="en" className={mulish.variable} suppressHydrationWarning>
      <body>
        <GoogleTagManager gtmId="GTM-NJW8WMX" />
        <ClientFeatures>
          <div id="SiteWrapper" className="h-full font-muli">
            <div id="Site" className="flex flex-col h-full">
              <Header
                mainMenuLinks={mainMenuLinks}
                primaryDropdownLinks={headerContent?.primaryDropdownLinks || []}
                secondaryDropdownLinks={headerContent?.secondaryDropdownLinks || []}
                marketingContent={marketingContent}
                preHeader={preHeader}
              />
              {children}
            </div>
          </div>
        </ClientFeatures>
      </body>
    </html>
  )
}
