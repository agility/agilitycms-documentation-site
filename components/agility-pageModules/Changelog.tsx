import { DateTime } from 'luxon';
import { client } from 'agility-graphql-client';
import { gql } from '@apollo/client';
import { CustomDataProp } from 'types/Changelog';
import { useEffect, useState } from 'react';

const getChangeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dt = DateTime.fromJSDate(d);
    return dt.toFormat('LLLL dd, yyyy');
};

interface ChangeLogProp {
    module: any;
    customData: {
        changelog: CustomDataProp[];
    };
}

const TagButton = ({ tag }) => {
    return <span className="bg-[#ECE5F6] text-[11px] inline-block ml-2 px-3 py-1 text-purple font-bold rounded-full">{tag.fields.title}</span>;
};

const FilterBlock = ({ filterList }) => {
    return (
        <div className="p-5 text-lg">
            <h4 className="pb-3">Filter</h4>
            {filterList.map((filter) => {
                return (
                    <div key={filter}  className="pb-2">
                        <input
                            className="float-left w-4 h-4 mt-1 mr-2 align-top bg-white bg-center bg-no-repeat bg-contain border border-gray-300 rounded-sm appearance-none cursor-pointer checked:bg-purple checked:border-blue-purple focus:outline-none"
                            type="checkbox"
                            value={filter}
                            id={filter}
                        />
                        <label className="inline-block text-gray-800" htmlFor={filter}>
                            {filter}
                        </label>
                    </div>
                );
            })}
        </div>
    );
};

const Changelog = ({ module, customData }: ChangeLogProp): JSX.Element => {
    const { changelog: changeLogItems } = customData;
    const { fields } = module;
    const [filterList, setFilterList] = useState([]);
    const [changeList, setChangeList] = useState([]);

    // sets the unique sets of filters
    useEffect(() => {
        let tagList = changeLogItems.reduce((acc, cur) => {
            let tagArray = [];
            cur.fields.changes.forEach(change => {
                change.fields.tags.forEach((tag) => tagArray.push(tag.fields.title));
            });
            return [...acc, ...tagArray];
        }, []);
        setFilterList(Array.from(new Set(tagList)));
    }, [changeLogItems]);

    // loops through each lists and attaches the unique tags in the main object for filtering
    useEffect(() => {
        let changeListArray = changeLogItems.map(list => {
            let listTag = [];
            list.fields.changes.forEach(change => {
                change.fields.tags.forEach((tag) => listTag.push(tag.fields.title));
            });
            return {...list, tags: Array.from(new Set(listTag))}
        })
        setChangeList(changeListArray);
        console.log(changeListArray)
    }, [changeLogItems]);

    return (
        <>
            <div id="SideNav" className="z-40 flex flex-col w-64 pt-4 pb-4 font-muli">
                <div className="top-[128px] sticky overflow-y-auto lg:flex lg:flex-shrink-0">
                    <FilterBlock filterList={filterList} />
                </div>
            </div>
            <div id="ScrollContainer" className="flex-grow w-full border-l border-gray-200 lg:flex lg:justify-center">
                <div className="relative px-4 my-20 font-muli sm:px-6 lg:px-8">
                    <div className="absolute inset-0">
                        <div className="bg-white h-1/3 sm:h-2/3" />
                    </div>
                    <div className="relative mx-auto max-w-7xl">
                        <div className="text-center">
                            <h2 className="text-3xl font-medium tracking-normal text-gray-900 sm:text-4xl">{fields.title}</h2>
                            <p className="my-6 text-darkGray">{fields.description}</p>
                        </div>
                        <div className="mt-12">
                            {changeList.map((item) => (
                                <section key={item.contentID} className="mt-6">
                                    <header className="flex items-center">
                                        <div className="min-w-[200px] pr-4 text-right text-purple font-semibold">{getChangeDate(item.fields.date)}</div>
                                        <h3 className="text-[16px] border-gray p-3 text-2xl font-bold border-l-2">{item.fields.description}</h3>
                                    </header>

                                    <div className="border-lightGray">
                                        <ul className="ml-[200px] border-l-1 border-gray border-l-2 list-inside list-disc">
                                            {item.fields.changes.map((change) => (
                                                <li key={change.contentID} className="relative pl-6 mb-2">
                                                    <div className="w-[200px] left-[-200px] absolute top-0 flex justify-end pr-4">
                                                        {change.fields.tags.map((tag, index) => (
                                                            <TagButton tag={tag} key={index} />
                                                        ))}
                                                    </div>

                                                    <h4 className="inline">
                                                        {change.fields.title}
                                                        <span className="inline-block">{change.fields.description}</span>
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
            }
        `
    });
    return data;
};

export default Changelog;
