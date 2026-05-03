"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, isAuthenticated, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/properties", label: "Browse Properties", public: true },
    { href: "/articles", label: "Resources", public: true },
  ];

  const getDashboardLabel = () => {
    if (!user) return "Dashboard";
    switch (user.role) {
      case "admin": return "Admin Panel";
      case "landlord": return "My Properties";
      case "warden": return "Review Properties";
      case "student": return "My Reservations";
      default: return "Dashboard";
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.brand}>
          <div className={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className={styles.brandText}>
            <span className={styles.brandPrimary}>Plymouth</span>
            <span className={styles.brandSecondary}>Stays</span>
          </span>
        </Link>

        <div className={`${styles.navLinks} ${mobileOpen ? styles.open : ""}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.active : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated && (
            <Link
              href="/dashboard"
              className={`${styles.navLink} ${pathname.startsWith("/dashboard") ? styles.active : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {getDashboardLabel()}
            </Link>
          )}
        </div>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <div className={styles.userMenu}>
              <div className={styles.avatar}>
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.full_name}</span>
                <span className={styles.userRole}>{user?.role}</span>
              </div>
              <button
                type="button"
                onClick={signOut}
                className={styles.logoutBtn}
                title="Sign out"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link href="/login" className={styles.loginBtn}>
                Sign In
              </Link>
              <Link href="/register" className={styles.registerBtn}>
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            <span className={`${styles.hamburgerLine} ${mobileOpen ? styles.open : ""}`} />
            <span className={`${styles.hamburgerLine} ${mobileOpen ? styles.open : ""}`} />
            <span className={`${styles.hamburgerLine} ${mobileOpen ? styles.open : ""}`} />
          </button>
        </div>
      </div>
    </nav>
  );
}
