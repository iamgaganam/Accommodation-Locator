"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Property } from "@/lib/types";
import PropertyCard from "@/components/PropertyCard/PropertyCard";
import styles from "./page.module.css";

export default function Home() {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ properties: Property[] }>("/properties?status=approved&limit=3")
      .then((data) => setFeaturedProperties(data.properties || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      {/* ─── Hero Section ───────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            University of Plymouth — Official Housing Portal
          </div>
          <h1 className={styles.heroTitle}>
            Find Your Perfect
            <br />
            <span className={styles.heroHighlight}>Student Home</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Discover verified student accommodation near campus. 
            Browse listings, explore on an interactive map, and secure your ideal place to live.
          </p>
          <div className={styles.heroCta}>
            <Link href="/properties" className={styles.primaryBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Browse Properties
            </Link>
            <Link href="/register" className={styles.secondaryBtn}>
              List Your Property
            </Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>50+</span>
              <span className={styles.statLabel}>Properties</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>200+</span>
              <span className={styles.statLabel}>Students Housed</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>100%</span>
              <span className={styles.statLabel}>Verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────────────── */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>
            Finding your student accommodation is simple and straightforward
          </p>
          <div className={styles.stepsGrid}>
            <div className={styles.step}>
              <div className={styles.stepIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <h3>Browse & Explore</h3>
              <p>Search through verified listings and explore properties on an interactive map</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3>View Details</h3>
              <p>Check photos, amenities, pricing, and location details for each property</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3>Reserve</h3>
              <p>Send a reservation request directly to the landlord and get a response quickly</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured Properties ────────────────────────────────────── */}
      {!loading && featuredProperties.length > 0 && (
        <section className={styles.featured}>
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Featured Properties</h2>
                <p className={styles.sectionSubtitle}>
                  Handpicked listings near the University of Plymouth
                </p>
              </div>
              <Link href="/properties" className={styles.viewAllLink}>
                View All →
              </Link>
            </div>
            <div className={styles.propertyGrid}>
              {featuredProperties.map((property) => (
                <Link href={`/properties/${property.id}`} key={property.id}>
                  <PropertyCard property={property} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA Section ────────────────────────────────────────────── */}
      <section className={styles.cta}>
        <div className={styles.sectionContainer}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaContent}>
              <h2>Are you a landlord?</h2>
              <p>
                Register for free and list your properties to reach hundreds of
                Plymouth students looking for accommodation.
              </p>
              <Link href="/register" className={styles.ctaBtn}>
                Register as Landlord
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.sectionContainer}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <span className={styles.footerLogo}>PlymouthStays</span>
              <p>Official student accommodation portal for the University of Plymouth</p>
            </div>
            <div className={styles.footerLinks}>
              <Link href="/properties">Properties</Link>
              <Link href="/articles">Resources</Link>
              <Link href="/login">Sign In</Link>
              <Link href="/register">Register</Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© {new Date().getFullYear()} PlymouthStays. University of Plymouth.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
