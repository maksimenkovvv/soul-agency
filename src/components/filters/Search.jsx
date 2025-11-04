import React from 'react';

const Search = ({ onSearch }) => {
    // const [searchTerm, setSearchTerm] = React.useState('');

    // React.useEffect(() => {
    //     const timerId = setTimeout(() => {
    //         onSearch(searchTerm);
    //     }, 500);

    //     return () => {
    //         clearTimeout(timerId);
    //     };
    // }, [searchTerm, onSearch]);

    // const handleSearchChange = (event) => {
    //     setSearchTerm(event.target.value);
    // };

    return (
        <div className="b-search">
            {/* <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.55 18.1C14.272 18.1 18.1 14.272 18.1 9.55C18.1 4.82798 14.272 1 9.55 1C4.82798 1 1 4.82798 1 9.55C1 14.272 4.82798 18.1 9.55 18.1Z" stroke="#8885FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19.0001 19.0001L17.2001 17.2001" stroke="#8885FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg> */}
            <input
                type="text"
                className="search-input"
                placeholder="Имя, стаж, метод"
            // value={searchTerm}
            // onChange={handleSearchChange}
            />
        </div>
    );
};

export default Search;
