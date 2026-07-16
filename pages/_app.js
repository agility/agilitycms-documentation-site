import '../styles/lightfair.css'
import '../styles/globals.css'
import '../styles/nprogress.css'


import { Mulish, Inder, Fira_Mono } from 'next/font/google'
import classNames from "classnames";

// If loading a variable font, you don't need to specify the font weight
const mulish = Mulish({
  subsets: ['latin'],
  display: 'auto',
  variable: '--font-mulish',
})

// Ocean heading face — Inder ships a 400 weight only (handoff gotcha:
// bolder headings are browser-synthesized; that matches the mockup).
const inder = Inder({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-inder',
})

const firaMono = Fira_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-fira-mono',
})

function MyApp({ Component, pageProps }) {
  return <main className={classNames(mulish.variable, inder.variable, firaMono.variable)}><Component {...pageProps} /></main>
}

export default MyApp
