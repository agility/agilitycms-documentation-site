import { client } from '../../../agility-graphql-client';
import { gql } from "@apollo/client";

interface Props {
  locale: string;
}

/**
 * Get header content from GraphQL
 * Note: Accepts locale parameter for future multi-locale support
 */
export async function getHeaderContent({ locale }: Props) {
  const { data } = await client.query({
    query: gql`
      {
        header {
          fields {
            showPreHeader
            signInLink {
              text
              href
              target
            }
            documentationLink {
              text
              href
              target
            }
            primaryDropdownLinks(sort: "properties.itemOrder") {
              fields {
                link {
                  text
                  href
                }
              }
            }
            secondaryDropdownLinks(sort: "properties.itemOrder") {
              fields {
                link {
                  text
                  href
                }
              }
            }
          }
        }
      }
    `,
  });

  const headerData = data.header[0]?.fields;

  if (!headerData) {
    return null;
  }

  const primaryDropdownLinks = headerData.primaryDropdownLinks?.map(
    (link: any) => link.fields.link
  ) || [];

  const secondaryDropdownLinks = headerData.secondaryDropdownLinks?.map(
    (link: any) => link.fields.link
  ) || [];

  return {
    showPreHeader: headerData.showPreHeader,
    signInLink: headerData.signInLink,
    documentationLink: headerData.documentationLink,
    primaryDropdownLinks,
    secondaryDropdownLinks,
  };
}
