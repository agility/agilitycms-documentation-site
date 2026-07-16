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
"use client";

import React, { Fragment, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { SearchIcon } from "@heroicons/react/solid";
import {
  LoginIcon,
  MenuIcon,
  XIcon,
  SupportIcon,
} from "@heroicons/react/outline";
import ButtonDropdown from "../common/ButtonDropdown";
import ThemeControl from "../common/ThemeControl";
import Link from "next/link";
import Search from "./Search";
import { ChevronRightIcon } from "@heroicons/react/solid";

import { renderHTML } from "../../utils/htmlUtils";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const loginButton = {
  name: "Sign In",
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
  // Active section is computed client-side from the pathname (the server
  // sends plain {name, href} links). Match on the first path segment so a
  // top-level category highlights for any page beneath it.
  const pathname = usePathname() || "/";
  const firstSegment = (p) => (p || "").split("/")[1] || "";
  const navigation = (mainMenuLinks || []).map((item) => ({
    ...item,
    current: firstSegment(pathname) === firstSegment(item.href),
  }));
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
    if (!scrollContainer) return;
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
          className="px-2 sm:px-4 lg:px-8 pt-3 pb-2 bg-(--n-900) text-(--n-50) hidden md:block font-muli"
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
                  <ChevronRightIcon className="w-[20px] h-[20px] mb-0.5 marketing-arrow relative top-[2px]" />
                </div>
                <div className="flex text-sm items-center">
                  {supportButton && (
                    <Link href={supportButton.href} title={supportButton.name}
                      target="_blank"
                      rel="noreferrer"
                      className="whitespace-nowrap"
                    >
                      {supportButton.name}

                    </Link>
                  )}
                  {loginButton && (
                    <a
                      href={loginButton.href}
                      className="ml-8 whitespace-nowrap"
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
        className="shrink-0 bg-(--surface) border-b border-(--border) z-40 relative font-muli sticky top-0"
      >
        {({ open }) => (
          <>
            <div className="mx-auto px-2 sm:px-4  lg:px-8">
              <div className="relative h-[60px] flex justify-between">
                <div className="relative z-10 px-2 flex lg:px-0">
                  <div className="shrink-0 flex items-center">
                    <Link href="/" title="Agility Docs">
                      <img
                        className="block h-7 md:h-8 w-auto"
                        src="/docs/assets/agility-docs-logo.svg"
                        alt="The logo of Agility Docs site on agilitycms.com"
                      />

                    </Link>
                  </div>
                </div>
                <div className="relative z-0 flex-1 px-2 hidden lg:flex items-center justify-center sm:absolute sm:inset-0">
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

                <div className="flex items-center">
                  <div className="hidden sm:block lg:hidden mr-[32px] sm:relative sm:z-10">
                    <a
                      target="_blank"
                      href="https://agilitycms.com/trial/"
                      rel="noreferrer"
                      className="py-[9px] px-[19px] font-bold custom-hover"
                      style={{
                        color: "var(--on-color)",
                        backgroundColor: "var(--tertiary)",
                        fontSize: ".875rem",
                        borderRadius: "var(--r-sm)",
                      }}
                    >
                      Try For Free
                    </a>
                  </div>
                  <div className="relative z-10 flex items-center lg:hidden">
                    {/* Mobile menu button */}
                    <Disclosure.Button className="p-2 inline-flex items-center justify-center text-(--text-2) hover:bg-(--raised) focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-(--primary)">
                      <span className="sr-only">Open menu</span>
                      {open ? (
                        <XIcon className="block h-7 w-7" aria-hidden="true" />
                      ) : (
                        <MenuIcon
                          className="block h-7 w-7"
                          aria-hidden="true"
                        />
                      )}
                    </Disclosure.Button>
                  </div>
                </div>

                <div className="hidden lg:relative lg:z-10 lg:ml-4 lg:flex lg:items-center lg:gap-4">
                  <ThemeControl />
                  <a
                    target="_blank"
                    href="https://agilitycms.com/trial/"
                    rel="noreferrer"
                    className="border-2 pt-2 pb-1.5 px-4 font-bold custom-hover"
                    style={{ color: "var(--primary)", borderColor: "var(--primary)", borderRadius: "var(--r-sm)" }}
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
                    <Link key={item.name} href={item.href}
                      className={classNames(
                        item.current
                          ? "text-(--primary) border-(--primary)"
                          : "text-(--text-2) hover:text-(--primary) border-transparent",
                        "font-semibold border-b-2 pb-1"
                      )}
                      aria-current={item.current ? "page" : undefined}
                    >
                      {item.name}

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
                <div className="w-full px-2 py-3">
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
                <div>
                  {navigation.map((item) => (
                    <Disclosure.Button
                      key={item.href}
                      className="w-full text-left"
                    >
                      <MenuLink item={item} />
                    </Disclosure.Button>
                  ))}
                </div>
                <div
                  className="px-3"
                  style={{ marginTop: "24px", marginBottom: "24px" }}
                >
                  <a
                    target="_blank"
                    href="https://agilitycms.com/trial/"
                    rel="noreferrer"
                    className="border-2 pt-2 pb-1.5 px-4 font-bold custom-hover block md:hidden w-full text-center"
                    style={{ color: "var(--primary)", borderColor: "var(--primary)", borderRadius: "var(--r-sm)" }}
                  >
                    Try For Free
                  </a>
                  {/* <hr className="py-2 shadow-none" /> */}
                </div>
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure >
    </>
  );
}

const MenuLink = ({ item }) => {
  // let { href, children, ...rest } = props;
  return (
    <Link href={item.href} className={classNames(
      item.current
        ? "bg-(--raised) text-(--text)"
        : "text-(--text-2) hover:bg-(--raised) hover:text-(--text)",
      "block py-2 px-3 text-base font-medium"
    )}
      aria-current={item.current ? "page" : undefined}
    // {...rest}
    >
      {item.name}

    </Link>
  );
};
