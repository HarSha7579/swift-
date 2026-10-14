import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { notificationAPI } from "../services/api";
import { useAuth } from "./AuthContext";

interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isFetching = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user || isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const data = await notificationAPI.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user]);

  // Polling every 30 seconds for real-time notifications feel (only when tab is visible)
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markRead = async (id: number) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        Array.isArray(prev) ? prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif)) : []
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await notificationAPI.delete(id);
      setNotifications((prev) => Array.isArray(prev) ? prev.filter((notif) => notif.id !== id) : []);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const unreadCount = Array.isArray(notifications) ? notifications.filter((notif) => !notif.isRead).length : 0;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
