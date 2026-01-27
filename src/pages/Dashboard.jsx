import React, { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/authStore";
import Sidebar from "../components/Sidebar";
import ContentArea from "../components/ContentArea";

function roleTabs(role) {
    if (role === "CLIENT") {
        return ["Записи", "Избранное", "Платежи"];
    }
    // PSYCHOLOGIST / ADMIN
    return ["Записи", "График работы", "Групповые сессии"];
}

export default function Dashboard() {
    const { booting, me, role } = useAuth();

    const user = useMemo(() => {
        return {
            id: me?.id,
            name: me?.name || me?.fullName || me?.email || "Профиль",
            email: me?.email || "",
            role: role || null, // CLIENT | PSYCHOLOGIST | ADMIN
            avatarUrl: me?.avatarUrl || me?.avatar || null,
        };
    }, [me, role]);

    const tabs = useMemo(() => roleTabs(user.role), [user.role]);
    const [activeTab, setActiveTab] = useState(() => tabs[0] || "Записи");

    // если роль/вкладки поменялись — не даём активной вкладке быть несуществующей
    useEffect(() => {
        if (!tabs.includes(activeTab)) {
            setActiveTab(tabs[0] || "Записи");
        }
    }, [tabs, activeTab]);

    if (booting) {
        return null;
    }

    return (
        <div className="dashboard">
            <Sidebar user={user} setActiveTab={setActiveTab} activeTab={activeTab} />

            <main className="dashboard__content">
                <ContentArea activeTab={activeTab} user={user} />
            </main>
        </div>
    );
}
