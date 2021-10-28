import { ChevronRightIcon } from "@heroicons/react/solid";
import * as PostUtil from "../../utils/postUtils";
import { getLeadSource } from "utils/leadUtils";
import { Fragment } from "react";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const Footer = (props) => {
  // get page template name
  const { pageTemplateName } = props;

  // get year logic
  const getYear = () => {
    const d = new Date();
    return d.getFullYear();
  };

  const navigation = props.navigation;

  const bottomNavigation = props.bottomNavigation;

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
              ? `max-w-2xl xl:max-w-7xl xl:flex xl:justify-between`
              : `max-w-4xl lg:max-w-7xl lg:flex lg:justify-between`
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-16 mt-8 mb-12 xl:mb-0">
            {navigation.map((col, idx) => {
              return (
                <div key={col.name}>
                  <h4 className="font-semibold mb-4">{col.name}</h4>
                  <ul
                    className="space-y-[15px]"
                    style={{
                      fontSize: "14px",
                      color: "#cbdeff",
                      fontWeight: "400",
                    }}
                  >
                    {col.children.map((link, idx2) => {
                      return (
                        <li key={link.href}>
                          <a href={link.href} target={link.target}>
                            {link.name}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
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
                    <button className="border-2 border-white px-4 py-3 outline-none w-full sm:w-auto flex justify-center items-center font-semibold custom-hover">
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
          <div className="lg:flex md:pt-1.5">
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
              {bottomNavigation.map((link, idx) => {
                return (
                  <>
                    <li key={link.href}>
                      <a href={link.href} target={link.target}>
                        {link.name}
                      </a>
                    </li>
                    {idx !== bottomNavigation.length - 1 && <li>|</li>}
                  </>
                );
              })}
            </ul>
          </div>
          <ul className="flex items-center socials text-center space-x-3 mb-8 lg:mb-0">
            <li style={{ width: "40px" }}>
              <a href="http://twitter.com/agilitycms">
                <img
                  src="https://static.agilitycms.com/social/twitter.svg"
                  alt="Twitter"
                  style={{ maxHeight: "25px", maxWidth: "28px", width: "100%" }}
                />
              </a>
            </li>
            <li style={{ width: "40px" }}>
              <a href="https://www.facebook.com/AgilityCMS/">
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
              <a href="https://www.linkedin.com/company/agilitycms">
                <img
                  src="https://static.agilitycms.com/layout/img/foter/linkedin-brands.svg"
                  alt="Twitter"
                  style={{ maxHeight: "25px", maxWidth: "28px" }}
                />
              </a>
            </li>
            <li style={{ width: "40px" }}>
              <a href="https://www.g2.com/products/agility-cms/reviews">
                <img
                  src="https://static.agilitycms.com/Attachments/NewItems/g2-2019-logo-new_20190918165754_0.png"
                  alt="Twitter"
                  style={{ maxHeight: "25px", maxWidth: "28px" }}
                />
              </a>
            </li>
            <li style={{ width: "40px" }}>
              <a href="https://agilitycms-community.slack.com/join/shared_invite/enQtNzI2NDc3MzU4Njc2LWI2OTNjZTI3ZGY1NWRiNTYzNmEyNmI0MGZlZTRkYzI3NmRjNzkxYmI5YTZjNTg2ZTk4NGUzNjg5NzY3OWViZGI#/">
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
