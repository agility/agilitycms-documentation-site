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
        console.log(cat, icons)
        
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
        <div className="relative pb-32 bg-gray-100">
            <div className="absolute inset-0">
            {/* <img
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1525130413817-d45c1d127c42?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1920&q=60&&sat=-100"
                alt=""
            /> */}
            
            </div>
            <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
            <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">{fields.title}</h1>
            <p className="text-center mt-6 text-xl text-gray-700">
                {fields.subTitle}
            </p>
            </div>
        </div>

        {/* Overlapping cards */}
        <section
            className="-mt-32 max-w-7xl mx-auto relative z-10 pb-32 px-4 sm:px-6 lg:px-8"
            aria-labelledby="contact-heading"
        >
            <h2 className="sr-only" id="hero-heading">
            {fields.title}
            </h2>
            <div className="grid grid-cols-1 gap-y-20 lg:grid-cols-4 lg:gap-y-0 lg:gap-x-8">
            {supportLinks.map((link) => (
                <div key={link.name} className="flex flex-col bg-white rounded-2xl shadow-xl">
                    <Link href={link.href}>
                        <a>
                        <div className="flex-1 relative pt-16 px-6 pb-8 md:px-8">
                            <div className="absolute top-0 p-5 inline-block bg-indigo-600 rounded-xl shadow-lg transform -translate-y-1/2">
                                <link.icon className="h-6 w-6 text-white" aria-hidden="true" />
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
