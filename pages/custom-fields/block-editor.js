import Head from 'next/head'
import dynamic from 'next/dynamic'

const BlockEditor = dynamic(
  () => import('../../components/custom-fields/BlockEditor'),
  { ssr: false }
)

export default function BlockEditorPage() {
    const noScrollBars = `html, body { overflow: hidden }`;
    const boldHeaders = `h1, h2, h3, h4, h5, h6 { font-weight: bold!important}`
    const defaultHeaderStyles = `h1 { font-size: 2rem!important } h2 { font-size: 1.5rem!important } h3 { font-size: 1.17rem!important } h4 { font-size: 1rem!important } h5 { font-size: 0.83rem} h6 { font-size: 0.67rem}`;
    return (
        <div>
        <Head>
            <title>Block Editor for Agility CMS (next js)</title>
            <meta name="description" content="Block Editor for Agility CMS" />
            <link rel="icon" href="/favicon.ico" />
            <style>
                {noScrollBars}
                {boldHeaders}
                {defaultHeaderStyles}
            </style>
        </Head>

        <main>
            <BlockEditor />
        </main>
        </div>
    )
}


  
