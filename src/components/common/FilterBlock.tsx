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
                    <div key={filterOption.id} className="pb-2 group">
                        <input
                            className="form-checkbox h-5 w-5 text-purple rounded cursor-pointer border-gray-300"
                            type="checkbox"
                            value={filterOption.id}
                            id={`${filterOption.id}`}
                            onChange={(e) => handleChange(e)}
                        />
                        <label className="group-hover:text-purple inline-block text-base cursor-pointer text-darkGray ml-3" htmlFor={`${filterOption.id}`}>
                            {filterOption.title}
                        </label>
                    </div>
                );
            })}
        </div>
    );
};