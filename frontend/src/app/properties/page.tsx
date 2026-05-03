"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Property } from "@/lib/types";
import PropertyCard from "@/components/PropertyCard/PropertyCard";
import MapView from "@/components/MapView/MapView";
import styles from "./page.module.css";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: "approved",
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);

      const data = await apiFetch<{ properties: Property[]; total: number }>(
        `/properties?${params}`
      );
      setProperties(data.properties || []);
      setTotal(data.total);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handlePropertySelect = (property: Property) => {
    setSelectedPropertyId(property.id);
    // Scroll the card into view
    const card = document.getElementById(`property-card-${property.id}`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProperties();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <main className={styles.page}>
      {/* ─── Search Bar ─────────────────────────────────────────────── */}
      <div className={styles.searchBar}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by title, address, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="property-search-input"
          />
          <button type="submit">Search</button>
        </form>
        <div className={styles.resultCount}>
          {total} propert{total !== 1 ? "ies" : "y"} found
        </div>
      </div>

      {/* ─── Split View: List + Map ─────────────────────────────────── */}
      <div className={styles.splitView}>
        {/* Property List (Left Panel) */}
        <div className={styles.listPanel}>
          {loading ? (
            <div className={styles.loadingGrid}>
              {[...Array(4)].map((_, i) => (
                <div key={`skeleton-${i}`} className={styles.skeletonCard}>
                  <div className="skeleton" style={{ height: 140 }} />
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="skeleton" style={{ height: 20, width: "80%" }} />
                    <div className="skeleton" style={{ height: 14, width: "60%" }} />
                    <div className="skeleton" style={{ height: 14, width: "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <h3>No properties found</h3>
              <p>Try adjusting your search criteria</p>
            </div>
          ) : (
            <>
              <div className={styles.propertyList}>
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSelected={selectedPropertyId === property.id}
                    onClick={() => setSelectedPropertyId(property.id)}
                    compact
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={styles.pageBtn}
                  >
                    ← Prev
                  </button>
                  <span className={styles.pageInfo}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={styles.pageBtn}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Map (Right Panel) */}
        <div className={styles.mapPanel}>
          <MapView
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            onPropertySelect={handlePropertySelect}
          />
        </div>
      </div>
    </main>
  );
}
