import React from "react";

const List =  ({ id, style, items }) => {
    if(style === 'unordered') {
        return (
            <div className="prose">
                <RenderUnorderedList items={items} />
            </div>
        );
    }
    if(style === 'ordered') {
        return (
            <div className="prose">
                <RenderOrderedList items={items} />
            </div>
        );
    }
    
};

const RenderUnorderedList = ({items}) => {
    if(items.length === 0) return null;
    return(
        <ul>
            {items.map((item, idx) => {
                return (
                    <li key={idx}>
                        {item.content} 
                        <RenderUnorderedList items={item.items} />
                    </li>)
            })}
            </ul>
    )
}

const RenderOrderedList = ({items}) => {
    if(items.length === 0) return null;
    return(
        <ol>
            {items.map((item, idx) => {
                return (
                    <li key={idx}>
                        {item.content} 
                        <RenderOrderedList items={item.items} />
                    </li>)
            })}
            </ol>
    )
}

export default List;