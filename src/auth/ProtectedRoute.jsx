import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, hasRole } from "./authStore";

export default function ProtectedRoute({ roles }) {
    const { booting, isAuthenticated, role } = useAuth();
    const location = useLocation();

    if (booting) return null;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (roles?.length && !hasRole(role, roles)) {
        return <Navigate to="/403" replace />;
    }

    return <Outlet />;
}
