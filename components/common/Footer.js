import { ChevronRightIcon } from "@heroicons/react/solid";

const navigation = {
  main: [
    {
      name: "Get Support",
      href: "https://help.agilitycms.com/hc/en-us/requests/new",
    },
    {
      name: "Join Community",
      href: "https://agilitycms-community.slack.com/join/shared_invite/enQtNzI2NDc3MzU4Njc2LWI2OTNjZTI3ZGY1NWRiNTYzNmEyNmI0MGZlZTRkYzI3NmRjNzkxYmI5YTZjNTg2ZTk4NGUzNjg5NzY3OWViZGI#/",
    },
    { name: "Platform Status", href: "https://status.agilitycms.com/" },
    // { name: "Product Roadmap", href: "https://roadmap.agilitycms.com/" },
    { name: "Back to Main Site", href: "https://agilitycms.com/" },
  ],
};

const Footer = () => {
  return (
    <footer className="text-white">
      <div style={{ backgroundColor: "#4600A8" }} className="py-32">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 flex justify-between">
          <div className="grid grid-cols-2">
            {navigation.main.map((navItem) => (
              <a href={navItem.href} key={navItem.name}>
                {navItem.name}
              </a>
            ))}
          </div>
          <div className="relative z-10">
            <img
              src="/docs/assets/bg-top.svg"
              className="absolute"
              style={{ left: "-78px", top: "-45px", zIndex: "-1" }}
            />
            <div style={{ backgroundColor: "#5800D4" }} className="p-8 z-50">
              <h4 className="text-xl mb-3">Subscribe</h4>
              <p className="font-light mb-8">
                Get involved in our community and learn about our platform!
              </p>
              <div>
                <form className="flex">
                  <input
                    type="email"
                    placeholder="Email"
                    className="border-2 border-white w-full flex-1 mr-4"
                  />
                  <button className="border-2 border-white px-4 py-3 outline-none w-auto flex items-center font-semibold">
                    Sign up
                    <ChevronRightIcon className="w-[20px] h-[20px] ml-2" />
                  </button>
                </form>
              </div>
            </div>
            <img
              src="/docs/assets/bg-top.svg"
              className="absolute"
              style={{ bottom: "-59px", right: "-71px", zIndex: "-1" }}
            />
          </div>
        </div>
      </div>
      <div style={{ backgroundColor: "#380087" }} className="py-4">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 flex justify-between">
          <p>© Copyright, Agility CMS 2021</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
