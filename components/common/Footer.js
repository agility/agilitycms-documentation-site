/* eslint-disable @next/next/no-img-element */
import React from "react";
import { RenderLink } from "./RenderLink";

const adjustLink = (url) => {
  if (!url) return "";

  // If it's already a full URL (starts with http:// or https://), return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // If it's a relative link (starts with /), prefix with https://agilitycms.com
  if (url.startsWith("/")) {
    return `https://agilitycms.com${url}`;
  }

  // For any other relative link, prefix with https://agilitycms.com/
  return `https://agilitycms.com/${url}`;
};

const Footer = (props) => {
  const navigation = props.navigation || [];
  const bottomNavigation = props.bottomNavigation || [];
  const copyright = props.copyright || `© Copyright, Agility Inc.`;
  const year = new Date().getFullYear();

  return (
    <footer className="">
      <div className="bg-highlight px-8 pt-14 pb-14 text-white" style={{ backgroundColor: "#4600A8" }}>
        <div className="mx-auto max-w-7xl">
          <div className="border-t border-t-white border-opacity-50"></div>
          <div className="mt-8 gap-2 lg:flex lg:flex-wrap lg:items-start">
            <div className="flex-1 gap-2 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {navigation.map((col, idx) => {
                if (!col || !col.children || col.children.length < 1) return null;
                return (
                  <div key={`${col.name}-${idx}`} className="flex-1 pt-8">
                    {col.name && (
                      <h4 className="font-medium mb-3">{col.name}</h4>
                    )}
                    <ul className="mt-2 flex flex-col text-sm text-gray-100">
                      {col.children?.map((link, idx2) => {
                        return (
                          <li key={`${link.href || link.name}-${idx2}`}>
                            <RenderLink link={link} adjustLink={adjustLink} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-highlight-dark p-3 text-white" style={{ backgroundColor: "#380087" }}>
        <div className="mx-auto max-w-7xl lg:flex lg:flex-row-reverse lg:items-center lg:justify-between text-sm">
          <div className="text-purple-300 text-center lg:text-left">
            {copyright} {year}
          </div>

          <div className="flex flex-wrap justify-center lg:justify-start">
            {bottomNavigation
              .filter((link) => link.href && typeof link.href === 'string' && link.href.trim()) // Filter out links with null/undefined/empty href
              .map((link, index, filteredArray) => {
                const href = adjustLink(link.href);
                return (
                  <div key={`${link.href}-${link.name}-${index}`}>
                    <a
                      className="text-purple-300 hover:text-white p-1 px-2"
                      href={href}
                      target={link.target}
                    >
                      {link.name}
                    </a>
                    {index < filteredArray.length - 1 && (
                      <span className="text-purple-300">|</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
