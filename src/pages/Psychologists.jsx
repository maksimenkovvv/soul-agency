import React from "react";
import { useSearchParams } from "react-router-dom";

import PsychologistTitle from "../components/PsychologistsTitle";
import OurPsychologists from "../components/OurPsychologistsBlock";
import Filters from "../components/filters/Filters";

function Psychologist() {
    const [filters, setFilters] = React.useState({
        q: "",
        themes: [],
        methods: [],
        experience: [],
        price: [],
    });

    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get("bookingId");
    const paymentReturn = searchParams.get("payment") === "return";

    return (
        <div className="psychologists">
            <PsychologistTitle />
            <Filters value={filters} onFilterChange={setFilters} />

            <OurPsychologists
                showTitle={false}
                query={filters}
                allowLoadMore
                autoOpenBookingId={bookingId}
                autoOpenAfterPayment={paymentReturn}
            />
        </div>
    );
}

export default Psychologist;
