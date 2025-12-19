import { DateTime } from 'luxon';
import { client } from 'agility-graphql-client';
import { gql } from '@apollo/client';
import { ChangeLogProp } from 'types/Changelog';
import { Key, useEffect, useState } from 'react';
import { FilterBlock } from 'components/common/FilterBlock';

const getChangeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dt = DateTime.fromJSDate(d);
    return dt.toFormat('LLLL dd, yyyy');
};

const Changelog = ({ module, customData }: ChangeLogProp): JSX.Element => {
    const { changelog: changeLogItems, changelogtags: changeLogTags } = customData;
    const [filterOptions, setFilterOptions] = useState([]);
    const [changeLogList, setChangeLogList] = useState([]);
    const [filterSelection, setFilterSelection] = useState<string[]>([]);

    // sets the filter options for the filterblock
    useEffect(() => {
        const tagOptions = changeLogTags.map((tags) => ({ title: tags.fields.title, id: tags.contentID }));
        const tagList = changeLogItems.reduce((acc, cur) => {
            cur.fields.changes?.forEach((change) => {
                change.fields.tags?.forEach((tag) => acc.push(tag.fields.title));
            });
            return acc;
        }, []);
        setFilterOptions(tagOptions.filter((tags) => tagList.includes(tags.title)));
    }, [changeLogItems, changeLogTags]);

    // filter the content using the filterselection array
    useEffect(() => {
        let changeLogListArray = changeLogItems.map((section) => {
            // disable this section by default until a filter is selected and one of the object tags are part of the filter
            let isShow = false;
            // 1st level filtering: if there are no filters selected return all sections
            if (!section.fields.changes?.length && !filterSelection?.length) return section;
            const filteredSection = section.fields.changes?.filter((change) => {
                // 2nd level filtering: if one of the tags is part of the filter list then show this section and return the bullet list
                if (change.fields.tags?.some((tag) => filterSelection.includes(tag.contentID.toString()) || !filterSelection.length)) {
                    isShow = true;
                    return true;
                }
                return false;
            });
            // destructure from original list and repleace 'changes' property with the filtered one above
            if (isShow) return { ...section, fields: { ...section.fields, changes: filteredSection } };
        });

        // remove undefined and null values
        setChangeLogList(changeLogListArray.filter((n) => n));
    }, [changeLogItems, filterSelection]);

    return (
        <>
            <div id="SideNav" className="z-40 flex-col order-1 hidden w-64 row-span-2 pt-4 pb-4 lg:flex font-muli">
                <div className="top-[128px] sticky overflow-y-auto lg:flex lg:flex-shrink-0">
                    <FilterBlock filterOptions={filterOptions} setFilterSelection={setFilterSelection} filterSelection={filterSelection} />
                </div>
            </div>
            <div id="ScrollContainer" className="flex-grow order-3 w-full pt-20 border-l border-gray-200 lg:flex lg:justify-center">
                <div className="relative px-4 mb-20 font-muli sm:px-6 lg:px-8">
                    <div className="absolute inset-0">
                        <div className="bg-white h-1/3 sm:h-2/3" />
                    </div>
                    <div className="relative mx-auto max-w-7xl">
                        <div>
                            {changeLogList.map((item) => (
                                <section key={item.contentID} className="group">
                                    <header className="flex items-center">
                                        <div className="min-w-[220px] p-4 pr-4 text-right group-hover:text-purple font-semibold text-lg">{getChangeDate(item.fields.date)}</div>
                                        <h3 className="border-gray border-l-[#C6CFD8] min-h-[65px] ml-[-1px] p-5 pl-9 text-lg font-bold border-l-3 group-hover:border-purple">{item.fields.description}</h3>
                                    </header>

                                    <div className="border-lightGray">
                                        <ul className="ml-[220px] border-l-1 border-gray border-l-2 list-inside list-disc">
                                            {item.fields.changes?.map((change) => (
                                                <li key={change.contentID} className="relative py-3 pl-9 text-darkestGray">
                                                    {change.fields.linkURL ? (
                                                        <a href={change.fields.linkURL} className="anchor group-scope">
                                                            <div className="w-[220px] left-[-220px] absolute top-0 flex justify-end mt-3 pr-4">
                                                                {change.fields.tags?.map((tag: any, index: Key) => (
                                                                    <span key={index} className="group-scope-hover:bg-[#ECE5F6] bg-gray-100 text-[11px] inline-block ml-2 px-3 py-1 group-scope-hover:text-purple text-gray-500 font-bold rounded-full">
                                                                        {tag.fields.title}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <h4 className="inline font-bold group-scope-hover:text-purple">
                                                                {change.fields.title}
                                                                <span className="block pl-6 text-base font-normal">{change.fields.description}</span>
                                                            </h4>
                                                        </a>
                                                    ) : (
                                                        <>
                                                            <div className="w-[200px] left-[-200px] absolute top-0 flex justify-end mt-3 pr-4">
                                                                {change.fields.tags?.map((tag: any, index: Key) => (
                                                                    <span key={index} className="bg-gray-100 text-[11px] inline-block ml-2 px-3 py-1 text-gray-500 font-bold rounded-full">
                                                                        {tag.fields.title}
                                                                    </span>
                                                                ))}
                                                            </div>

                                                            <h4 className="inline font-bold hover:text-darkGray">
                                                                {change.fields.title}
                                                                <span className="block pl-6 text-base font-normal">{change.fields.description}</span>
                                                            </h4>
                                                        </>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

Changelog.getCustomInitialProps = async () => {
    const { data } = await client.query({
        query: gql`
            {
                changelog(take: 50, sort: "fields.date", direction: "desc") {
                    contentID
                    fields {
                        date
                        description
                        changes(take: 50, filter: "fields.internalOnly[ne]true") {
                            contentID
                            properties {
                                itemOrder
                            }
                            fields {
                                tags {
                                    contentID
                                    fields {
                                        title
                                    }
                                }
                                title
                                description
                                linkURL
                            }
                        }
                    }
                }
                changelogtags(sort: "fields.title") {
                    contentID
                    fields {
                        title
                    }
                }
            }
        `
    });
    return data;
};

export default Changelog;
