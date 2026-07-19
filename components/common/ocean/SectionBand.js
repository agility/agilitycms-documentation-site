import Link from "next/link";
import icons from "../Icons";

/*
  Shared presentation for section-landing bands (ocean redesign). Every
  legacy landing module (ListofLinks, RightOrLeftAlignedLinks,
  ArticleListing, image links, SDK tiles) renders through these so section
  pages read as one consistent, left-aligned system — the same language as
  the ocean ArticleListSection / mockup guide cards.
*/

export const SectionBand = ({ heading, intro, children }) => (
	// Self-wraps like the ocean-band modules: page padding + centered --wrap
	// column on containerless templates (MainTemplate); inside the sidebar
	// shell the #WithSidebarNavTemplate .ocean-band override strips the
	// horizontal padding so bands stay flush with the shell column.
	<section className="ocean-band my-14 px-[var(--space)] font-muli">
		<div className="mx-auto max-w-[var(--wrap)]">
			{heading && (
				<h2
					className="m-0 mb-2"
					style={{
						fontFamily: "var(--serif)",
						fontSize: "clamp(1.4rem,2.6vw,1.85rem)",
						letterSpacing: "-.02em",
						color: "var(--text)",
					}}
				>
					{heading}
				</h2>
			)}
			{intro && (
				<p className="m-0 mb-5 max-w-[68ch] leading-relaxed text-(--text-2)">{intro}</p>
			)}
			{children}
		</div>
	</section>
);

/*
  Card grid. Items: { title, description?, href, target?, rel?, icon?
  (name in components/common/Icons), imageUrl?, category? }.
*/
export const LinkCardGrid = ({ items, columns = 2 }) => {
	if (!items?.length) return null;
	const colClass =
		columns === 3
			? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
			: "grid-cols-1 md:grid-cols-2";

	return (
		<ul className={`m-0 grid list-none gap-3 p-0 ${colClass}`}>
			{items.map((item) => (
				<li key={`${item.title}-${item.href}`}>
					<LinkCard item={item} />
				</li>
			))}
		</ul>
	);
};

const LinkCard = ({ item }) => {
	const ActionIcon = item.icon ? icons[item.icon] : null;

	return (
		<Link
			href={item.href || "#"}
			target={item.target}
			rel={item.rel}
			className="group block h-full rounded-(--r-md) bg-(--surface) p-5 transition-transform hover:-translate-y-0.5"
			style={{ boxShadow: "var(--elev-1)" }}
		>
			<span className="flex items-start gap-3">
				{ActionIcon && (
					<span
						aria-hidden="true"
						className="grid h-9 w-9 flex-none place-items-center rounded-(--r-sm) text-(--primary)"
						style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
					>
						<ActionIcon className="h-5 w-5" />
					</span>
				)}
				{item.imageUrl && (
					<span
						aria-hidden="true"
						className="grid h-9 w-9 flex-none place-items-center rounded-(--r-sm) bg-(--raised)"
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={item.imageUrl} alt="" className="h-6 w-6 object-contain" />
					</span>
				)}
				<span className="min-w-0">
					<span className="block font-bold text-(--primary)">{item.title}</span>
					{item.description && (
						<span className="mt-1 block text-[.9rem] leading-normal text-(--text-2)">
							{item.description}
						</span>
					)}
					{item.category && (
						<span className="mt-2 inline-block font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
							{item.category}
						</span>
					)}
				</span>
			</span>
		</Link>
	);
};
