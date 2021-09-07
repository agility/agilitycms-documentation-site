/* This example requires Tailwind CSS v2.0+ */
const navigation = {
    main: [
      { name: 'Get Support', href: 'https://help.agilitycms.com/hc/en-us/requests/new' },
      { name: 'Platform Status', href: 'https://status.agilitycms.com/' },
      { name: 'Product Roadmap', href: 'https://roadmap.agilitycms.com/' },
      { name: 'Join Community', href: 'https://agilitycms-community.slack.com/join/shared_invite/enQtNzI2NDc3MzU4Njc2LWI2OTNjZTI3ZGY1NWRiNTYzNmEyNmI0MGZlZTRkYzI3NmRjNzkxYmI5YTZjNTg2ZTk4NGUzNjg5NzY3OWViZGI#/' },
      { name: 'Back to Main Site', href: 'https://agilitycms.com/' },
    ]
  }
  
const Footer = () => {
    return (
        <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
            <nav className="-mx-5 -my-2 flex flex-wrap justify-center" aria-label="Footer">
            {navigation.main.map((item) => (
                <div key={item.name} className="px-5 py-2">
                <a href={item.href} rel="noreferrer" className="text-base text-gray-500 hover:text-gray-900">
                    {item.name}
                </a>
                </div>
            ))}
            </nav>
            <p className="mt-8 text-center text-base text-gray-400">&copy; 2021 Agility Inc. All rights reserved.</p>
        </div>
        </footer>
    )
}

export default Footer;
  