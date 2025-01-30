/* This example requires Tailwind CSS v2.0+ */
import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/solid";
import Link from "next/link";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ButtonDropdown({ name, children, children2 }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => (
        <>
          <div
            className={`bg-lightGray pt-2 pb-1.5 px-2 border-b-2 border-transparent ${open ? `border-purple` : ``
              }`}
          >
            <Menu.Button className="flex justify-between w-52 text-darkestGray">
              <p className="font-semibold">{name}</p>
              <ChevronDownIcon
                className="-mr-1 ml-2 h-5 w-5 text-purple"
                aria-hidden="true"
              />
            </Menu.Button>
          </div>

          {open && (
            <>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items
                  static
                  className="origin-top-right absolute right-0 w-56 shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <div className="py-1">
                    {children.map((item) => (
                      <Menu.Item key={item.name}>
                        <MenuLink href={item.href}>{item.name}</MenuLink>
                      </Menu.Item>
                    ))}
                    <hr className="mt-2 mb-2" />
                    {children2.map((item) => (
                      <Menu.Item key={item.name}>
                        <MenuLink href={item.href}>{item.name}</MenuLink>
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Transition>
            </>
          )}
        </>
      )}
    </Menu>
  );
}

const MenuLink = (props) => {
  let { href, children, ...rest } = props;
  return (
    <Link href={href} rel="noreferrer"
      className="text-darkerGray font-semibold block px-4 py-2 text-sm hover:text-purple"
      {...rest}
    >
      {children}

    </Link>
  );
};
