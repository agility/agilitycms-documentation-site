/* This example requires Tailwind CSS v2.0+ */


export default function HeroHeading({ module }) {
    const { fields } = module;
    
    return (
    <div className="bg-white">
        {/* Header */}
        <div className="relative">
            <div className="absolute inset-0">
            {/* <img
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1525130413817-d45c1d127c42?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1920&q=60&&sat=-100"
                alt=""
            /> */}
            
            </div>
            <div className="relative max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
                <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">{fields.title}</h1>
                <p className="text-center mt-6 text-xl text-gray-700">
                    {fields.subTitle}
                </p>
            </div>
        </div>
    </div>

    )
}
