const Table = ({ id, withHeadings, content }) => {
  let headings = [];
  let rows = content;

  if (withHeadings) {
    headings = content[0];
    rows = content.slice(1, content.length);
  }

  return (
    <div className="flex flex-col mt-8 mb-8">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow-sm overflow-hidden border-b border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              {withHeadings && (
                <thead className="bg-gray-50">
                  <tr>
                    {headings.map((heading, idx) => {
                      return (
                        <th
                          key={idx}
                          scope="col"
                          className="px-6 py-3 text-left text-sm text-brightPurple font-semibold uppercase tracking-wider"
                          style={{ backgroundColor: "#D7E2ED" }}
                        >
                          {heading}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
              )}
              <tbody>
                {rows.map((row, idx) => (
                  <Row key={idx} row={row} idx={idx} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ row, idx }) => {
  return (
    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-lightGray"}>
      {row.map((rowCol, idx2) => {
        return (
          <td
            key={idx2}
            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
          >
            {rowCol}
          </td>
        );
      })}
    </tr>
  );
};

export default Table;
