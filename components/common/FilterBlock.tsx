import { ChangeEvent } from 'react';

export const FilterBlock = ({ filterOptions, setFilterSelection, filterSelection }) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked && !filterSelection.includes(e.target.value)) {
            setFilterSelection([...filterSelection, e.target.value]);
        } else {
            setFilterSelection(filterSelection.filter((selection: string) => selection !== e.target.value));
        }
    };
    return (
        <div className="p-5 text-lg">
            <h4 className="pb-3 text-darkerGray">Filter</h4>
            {filterOptions.map((filterOption: { title: string; id: number }) => {
                return (
                    <div key={filterOption.id} className="pb-2">
                        <input
                            className="form-checkbox h-5 w-5 text-purple rounded cursor-pointer"
                            type="checkbox"
                            value={filterOption.id}
                            id={`${filterOption.id}`}
                            onChange={(e) => handleChange(e)}
                        />
                        <label className="inline-block text-md cursor-pointer text-darkGray ml-2" htmlFor={`${filterOption.id}`}>
                            {filterOption.title}
                        </label>
                    </div>
                );
            })}
        </div>
    );
};