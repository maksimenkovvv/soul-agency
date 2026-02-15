// При переходе по внутренней ссылке новая страница открывается сверху
import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop({ children }) {
    const location = useLocation();

    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, [location]);

    return children;
}

export default ScrollToTop;