"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, getImageUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { Property } from "@/lib/types";
import MapView from "@/components/MapView/MapView";
import styles from "./page.module.css";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [reserveMessage, setReserveMessage] = useState("");
  const [reserving, setReserving] = useState(false);
  const [showReserveForm, setShowReserveForm] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const data = await apiFetch<Property>(`/properties/${params.id}`);
        setProperty(data);
      } catch {
        showToast("Property not found", "error");
        router.push("/properties");
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [params.id, router, showToast]);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Please sign in to reserve a property", "warning");
      router.push("/login");
      return;
    }

    setReserving(true);
    try {
      await apiFetch("/reservations", {
        method: "POST",
        body: {
          property_id: property?.id,
          message: reserveMessage,
        },
      });
      showToast("Reservation request sent successfully!", "success");
      setShowReserveForm(false);
      setReserveMessage("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reserve";
      showToast(message, "error");
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className="skeleton" style={{ height: 400, borderRadius: 16, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 32, width: "60%", marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 20, width: "40%", marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 200, marginBottom: 24 }} />
        </div>
      </main>
    );
  }

  if (!property) return null;

  const images = property.images || [];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* ─── Back Navigation ──────────────────────────────────────── */}
        <button type="button" onClick={() => router.back()} className={styles.backBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to listings
        </button>

        {/* ─── Image Gallery ───────────────────────────────────────── */}
        <div className={styles.gallery}>
          <div className={styles.mainImage}>
            {images.length > 0 ? (
              <img
                src={getImageUrl(images[activeImage].image_url)}
                alt={property.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' fill='%23e2e8f0'%3E%3Crect width='800' height='400'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%2394a3b8' font-family='sans-serif' font-size='18'%3ENo Image Available%3C/text%3E%3C/svg%3E";
                }}
              />
            ) : (
              <div className={styles.noImage}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>No images uploaded</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className={styles.thumbnails}>
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={`${styles.thumbnail} ${i === activeImage ? styles.activeThumbnail : ""}`}
                  onClick={() => setActiveImage(i)}
                >
                  <img src={getImageUrl(img.image_url)} alt={`${property.title} - ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Details Grid ────────────────────────────────────────── */}
        <div className={styles.detailsGrid}>
          <div className={styles.mainDetails}>
            <div className={styles.titleRow}>
              <div>
                <span className={styles.typeBadge}>{property.property_type}</span>
                <h1 className={styles.title}>{property.title}</h1>
                <p className={styles.address}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {property.address}, {property.city} {property.postcode}
                </p>
              </div>
              <div className={styles.priceBlock}>
                <span className={styles.priceAmount}>£{property.rent_amount.toLocaleString()}</span>
                <span className={styles.pricePeriod}>per month</span>
              </div>
            </div>

            {/* Features */}
            <div className={styles.features}>
              <div className={styles.featureCard}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7" />
                  <path d="M21 10H3" />
                </svg>
                <div>
                  <span className={styles.featureValue}>{property.bedrooms}</span>
                  <span className={styles.featureLabel}>Bedroom{property.bedrooms !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className={styles.featureCard}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12h16a1 1 0 0 1 1 1v3H3v-3a1 1 0 0 1 1-1z" />
                  <rect x="3" y="16" width="18" height="4" rx="1" />
                </svg>
                <div>
                  <span className={styles.featureValue}>{property.bathrooms}</span>
                  <span className={styles.featureLabel}>Bathroom{property.bathrooms !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className={styles.featureCard}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <div>
                  <span className={styles.featureValue}>{property.max_occupants}</span>
                  <span className={styles.featureLabel}>Max Guests</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className={styles.descriptionSection}>
              <h2>About this property</h2>
              <p>{property.description}</p>
            </div>

            {/* Landlord Info */}
            {property.landlord && (
              <div className={styles.landlordSection}>
                <h2>Listed by</h2>
                <div className={styles.landlordCard}>
                  <div className={styles.landlordAvatar}>
                    {property.landlord.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className={styles.landlordName}>{property.landlord.full_name}</span>
                    <span className={styles.landlordContact}>{property.landlord.email}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Map */}
            <div className={styles.mapSection}>
              <h2>Location</h2>
              <div className={styles.mapWrapper}>
                <MapView
                  properties={[property]}
                  selectedPropertyId={property.id}
                />
              </div>
            </div>
          </div>

          {/* ─── Sidebar ──────────────────────────────────────────── */}
          <div className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarPrice}>
                <span>£{property.rent_amount.toLocaleString()}</span>
                <small>/month</small>
              </div>

              {user?.role === "student" && property.status === "approved" && (
                <>
                  {!showReserveForm ? (
                    <button
                      type="button"
                      className={styles.reserveBtn}
                      onClick={() => setShowReserveForm(true)}
                    >
                      Reserve This Property
                    </button>
                  ) : (
                    <form onSubmit={handleReserve} className={styles.reserveForm}>
                      <textarea
                        value={reserveMessage}
                        onChange={(e) => setReserveMessage(e.target.value)}
                        placeholder="Introduce yourself and explain why you're interested..."
                        rows={4}
                        className={styles.reserveTextarea}
                      />
                      <button
                        type="submit"
                        className={styles.reserveBtn}
                        disabled={reserving}
                      >
                        {reserving ? "Sending..." : "Send Reservation Request"}
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => setShowReserveForm(false)}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </>
              )}

              {!user && property.status === "approved" && (
                <button
                  type="button"
                  className={styles.reserveBtn}
                  onClick={() => router.push("/login")}
                >
                  Sign in to Reserve
                </button>
              )}

              <div className={styles.sidebarInfo}>
                <div className={styles.sidebarRow}>
                  <span>Property Type</span>
                  <strong>{property.property_type}</strong>
                </div>
                <div className={styles.sidebarRow}>
                  <span>Bedrooms</span>
                  <strong>{property.bedrooms}</strong>
                </div>
                <div className={styles.sidebarRow}>
                  <span>Bathrooms</span>
                  <strong>{property.bathrooms}</strong>
                </div>
                <div className={styles.sidebarRow}>
                  <span>Max Occupants</span>
                  <strong>{property.max_occupants}</strong>
                </div>
                <div className={styles.sidebarRow}>
                  <span>City</span>
                  <strong>{property.city || "Plymouth"}</strong>
                </div>
                <div className={styles.sidebarRow}>
                  <span>Postcode</span>
                  <strong>{property.postcode}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
