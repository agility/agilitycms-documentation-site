/* This example requires Tailwind CSS v2.0+ */
import { LibraryIcon, PencilAltIcon, TerminalIcon, ShieldCheckIcon } from '@heroicons/react/outline'
import Link from 'next/link'

const icons = {
    LibraryIcon,
    PencilAltIcon,
    TerminalIcon,
    ShieldCheckIcon
}

export default function HeroCategories({ module }) {
    const { fields } = module;
    
    const supportLinks = fields.categories.map((cat) => {
        
        
        return {
            name: cat.fields.title,
            href: cat.fields.landingPage.href,
            icon: icons[cat.fields.icon],
            description: cat.fields.subTitle
        }
    })
    return (
        <div className="bg-white">
        {/* Header */}
        <div className="relative pb-32 bg-gray-900">
            <div className="absolute inset-0">
                {/* <img
                    className=""
                    src="/docs/assets/bg.png"
                    alt=""
                /> */}
            </div>
            <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
            <h1 className="text-center text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">{fields.title}</h1>
            <p className="text-center mt-6 text-xl text-white">
                {fields.subTitle}
            </p>
            </div>
        </div>

        {/* Overlapping cards */}
        <section
            className="-mt-32 mb-10 max-w-7xl mx-auto relative z-10 pb-14 px-4 sm:px-6 lg:px-8"
            aria-labelledby="contact-heading"
        >
            <h2 className="sr-only" id="hero-heading">
            {fields.title}
            </h2>
            <div className="grid grid-cols-1 gap-y-20 lg:grid-cols-4 lg:gap-y-0 lg:gap-x-8">
            {supportLinks.map((link) => (
                <div key={link.name} className="flex flex-col bg-white rounded-2xl shadow-xl group">
                    <Link href={link.href}>
                        <a>
                        <div className="flex-1 text-center relative pt-16 px-6 pb-8 md:px-8">
                            <div className="absolute top-0 text-white p-5 inline-block bg-purple-800 group-hover:bg-purple-600 transition-colors rounded-xl shadow-lg transform -translate-y-1/2 -translate-x-1/2 left-1/2">
                                <link.icon className="h-8 w-8" aria-hidden="true" />
                            </div>
                            <h3 className="text-xl font-medium text-gray-900">{link.name}</h3>
                            <p className="mt-4 text-base text-gray-500">{link.description}</p>
                        </div>
                        </a>
                    </Link>
                </div>
            ))}
            </div>
        </section>
        </div>
    )
}
