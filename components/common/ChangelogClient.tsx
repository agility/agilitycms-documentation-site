'use client';

import { DateTime } from 'luxon';
import { Link2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { FilterBlock } from 'components/common/FilterBlock';

const getChangeDate = (dateStr: string) => DateTime.fromJSDate(new Date(dateStr)).toFormat('LLLL dd, yyyy');

/**
 * ONE left rail, shared by the release date and every change's tags, so the two
 * actually line up. The previous version used two absolutely-positioned gutters
 * at different widths (220px for linked rows, 200px for unlinked), which is why
 * the tag pills drifted 20px depending on whether a row happened to have a link.
 * Everything here is grid-positioned instead — nothing is absolute.
 */
const RAIL = 'lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-x-0';

type Tag = { contentID: number; fields: { title: string } };

const TagPills = ({ tags, className = '' }: { tags?: Tag[]; className?: string }) => {
    if (!tags?.length) return null;
    // items-start matters: a flex container stretches its children by default,
    // and a stretched `rounded-full` pill renders as a tall vertical capsule.
    return (
        <div className={`flex flex-wrap items-start gap-1.5 lg:justify-end ${className}`}>
            {tags.map((tag, i) => (
                <span
                    key={tag.contentID ?? i}
                    className="bg-(--raised) text-(--muted) border border-(--border) inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap"
                >
                    {tag.fields.title}
                </span>
            ))}
        </div>
    );
};

// A single change. Linked rows get a link icon, an underline on hover and a
// tinted surface, so the 10 linked items stand out from the ~170 that aren't.
const Change = ({ change }: { change: any }) => {
    const { title, description, linkURL, tags } = change.fields;

    const body = (
        <>
            <h4 className="text-(--text) group-hover/row:text-(--primary-text) flex items-start gap-1.5 font-bold transition-colors">
                <span className="group-hover/row:underline decoration-(--primary) underline-offset-2">{title}</span>
                {linkURL && (
                    <Link2
                        aria-hidden="true"
                        strokeWidth={2.25}
                        className="text-(--primary-text) mt-1 h-4 w-4 shrink-0"
                    />
                )}
            </h4>
            {description && <p className="text-(--text-2) mt-1 text-base leading-relaxed">{description}</p>}
        </>
    );

    return (
        <li className={`${RAIL} border-t border-(--border) first:border-t-0`}>
            {/* No horizontal padding below lg — the outer container supplies it, and
                adding it here would indent the tags 16px past their own title. */}
            <TagPills tags={tags} className="pt-4 pb-2 lg:pt-5 lg:pr-5 lg:pb-0" />
            <div className="border-(--border) pb-5 lg:border-l lg:pl-8">
                {linkURL ? (
                    <a
                        href={linkURL}
                        className="group/row hover:bg-(--surface) focus-visible:bg-(--surface) -mx-3 block rounded-(--r-md) px-3 py-3 transition-colors"
                    >
                        {body}
                        <span className="sr-only"> (opens a linked page)</span>
                    </a>
                ) : (
                    <div className="group/row -mx-3 px-3 py-3">{body}</div>
                )}
            </div>
        </li>
    );
};

// Interactive changelog UI (client) — data comes from the Changelog server component.
const ChangelogClient = ({
    changelog: changeLogItems,
    changelogtags: changeLogTags,
}: {
    changelog: any[];
    changelogtags: any[];
}): React.JSX.Element => {
    const [filterSelection, setFilterSelection] = useState<string[]>([]);

    // Only offer filters for tags that are actually used by a visible change.
    const filterOptions = useMemo(() => {
        const used = new Set<string>();
        changeLogItems.forEach((release) =>
            release.fields.changes?.forEach((change: any) =>
                change.fields.tags?.forEach((tag: Tag) => used.add(tag.fields.title))
            )
        );
        return changeLogTags
            .map((tag) => ({ title: tag.fields.title, id: tag.contentID }))
            .filter((tag) => used.has(tag.title));
    }, [changeLogItems, changeLogTags]);

    // Keep a release only if at least one of its changes survives the filter.
    const changeLogList = useMemo(() => {
        if (!filterSelection.length) return changeLogItems;
        return changeLogItems
            .map((release) => {
                const changes = release.fields.changes?.filter((change: any) =>
                    change.fields.tags?.some((tag: Tag) => filterSelection.includes(tag.contentID.toString()))
                );
                return changes?.length ? { ...release, fields: { ...release.fields, changes } } : null;
            })
            .filter(Boolean);
    }, [changeLogItems, filterSelection]);

    return (
        <>
            <div id="SideNav" className="z-40 order-1 hidden w-64 flex-col row-span-2 pt-4 pb-4 lg:flex">
                <div className="sticky top-32 overflow-y-auto lg:flex lg:shrink-0">
                    <FilterBlock
                        filterOptions={filterOptions}
                        setFilterSelection={setFilterSelection}
                        filterSelection={filterSelection}
                    />
                </div>
            </div>

            <div id="ScrollContainer" className="border-(--border) order-3 w-full grow border-l pt-12 lg:pt-16">
                <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
                    {changeLogList.length === 0 && (
                        <p className="text-(--muted) py-16 text-center">
                            No changes match the selected filters.
                        </p>
                    )}

                    {changeLogList.map((release: any) => (
                        <section key={release.contentID} className="mb-14">
                            {/* Release header sits on the same rail as the rows below it. */}
                            <header className={`${RAIL} mb-2`}>
                                <p className="text-(--muted) pb-1 text-sm font-semibold tracking-wide lg:pt-1 lg:pr-5 lg:text-right">
                                    <time dateTime={release.fields.date}>{getChangeDate(release.fields.date)}</time>
                                </p>
                                <h3 className="text-(--text) border-(--primary) text-xl font-bold lg:border-l-2 lg:pl-8">
                                    {release.fields.description}
                                </h3>
                            </header>

                            <ul>
                                {release.fields.changes?.map((change: any) => (
                                    <Change key={change.contentID} change={change} />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>
        </>
    );
};

export default ChangelogClient;
