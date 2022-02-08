import { DateTime } from 'luxon';
import { client } from 'agility-graphql-client';
import { gql } from '@apollo/client';
import { ChangeLogProp } from 'types/Changelog';
import { Key, useEffect, useState } from 'react';
import { FilterBlock } from "components/common/FilterBlock";

const getChangeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dt = DateTime.fromJSDate(d);
    return dt.toFormat('LLLL dd, yyyy');
};

const TagButton = ({ tag }) => {
    return <span className="bg-[#ECE5F6] text-[11px] inline-block ml-2 px-3 py-1 text-purple font-bold rounded-full">{tag.fields.title}</span>;
};

const Changelog = ({ module, customData }: ChangeLogProp): JSX.Element => {
    console.log(customData);
    const { changelog: changeLogItems, changelogtags: changeLogTags } = customData;
    const { fields } = module;
    const [filterOptions, setFilterOptions] = useState([]);
    const [changeLogList, setChangeLogList] = useState([]);
    const [filterSelection, setFilterSelection] = useState<string[]>([]);

    // sets the filter options for the filterblock
    useEffect(() => {
        const tagOptions = changeLogTags.map((tags) => ({ title: tags.fields.title, id: tags.contentID }));
        const tagList = changeLogItems.reduce((acc, cur) => {
            cur.fields.changes.forEach((change) => {
                change.fields.tags.forEach((tag) => acc.push(tag.fields.title));
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
            if(!section.fields.changes.length && !filterSelection.length) return section;

            const filteredSection = section.fields.changes.filter((change) => {
                // 2nd level filtering: if one of the tags is part of the filter list then show this section and return the bullet list
                if(change.fields.tags.some((tag) => filterSelection.includes(tag.contentID.toString()) || !filterSelection.length)){
                    isShow = true;
                    return true;
                }
                return false;
            });
            if (isShow) return {...section, fields: {...section.fields, changes: filteredSection}};
        });

        // remove undefined and null values
        setChangeLogList(changeLogListArray.filter(n => n));
    }, [changeLogItems, filterSelection]);

    return (
        <>
            <div id="SideNav" className="z-40 flex flex-col pb-4 pt-4 w-64 font-muli">
                <div className="top-[128px] sticky overflow-y-auto lg:flex lg:flex-shrink-0">
                    <FilterBlock filterOptions={filterOptions} setFilterSelection={setFilterSelection} filterSelection={filterSelection} />
                </div>
            </div>
            <div id="ScrollContainer" className="flex-grow w-full border-l border-gray-200 lg:flex lg:justify-center">
                <div className="relative my-20 px-4 font-muli sm:px-6 lg:px-8">
                    <div className="absolute inset-0">
                        <div className="h-1/3 bg-white sm:h-2/3" />
                    </div>
                    <div className="relative mx-auto max-w-7xl">
                        <div className="text-center">
                            <h2 className="text-gray-900 text-3xl font-medium tracking-normal sm:text-4xl">{fields.title}</h2>
                            <p className="my-6 text-darkGray">{fields.description}</p>
                        </div>
                        <div className="mt-12">
                            {changeLogList.map((item) => (
                                <section key={item.contentID} className="mt-6">
                                    <header className="flex items-center">
                                        <div className="min-w-[200px] pr-4 text-right text-purple font-semibold p-3">{getChangeDate(item.fields.date)}</div>
                                        <h3 className="border-gray p-3 text-lg font-bold border-l-2">{item.fields.description}</h3>
                                    </header>

                                    <div className="border-lightGray">
                                        <ul className="ml-[200px] border-l-1 border-gray border-l-2 list-inside list-disc">
                                            {item.fields.changes.map((change) => (
                                                <li key={change.contentID} className="relative mb-4 pl-6 text-darkestGray">
                                                    <div className="w-[200px] left-[-200px] absolute top-0 flex justify-end pr-4">
                                                        {change.fields.tags.map((tag: any, index: Key) => (
                                                            <TagButton tag={tag} key={index} />
                                                        ))}
                                                    </div>

                                                    <h4 className="inline">
                                                        {change.fields.title}
                                                        <span className="inline-block text-base pl-6">{change.fields.description}</span>
                                                    </h4>
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
