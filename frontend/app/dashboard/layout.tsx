"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  BusFront, 
  LayoutDashboard, 
  Users, 
  Map, 
  LogOut, 
  Bell, 
  Settings
} from "lucide-react";
import Link from "next/link";
import styles from "./layout.module.css";
import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const getBreadcrumb = () => {
    if (pathname.includes('/captain')) return 'Captain Dashboard';
    if (pathname.includes('/depot')) return 'Depot Operations';
    if (pathname.includes('/ops')) return 'Global Executive View';
    return 'Dashboard';
  };

  const getRoleNav = () => {
    // Build query string from current URL params (to preserve captainId, captainName, etc.)
    const queryString = searchParams.toString();
    const queryPrefix = queryString ? `?${queryString}` : '';
    
    // For demo purposes, we define static nav paths for whichever dashboard is currently active.
    // In reality this would be driven by the user's role.
    if (pathname.includes('/captain')) {
      return [
        { name: "My Performance", href: `/dashboard/captain${queryPrefix}`, icon: <LayoutDashboard size={20} /> },
        { name: "Trip History", href: `/dashboard/captain/history${queryPrefix}`, icon: <Map size={20} /> }
      ];
    } else if (pathname.includes('/depot')) {
      return [
        { name: "Depot Status", href: "/dashboard/depot", icon: <LayoutDashboard size={20} /> },
        { name: "Captain Attendance", href: "/dashboard/depot/roster", icon: <Users size={20} /> }
      ];
    } else {
      return [
        { name: "Global Overview", href: "/dashboard/ops", icon: <LayoutDashboard size={20} /> }
      ];
    }
  };

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoIcon}>
            <BusFront size={28} strokeWidth={2.5} />
          </div>
          <div className={styles.logoText}>FreshBus</div>
        </div>

        <nav className={styles.nav}>
          {getRoleNav().map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                href={item.href} 
                key={item.name}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <div className={styles.navIcon}>{item.icon}</div>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Top Header */}
        <header className={styles.topBar}>
          <div className={styles.breadcrumb}>
            {getBreadcrumb()}
          </div>
          <div className={styles.profileInfo}>
            <button className={styles.notificationBtn}>
              <Bell size={20} />
              <span className={styles.badge}></span>
            </button>
            <div className={styles.avatar}>
              {pathname.includes('/captain') ? 'CP' : pathname.includes('/depot') ? 'DM' : 'OM'}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className={styles.scrollArea}>
          <div className={styles.pageTransition}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
