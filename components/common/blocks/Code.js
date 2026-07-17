import Highlight from "react-highlight";

const Code = ({ id, code }) => {
  return (
    <Highlight className="block text-base bg-(--code-bg) p-5 my-8">
      {code}
    </Highlight>
  );
};

export default Code;
