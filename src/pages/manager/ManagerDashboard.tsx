import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, CalendarDays, ShoppingBag, MessageCircle, Bell } from "lucide-react";
import MenuManagement from "./MenuManagement";
import ScheduleManagement from "./ScheduleManagement";
import OrderManagement from "./OrderManagement";
import ChatManagement from "./ChatManagement";
import NotificationsPanel from "./NotificationsPanel";

const ManagerDashboard = () => {
  const { role, loading } = useAuth();

  if (loading) return null;
  if (role !== "manager") return <Navigate to="/" replace />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif font-bold mb-8">Manager Dashboard</h1>
      <Tabs defaultValue="menu" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="menu" className="gap-1"><ChefHat className="h-4 w-4" /> Menu</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1"><CalendarDays className="h-4 w-4" /> Schedule</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1"><ShoppingBag className="h-4 w-4" /> Orders</TabsTrigger>
          <TabsTrigger value="chat" className="gap-1"><MessageCircle className="h-4 w-4" /> Chat</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" /> Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="menu"><MenuManagement /></TabsContent>
        <TabsContent value="schedule"><ScheduleManagement /></TabsContent>
        <TabsContent value="orders"><OrderManagement /></TabsContent>
        <TabsContent value="chat"><ChatManagement /></TabsContent>
        <TabsContent value="notifications"><NotificationsPanel /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagerDashboard;
