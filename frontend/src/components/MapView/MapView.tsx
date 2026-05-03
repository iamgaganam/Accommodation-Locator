"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Property } from "@/lib/types";
import { getImageUrl } from "@/lib/api";
import styles from "./MapView.module.css";

mapboxgl.accessToken =
  "pk.eyJ1IjoiaWFtZ2FnYW5hbSIsImEiOiJjbW9wNnBlcXgxNHBlMnBxeTIyNXBrenN0In0.fKXRr8Yw5Riy-bW2qPpwOA";

interface MapViewProps {
  properties: Property[];
  selectedPropertyId?: number | null;
  onPropertySelect?: (property: Property) => void;
  className?: string;
  interactive?: boolean;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
}

export default function MapView({
  properties,
  selectedPropertyId,
  onPropertySelect,
  className = "",
  interactive = true,
  onMapClick,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const popup = useRef<mapboxgl.Popup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-4.1427, 50.3755], // University of Plymouth
      zoom: 13,
      pitch: 0,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right"
    );
    map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");
    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    // Click on map to get coordinates (for property creation)
    if (onMapClick) {
      map.current.on("click", (e: mapboxgl.MapMouseEvent) => {
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create popup content HTML
  const createPopupHTML = useCallback((property: Property) => {
    const primaryImage =
      property.images?.find((img) => img.is_primary) || property.images?.[0];
    const imageUrl = primaryImage
      ? getImageUrl(primaryImage.image_url)
      : "";

    return `
      <div class="${styles.popupCard}">
        ${
          imageUrl
            ? `<div class="${styles.popupImage}">
                <img src="${imageUrl}" alt="${property.title}" 
                  onerror="this.style.display='none'" />
                <div class="${styles.popupPrice}">
                  <span>£${property.rent_amount.toLocaleString()}</span>
                  <small>/mo</small>
                </div>
              </div>`
            : ""
        }
        <div class="${styles.popupContent}">
          <h4 class="${styles.popupTitle}">${property.title}</h4>
          <p class="${styles.popupAddress}">${property.address}</p>
          <div class="${styles.popupFeatures}">
            <span>${property.bedrooms} bed${property.bedrooms !== 1 ? "s" : ""}</span>
            <span>•</span>
            <span>${property.bathrooms} bath${property.bathrooms !== 1 ? "s" : ""}</span>
            <span>•</span>
            <span>Sleeps ${property.max_occupants}</span>
          </div>
          <div class="${styles.popupType}">${property.property_type}</div>
          <a href="/properties/${property.id}" class="${styles.popupLink}">
            View Details →
          </a>
        </div>
      </div>
    `;
  }, []);

  // Update markers when properties change
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();

    // Add new markers
    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoords = false;

    properties.forEach((property) => {
      if (!property.latitude || !property.longitude) return;

      hasValidCoords = true;
      bounds.extend([property.longitude, property.latitude]);

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.dataset.propertyId = String(property.id);

      if (selectedPropertyId === property.id) {
        el.classList.add("active");
      }

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([property.longitude, property.latitude])
        .addTo(map.current!);

      el.addEventListener("click", (e) => {
        e.stopPropagation();

        // Close existing popup
        popup.current?.remove();

        // Create new popup
        popup.current = new mapboxgl.Popup({
          offset: 25,
          maxWidth: "320px",
          closeButton: true,
        })
          .setLngLat([property.longitude, property.latitude])
          .setHTML(createPopupHTML(property))
          .addTo(map.current!);

        onPropertySelect?.(property);
      });

      markers.current.set(property.id, marker);
    });

    // Fit bounds if we have properties
    if (hasValidCoords && properties.length > 0) {
      if (properties.length === 1) {
        map.current.flyTo({
          center: [properties[0].longitude, properties[0].latitude],
          zoom: 15,
          duration: 1000,
        });
      } else {
        map.current.fitBounds(bounds, {
          padding: 60,
          maxZoom: 15,
          duration: 1000,
        });
      }
    }
  }, [properties, createPopupHTML, onPropertySelect, selectedPropertyId]);

  // Highlight selected marker and fly to it
  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (id === selectedPropertyId) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });

    if (selectedPropertyId) {
      const property = properties.find((p) => p.id === selectedPropertyId);
      if (property && property.latitude && property.longitude) {
        map.current.flyTo({
          center: [property.longitude, property.latitude],
          zoom: 15,
          duration: 800,
        });

        // Open popup for the selected property
        popup.current?.remove();
        popup.current = new mapboxgl.Popup({
          offset: 25,
          maxWidth: "320px",
          closeButton: true,
        })
          .setLngLat([property.longitude, property.latitude])
          .setHTML(createPopupHTML(property))
          .addTo(map.current!);
      }
    }
  }, [selectedPropertyId, properties, createPopupHTML]);

  return (
    <div className={`${styles.mapContainer} ${className}`}>
      <div ref={mapContainer} className={styles.map} />
    </div>
  );
}
