const Table = ({ id, withHeadings, content }: { id?: string; withHeadings?: boolean; content: any[] }) => {
  let headings: any[] = [];
  let rows = content;

  if (withHeadings) {
    headings = content[0];
    rows = content.slice(1, content.length);
  }

  return (
    <div className="flex flex-col mt-8 mb-8">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow-xs overflow-hidden border-b border-(--border)">
            <table className="min-w-full divide-y divide-(--border)">
              {withHeadings && (
                <thead className="bg-(--raised)">
                  <tr>
                    {headings.map((heading: any, idx: number) => {
                      return (
                        <th
                          key={idx}
                          scope="col"
                          className="px-6 py-3 text-left text-sm text-(--text) bg-(--raised) font-semibold uppercase tracking-wider"
                        >
                          {heading}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
              )}
              <tbody>
                {rows.map((row: any, idx: number) => (
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

const Row = ({ row, idx }: { row: any[]; idx: number }) => {
  return (
    <tr key={idx} className={idx % 2 === 0 ? "bg-(--surface)" : "bg-(--raised)"}>
      {row.map((rowCol: any, idx2: number) => {
        return (
          <td
            key={idx2}
            className="px-6 py-4 whitespace-nowrap text-sm text-(--text)"
          >
            {rowCol}
          </td>
        );
      })}
    </tr>
  );
};

export default Table;
