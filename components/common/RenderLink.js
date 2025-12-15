export function RenderLink({ link, adjustLink }) {
  // Check if link has header field (could be string "true" or boolean)
  const isHeader = link.header === "true" || link.header === true;
  const href = link.href ? adjustLink(link.href) : null;
  const isExternal = href && (href.startsWith("http://") || href.startsWith("https://"));

  if (isHeader) {
    // HEADER - render as heading
    return (
      <h4 className="font-bold text-base pb-3">
        {href ? (
          <a
            href={href}
            target={link.target}
            className="hover:text-white"
          >
            {link.name || link.title}
          </a>
        ) : (
          <span>{link.name || link.title}</span>
        )}
      </h4>
    );
  }

  // NON HEADER - render as regular link
  return (
    <>
      {href ? (
        <a
          href={href}
          target={link.target}
          className="block pb-3 text-purple-300 hover:text-white"
        >
          {link.name || link.title}
        </a>
      ) : (
        <span className="block pb-3 text-purple-300">{link.name || link.title}</span>
      )}
    </>
  );
}

