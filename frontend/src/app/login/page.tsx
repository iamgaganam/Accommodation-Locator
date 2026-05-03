"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import styles from "./page.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(email, password);
      await refreshUser();
      showToast(`Welcome back, ${data.user.full_name}!`, "success");

      // Route based on role
      switch (data.user.role) {
        case "admin":
        case "landlord":
        case "warden":
        case "student":
          router.push("/dashboard");
          break;
        default:
          router.push("/properties");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your PlymouthStays account</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password">Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.showPassword}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <p className={styles.switchText}>
          Are you a landlord?{" "}
          <Link href="/register" className={styles.switchLink}>
            Register for free
          </Link>
        </p>

        <div className={styles.testAccounts}>
          <p className={styles.testTitle}>Test Accounts:</p>
          <div className={styles.testGrid}>
            <button type="button" className={styles.testBtn} onClick={() => { setEmail("admin@plymouth.ac.uk"); setPassword("admin123"); }}>
              Admin
            </button>
            <button type="button" className={styles.testBtn} onClick={() => { setEmail("warden@plymouth.ac.uk"); setPassword("warden123"); }}>
              Warden
            </button>
            <button type="button" className={styles.testBtn} onClick={() => { setEmail("landlord@example.com"); setPassword("landlord123"); }}>
              Landlord
            </button>
            <button type="button" className={styles.testBtn} onClick={() => { setEmail("student@plymouth.ac.uk"); setPassword("student123"); }}>
              Student
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
