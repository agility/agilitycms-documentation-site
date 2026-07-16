import React from "react";
import Link from "next/link";

interface OceanLinkProps {
	url: string;
	target?: string;
	className?: string;
	style?: React.CSSProperties;
	children: React.ReactNode;
}

// Agility Link fields store site-relative hrefs with a '~/' site-root prefix.
// Internal links go through next/link (basePath is prepended automatically).
const OceanLink = ({ url, target, className, style, children }: OceanLinkProps) => {
	const isInternal = url.startsWith("~/") || url.startsWith("/");
	if (isInternal) {
		const href = url.startsWith("~/") ? url.substring(1) : url;
		return (
			<Link href={href} className={className} style={style}>
				{children}
			</Link>
		);
	}
	return (
		<a
			href={url}
			target={target || undefined}
			rel={target === "_blank" ? "noreferrer" : undefined}
			className={className}
			style={style}
		>
			{children}
		</a>
	);
};

export default OceanLink;
