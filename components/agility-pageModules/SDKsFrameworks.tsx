import { getHrefRel, getHrefTarget } from "../../utils/linkUtils";
import { getContentList } from "lib/cms/getContentList";
import { SectionBand, LinkCardGrid } from "../common/ocean/SectionBand";

interface SDKsFrameworksProps {
  module: {
    contentID?: number;
    fields: {
      title: string;
      subtitle?: string;
      // {referencename} — the links are fetched via the data layer
      links?: { referencename: string };
    };
  };
  languageCode: string;
  isPreview?: boolean;
}

// Server component: fetches its own links (was getCustomInitialProps).
// SDK/framework tiles render as image-tile cards in a 3-up grid through the
// shared ocean SectionBand.
const SDKsFrameworks = async ({ module, languageCode, isPreview }: SDKsFrameworksProps) => {
  const { fields } = module;
  const actions = await getSDKActions({ fields, languageCode, isPreview });

  return (
    <SectionBand heading={fields.title} intro={fields.subtitle} contentID={module.contentID} headingField="title" introField="subtitle">
      <LinkCardGrid items={actions} columns={3} />
    </SectionBand>
  );
};

export default SDKsFrameworks;

const getSDKActions = async ({
  fields,
  languageCode,
  isPreview,
}: {
  fields: SDKsFrameworksProps["module"]["fields"];
  languageCode: string;
  isPreview?: boolean;
}) => {
  let actions: any[] = [];

  if (fields.links && fields.links.referencename) {
    const children = await getContentList({
      referenceName: fields.links.referencename,
      locale: languageCode,
      preview: !!isPreview,
      sort: "properties.itemOrder",
      contentLinkDepth: 1,
      take: 50,
    });

    if (children && children.items) {
      actions = children.items.map((item: any) => {
        return {
          title: item.fields.uRL?.text,
          href: item.fields.uRL?.href,
          imageUrl: item.fields.image?.url,
          target: getHrefTarget(item.fields.uRL?.href),
          rel: getHrefRel(item.fields.uRL?.href),
        };
      });
    }
  }

  return actions;
};
