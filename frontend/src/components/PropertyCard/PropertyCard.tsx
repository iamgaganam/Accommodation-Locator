"use client";

import type { Property } from "@/lib/types";
import { getImageUrl } from "@/lib/api";
import styles from "./PropertyCard.module.css";

interface PropertyCardProps {
  property: Property;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export default function PropertyCard({
  property,
  isSelected = false,
  onClick,
  compact = false,
}: PropertyCardProps) {
  const primaryImage = property.images?.find((img) => img.is_primary) || property.images?.[0];
  const imageUrl = primaryImage
    ? getImageUrl(primaryImage.image_url)
    : "/placeholder-property.jpg";

  const statusColors: Record<string, string> = {
    approved: styles.statusApproved,
    pending: styles.statusPending,
    rejected: styles.statusRejected,
  };

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ""} ${compact ? styles.compact : ""}`}
      onClick={onClick}
      id={`property-card-${property.id}`}
    >
      <div className={styles.imageWrapper}>
        <img
          src={imageUrl}
          alt={property.title}
          className={styles.image}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' fill='%23e2e8f0'%3E%3Crect width='400' height='250'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%2394a3b8' font-family='Inter,sans-serif' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
          }}
        />
        <div className={styles.priceTag}>
          <span className={styles.currency}>£</span>
          <span className={styles.price}>{property.rent_amount.toLocaleString()}</span>
          <span className={styles.period}>/mo</span>
        </div>
        {property.status !== "approved" && (
          <span className={`${styles.statusBadge} ${statusColors[property.status]}`}>
            {property.status}
          </span>
        )}
        {property.images?.length > 1 && (
          <span className={styles.imageCount}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {property.images.length}
          </span>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{property.title}</h3>
        <p className={styles.address}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {property.address}
        </p>
        <div className={styles.features}>
          <span className={styles.feature}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7" />
              <path d="M21 10H3" />
              <path d="M5 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
            </svg>
            {property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
          </span>
          <span className={styles.feature}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12h16a1 1 0 0 1 1 1v3H3v-3a1 1 0 0 1 1-1z" />
              <path d="M6 12V5a2 2 0 0 1 2-2h3v2.25" />
              <rect x="3" y="16" width="18" height="4" rx="1" />
            </svg>
            {property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}
          </span>
          <span className={styles.feature}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {property.max_occupants}
          </span>
        </div>
        <div className={styles.meta}>
          <span className={styles.type}>{property.property_type}</span>
          {property.landlord && (
            <span className={styles.landlord}>by {property.landlord.full_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}
