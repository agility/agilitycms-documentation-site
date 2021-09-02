import { renderHTML } from '@agility/nextjs';

const RawHTML = ({id, html }) => {
  return (
    <div dangerouslySetInnerHTML={renderHTML(html)} />
  )
}

export default RawHTML;