import { DateTime } from 'luxon';
import { client } from 'agility-graphql-client';
import { gql } from '@apollo/client';
import { CustomData } from 'types/Changelog';

const getChangeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dt = DateTime.fromJSDate(d);
    return dt.toFormat('LLLL dd, yyyy');
};

interface ChangelogProps {
    module: any;
    customData: { changelog: CustomData[] };
}

const Changelog = ({ module, customData }: ChangelogProps): JSX.Element => {
    const { changelog: changeLogItems } = customData;
    const { fields } = module;

    return (
        <div className="relative px-4 my-20 font-muli sm:px-6 lg:px-8">
            <div className="absolute inset-0">
                <div className="bg-white h-1/3 sm:h-2/3" />
            </div>
            <div className="relative mx-auto max-w-7xl">
                <div className="text-center">
                    <h2 className="text-3xl font-medium tracking-normal text-gray-900 sm:text-4xl">
                        {fields.title}
                    </h2>
                    <p className="my-6 text-darkGray">{fields.description}</p>
                </div>
                <div className="mt-12">
                    {changeLogItems.map((item) => (
                        <section key={item.contentID} className="mt-6">
                            <header className="flex items-center">
                                <div className="min-w-[200px] pr-4 text-right text-purple font-semibold">
                                    {getChangeDate(item.fields.date)}
                                </div>
                                <h3 className="text-[16px] border-gray p-3 text-2xl font-bold border-l-2">
                                    {item.fields.description}
                                </h3>
                            </header>

                            <div className="border-lightGray">
                                <ul className="ml-[200px] border-l-1 border-gray border-l-2 list-inside list-disc">
                                    {item.fields.changes.map((change) => (
                                        <li
                                            key={change.contentID}
                                            className="relative pl-6 mb-2"
                                        >
                                            <div className="w-[200px] left-[-200px] absolute top-0 flex justify-end pr-4">
                                                <span className="bg-[#ECE5F6] text-[11px] inline-block ml-2 px-3 py-1 text-purple font-bold rounded-full">
                                                    {change.fields.component}
                                                </span>
                                                <span className="bg-[#ECE5F6] text-[11px] inline-block ml-2 px-3 py-1 text-purple font-bold rounded-full">
                                                    {change.fields.type}
                                                </span>
                                            </div>

                                            <h4 className="inline">
                                                {change.fields.title}
                                                <span className="inline-block">
                                                    {change.fields.description}
                                                </span>
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
                        changes(
                            take: 50
                            filter: "fields.internalOnly[ne]true"
                        ) {
                            contentID
                            properties {
                                itemOrder
                            }
                            fields {
                                title
                                type
                                component
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
