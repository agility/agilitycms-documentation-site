import '../styles/lightfair.css'
import '../styles/globals.css'
import '../styles/nprogress.css'


import { Mulish } from 'next/font/google'
import classNames from "classnames";

// If loading a variable font, you don't need to specify the font weight
const mulish = Mulish({
  subsets: ['latin'],
  display: 'auto',
  variable: '--font-mulish',
})


function MyApp({ Component, pageProps }) {
  return <main className={mulish.variable}><Component {...pageProps} /></main>
}

export default MyApp
