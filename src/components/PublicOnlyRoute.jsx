import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

export default function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;
  if (user) return <Navigate to="/app" replace />;

  return <Outlet />;
}
