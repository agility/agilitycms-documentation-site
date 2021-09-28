import Highlight from 'react-highlight'

const Code =  ({ id, code}) => {
    return (
        <Highlight className="block text-sm rounded-lg bg-gray-100 p-5 my-8">
            {code}
        </Highlight>
    );
};

export default Code;