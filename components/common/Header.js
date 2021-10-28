/*
  This example requires Tailwind CSS v2.0+ 
  
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
import React, { Fragment, useEffect } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { SearchIcon } from "@heroicons/react/solid";
import {
  LoginIcon,
  MenuIcon,
  XIcon,
  SupportIcon,
} from "@heroicons/react/outline";
import ButtonDropdown from "../common/ButtonDropdown";
import Link from "next/link";
import Search from "./Search";
import { ChevronRightIcon } from "@heroicons/react/solid";

import { renderHTML } from "../../utils/htmlUtils";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const loginButton = {
  name: "Login",
  href: "https://manager.agilitycms.com/",
  icon: LoginIcon,
};

const supportButton = {
  name: "Get Support",
  href: "https://help.agilitycms.com/hc/en-us/requests/new",
  icon: SupportIcon,
};

export default function Header({
  mainMenuLinks,
  primaryDropdownLinks,
  secondaryDropdownLinks,
  marketingContent,
  preHeader,
}) {
  const navigation = mainMenuLinks;
  const apiSDKsButton = {
    name: "APIs & SDKs",
    children: primaryDropdownLinks.map((l) => {
      return {
        name: l.text,
        href: l.href,
      };
    }),
    children2: secondaryDropdownLinks.map((l) => {
      return {
        name: l.text,
        href: l.href,
      };
    }),
  };

  useEffect(() => {
    const scrollContainer = document.getElementById("ScrollContainer");
    scrollContainer.addEventListener("scroll", function (e) {
      const scroll = this.scrollTop;
      const preheader = document.getElementById("preheader");
      if (scroll === 0) {
        preheader.classList.add("md:block");
      } else {
        preheader.classList.remove("md:block");
      }
    });
  }, []);

  return (
    <>
      {preHeader.showPreHeader === true && (
        <div
          className="px-2 sm:px-4 lg:px-8 py-3 bg-purple text-white hidden md:block font-muli"
          id="preheader"
        >
          <div className="flex justify-between">
            {marketingContent && (
              <>
                <div className="flex items-center">
                  <div
                    id="marketing-content"
                    style={{ fontSize: ".875rem", fontWeight: "400" }}
                    dangerouslySetInnerHTML={renderHTML(marketingContent, true)}
                  />
                  <ChevronRightIcon className="w-[20px] h-[20px] marketing-arrow" />
                </div>
                <div className="flex text-sm">
                  {supportButton && (
                    <Link href={supportButton.href}>
                      <a
                        title={supportButton.name}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {supportButton.name}
                      </a>
                    </Link>
                  )}
                  {loginButton && (
                    <a
                      href={loginButton.href}
                      className="ml-8"
                      target="_blank"
                      rel="noreferrer"
                      title={loginButton.name}
                    >
                      {loginButton.name}
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <Disclosure
        id="Header"
        as="header"
        className="flex-shrink-0 bg-white shadow z-40 relative font-muli"
      >
        {({ open }) => (
          <>
            <div className="mx-auto px-2 sm:px-4  lg:px-8">
              <div className="relative h-16 flex justify-between">
                <div className="relative z-10 px-2 flex lg:px-0">
                  <div className="flex-shrink-0 flex items-center">
                    <Link href="/">
                      <a title="Agility CMS Docs">
                        <img
                          className="block h-6 md:h-8 w-auto"
                          src="/docs/assets/agility-docs-logo.svg"
                          alt="Agility CMS Docs"
                        />
                      </a>
                    </Link>
                  </div>
                </div>
                <div className="relative z-0 flex-1 px-2 hidden md:flex items-center justify-center sm:absolute sm:inset-0">
                  <div className="w-full max-w-xs lg:max-w-xl">
                    <label htmlFor="search" className="sr-only">
                      Search
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                        <SearchIcon
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </div>
                      <Search />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center lg:hidden">
                  {/* Mobile menu button */}
                  <Disclosure.Button className="p-2 inline-flex items-center justify-center text-darkestGray hover:bg-lightGray focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brightPurple">
                    <span className="sr-only">Open menu</span>
                    {open ? (
                      <XIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>

                <div className="hidden lg:relative lg:z-10 lg:ml-4 lg:flex lg:items-center">
                  <a
                    target="_blank"
                    href="https://agilitycms.com/trial/"
                    rel="noreferrer"
                    className="block border-2 pt-2 pb-1.5 px-4 font-semibold"
                    style={{ color: "#5800d4", borderColor: "#5800d4" }}
                  >
                    Try For Free
                  </a>
                </div>
              </div>
              <nav
                className="hidden lg:py-2 lg:flex items-center mb-2"
                aria-label="Global"
              >
                <div className="lg:space-x-8">
                  {navigation.map((item) => (
                    <Link key={item.name} href={item.href}>
                      <a
                        className="text-gray-900 hover:text-purple"
                        aria-current={item.current ? "page" : undefined}
                      >
                        {item.name}
                      </a>
                    </Link>
                  ))}
                </div>
                <div className="ml-auto">
                  <ButtonDropdown {...apiSDKsButton} />
                </div>
              </nav>
            </div>

            <Disclosure.Panel
              as="nav"
              className="lg:hidden"
              aria-label="Global"
            >
              <div className="pt-2 pb-3 px-2 space-y-1">
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <a
                      className={classNames(
                        item.current
                          ? "bg-lightGray text-darkestGray"
                          : "text-darkestGray hover:bg-lightGray hover:text-gray-900",
                        "block py-2 px-3 text-base font-medium"
                      )}
                      aria-current={item.current ? "page" : undefined}
                    >
                      {item.name}
                    </a>
                  </Link>
                ))}

                <div className="w-full px-1 py-3">
                  <hr className="py-2 shadow-none" />
                  <label htmlFor="search" className="sr-only">
                    Search
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                      <SearchIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                    <Search />
                  </div>
                </div>
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </>
  );
}
