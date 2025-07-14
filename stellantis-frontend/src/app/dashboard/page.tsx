"use client";

import ManagerDashboard from "@/components/dashboard/manager-dashboard";

const DashboardLoadingSkeleton = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground">Loading your dashboard...</p>
    </div>
  );
};

const DashboardPage = () => {
  return <ManagerDashboard />;
};

export default DashboardPage;
