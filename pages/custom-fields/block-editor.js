import Head from 'next/head'
import dynamic from 'next/dynamic'

const BlockEditor = dynamic(
  () => import('../../components/custom-fields/BlockEditor'),
  { ssr: false }
)

export default function BlockEditorPage() {
    const noScrollBars = `html, body { overflow: hidden }`;
    return (
        <div>
        <Head>
            <title>Block Editor for Agility CMS (next js)</title>
            <meta name="description" content="Block Editor for Agility CMS" />
            <link rel="icon" href="/favicon.ico" />
            <style>
                {noScrollBars}
            </style>
        </Head>

        <main>
            <BlockEditor />
        </main>
        </div>
    )
}


  
