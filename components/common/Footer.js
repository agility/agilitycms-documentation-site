import { ChevronRightIcon } from "@heroicons/react/solid";
import * as PostUtil from "../../utils/postUtils";
import { getLeadSource } from "utils/leadUtils";

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

const Footer = ({ props }) => {
  const { pageTemplateName } = props;

  console.log(pageTemplateName);

  // get year logic
  const getYear = () => {
    const d = new Date();
    return d.getFullYear();
  };

  // newletter submit handler
  const submitHandler = (event) => {
    // prevent default
    event.preventDefault();

    const postURL = process.env.NEXT_PUBLIC_SUBSCRIBE_POST_URL;
    const postRedirect = process.env.NEXT_PUBLIC_SUBSCRIBE_REDIRECT;

    const form = event.target;
    let data = {};

    //grab all the name/value pairs for the inputs in this form
    [...form.elements].forEach((input) => {
      if (!input.value || input.value === "") return;
      if (!input.name) return;
      data[input.name] = input.value;
    });

    if (!data["email"]) return;

    let leadSourceDetail =
      "newsletter-subscribe-form--" +
      window.location.pathname.replace(/\//g, "-") +
      "--" +
      getLeadSource();

    data["leadsourcedetail"] = leadSourceDetail;

    PostUtil.postData(postURL, data)
      .then((response) => {
        window.location.href = postRedirect;
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <footer className="text-white">
      <div
        style={{ backgroundColor: "#4600A8" }}
        className="pt-10 pb-20 xl:py-24"
      >
        <div
          className={`mx-auto px-6 md:px-8 overflow-hidden ${
            pageTemplateName === "WithSidebarNavTemplate"
              ? `md:max-w-2xl xl:flex xl:max-w-7xl md:justify-between`
              : `lg:flex lg:justify-between max-w-2xl xl:max-w-6xl 2xl:max-w-7xl`
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-16 mt-8">
            <div
              className={`${
                pageTemplateName === "WithSidebarNavTemplate"
                  ? `mb-20 xl:mb-0`
                  : ``
              }`}
            >
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
          <div className="relative">
            <img src="/docs/assets/bg-top.svg" className="top-form-svg" />
            <div
              className={`relative z-10 overflow-hidden ${
                pageTemplateName === "WithSidebarNavTemplate"
                  ? ``
                  : `xl:max-w-md 2xl:max-w-lg`
              }`}
            >
              <div style={{ backgroundColor: "#5800D4" }} className="p-8 z-50">
                <h4 className="text-lg mb-3 font-semibold">Subscribe</h4>
                <p className="font-light mb-8">
                  Get involved in our community and learn about our platform!
                </p>
                <div>
                  <form className="sm:flex" onSubmit={submitHandler}>
                    <input
                      name="email"
                      type="email"
                      placeholder="Email"
                      className="border-2 border-white w-full flex-1 mr-4 focus:outline-none ring-0 focus:border-transparent text-darkerGray font-semibold mb-3 sm:mb-0"
                      required
                    />
                    <button className="border-2 border-white px-4 py-3 outline-none w-full sm:w-auto flex justify-center items-center font-semibold">
                      <span>Sign up</span>
                      <ChevronRightIcon className="w-[20px] h-[20px] ml-2" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
            <img src="/docs/assets/bg-bottom.svg" className="bottom-form-svg" />
          </div>
        </div>
      </div>
      <div style={{ backgroundColor: "#380087" }} className="py-8 md:py-4">
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col-reverse lg:flex-row justify-between">
          <div className="lg:flex">
            <p
              style={{ fontSize: "13px", marginRight: "50px" }}
              className="mb-8 lg:mb-0"
            >
              © Copyright, Agility CMS {getYear()}
            </p>
            <ul
              style={{ fontSize: "13px" }}
              className="flex space-x-2 flex-wrap"
            >
              <li>
                <a>Privacy Policy</a>
              </li>
              <li>|</li>
              <li>
                <a>System Status</a>
              </li>
              <li>|</li>
              <li>
                <a>GDPR</a>
              </li>
              <li>|</li>
              <li>
                <a>Glossary</a>
              </li>
              <li>|</li>
              <li>
                <a>Security</a>
              </li>
            </ul>
          </div>
          <ul className="flex items-center socials text-center space-x-3 mb-8 lg:mb-0">
            <li style={{ width: "40px" }}>
              <a>
                <img
                  src="https://static.agilitycms.com/social/twitter.svg"
                  alt="Twitter"
                  style={{ maxHeight: "25px", maxWidth: "28px", width: "100%" }}
                />
              </a>
            </li>
            <li style={{ width: "40px" }}>
              <a>
                <img
                  src="https://static.agilitycms.com/social/facebook.svg"
                  alt="Twitter"
                  style={{
                    maxHeight: "25px",
                    maxWidth: "28px",
                    height: "100%",
                    width: "70%",
                  }}
                />
              </a>
            </li>
            <li style={{ width: "40px" }}>
              <a>
                <img
                  src="https://static.agilitycms.com/layout/img/foter/linkedin-brands.svg"
                  alt="Twitter"
                  style={{ maxHeight: "25px", maxWidth: "28px" }}
                />
              </a>
            </li>
            <li style={{ width: "40px" }}>
              <a>
                <img
                  src="https://static.agilitycms.com/Attachments/NewItems/g2-2019-logo-new_20190918165754_0.png"
                  alt="Twitter"
                  style={{ maxHeight: "25px", maxWidth: "28px" }}
                />
              </a>
            </li>
            <li style={{ width: "40px" }}>
              <a>
                <img
                  src="https://static.agilitycms.com/email-marketing/monthly-newsletter/slack-ico-small.png"
                  alt="Twitter"
                  style={{ maxHeight: "25px", maxWidth: "28px" }}
                />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
