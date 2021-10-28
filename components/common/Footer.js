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
      <div style={{ backgroundColor: "#4600A8" }} className="py-20 xl:py-28">
        <div className="max-w-2xl xl:max-w-6xl mx-auto px-4 lg:px-8 xl:flex xl:justify-between">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-16 mt-8">
            <div className="mb-0 mb-20">
              <h4 className="font-semibold mb-4">Product</h4>
              <ul
                className="space-y-[15px]"
                style={{
                  fontSize: "14px",
                  color: "#cbdeff",
                  fontWeight: "400",
                }}
              >
                <li>
                  <a>Why Agility</a>
                </li>
                <li>
                  <a>For Marketing Teams</a>
                </li>
                <li>
                  <a>For Developers</a>
                </li>
                <li>
                  <a>For Enterprise</a>
                </li>
                <li>
                  <a>Features</a>
                </li>
                <li>
                  <a>Product Roadmap</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul
                className="space-y-[15px]"
                style={{
                  fontSize: "14px",
                  color: "#cbdeff",
                  fontWeight: "400",
                }}
              >
                <li>
                  <a>Starters</a>
                </li>
                <li>
                  <a>Case Studies</a>
                </li>
                <li>
                  <a>Guides</a>
                </li>
                <li>
                  <a>Documentation</a>
                </li>
                <li>
                  <a>Events</a>
                </li>
                <li>
                  <a>System Status</a>
                </li>
              </ul>
            </div>
            <div className="mb-12 md:mb-0">
              <h4 className="font-semibold mb-4">About Us</h4>
              <ul
                className="space-y-[15px]"
                style={{
                  fontSize: "14px",
                  color: "#cbdeff",
                  fontWeight: "400",
                }}
              >
                <li>
                  <a>Blog</a>
                </li>
                <li>
                  <a>Partner Program</a>
                </li>
                <li>
                  <a>Leadership</a>
                </li>
                <li>
                  <a>Careers & Culture</a>
                </li>
                <li>
                  <a>Contact Us</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="relative z-10">
            <img
              src="/docs/assets/bg-top.svg"
              className="absolute"
              style={{ left: "-78px", top: "-45px", zIndex: "-1" }}
            />
            <div
              style={{ backgroundColor: "#5800D4" }}
              className="py-10 px-10 z-50 xl:max-w-md"
            >
              <h4 className="text-lg mb-3 font-semibold">Subscribe</h4>
              <p className="font-light mb-8">
                Get involved in our community and learn about our platform!
              </p>
              <div>
                <form className="flex">
                  <input
                    type="email"
                    placeholder="Email"
                    className="border-2 border-white w-full flex-1 mr-4 focus:outline-none ring-0 focus:border-transparent text-darkerGray font-semibold"
                  />
                  <button className="border-2 border-white px-4 py-3 outline-none w-auto flex items-center font-semibold">
                    Sign up
                    <ChevronRightIcon className="w-[20px] h-[20px] ml-2" />
                  </button>
                </form>
              </div>
            </div>
            <img
              src="/docs/assets/bg-bottom.svg"
              className="absolute -bottom-10 -right-10 xl:bottom-0 x:right-0"
              style={{ zIndex: "-1" }}
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
