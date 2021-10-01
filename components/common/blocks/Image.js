import Image from 'next/image'
import { loader } from '../../../utils/imageUtils'

//TODO: implement Next IMG
const ImageBlock =  ({ id, caption, file, stretched, withBackground, withBorder }) => {
    const url = file.url;
    const size = file.size;

    return (
        <div className="text-center">
            {size &&
            <Image 
                className="rounded-lg border" 
                src={url} 
                alt={caption} 
                loader={loader}
                width={size.width}
                height={size.height}
            />
            }
            {!size && 
            <img className="rounded-lg border" src={url} alt={caption} />
            }
        </div>
    );
};

export default ImageBlock;