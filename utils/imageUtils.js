const getNewFileName = (originalFilename) => {
    const filenameWithoutExt = originalFilename.split('.').slice(0, -1).join('.');
    const ext = originalFilename.split('.').pop();
    return `${filenameWithoutExt}-${getTimestamp()}.${ext}`;
}

const getTimestamp = () => {
    var dt = new Date();

    return `${
        (dt.getMonth()+1).toString().padStart(2, '0')}${
        dt.getDate().toString().padStart(2, '0')}${
        dt.getFullYear().toString().padStart(4, '0')}${
        dt.getHours().toString().padStart(2, '0')}${
        dt.getMinutes().toString().padStart(2, '0')}${
        dt.getSeconds().toString().padStart(2, '0')}`
}


const loader = ({ src, width,height, quality }) => {
    const w = width > 0 ? `&w=${width}` : ``
    const h = height > 0 ? `&h=${height}` : ``
    const format = src.toLowerCase().indexOf(".svg") === -1 ? "&format=auto" : ""
    return `${src}?q=${quality || 100}${w}${h}${format}`
    //return `${src}?form,at`
}

export {
    getNewFileName, getTimestamp, loader
}