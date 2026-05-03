package models

import (
	"time"
)

// Property status constants
const (
	StatusPending  = "pending"
	StatusApproved = "approved"
	StatusRejected = "rejected"
)

// Property represents a rental property listing
type Property struct {
	ID              uint            `json:"id" gorm:"primaryKey"`
	LandlordID      uint            `json:"landlord_id" gorm:"not null;index"`
	Landlord        User            `json:"landlord" gorm:"foreignKey:LandlordID"`
	Title           string          `json:"title" gorm:"not null;size:255"`
	Description     string          `json:"description" gorm:"type:text"`
	PropertyType    string          `json:"property_type" gorm:"not null;size:50"`
	Bedrooms        int             `json:"bedrooms" gorm:"not null;default:1"`
	Bathrooms       int             `json:"bathrooms" gorm:"not null;default:1"`
	MaxOccupants    int             `json:"max_occupants" gorm:"not null;default:1"`
	RentAmount      float64         `json:"rent_amount" gorm:"not null"`
	Address         string          `json:"address" gorm:"not null;size:500"`
	City            string          `json:"city" gorm:"size:100"`
	Postcode        string          `json:"postcode" gorm:"size:20"`
	Latitude        float64         `json:"latitude" gorm:"not null"`
	Longitude       float64         `json:"longitude" gorm:"not null"`
	Status          string          `json:"status" gorm:"not null;default:'pending';size:20;index"`
	RejectionReason string          `json:"rejection_reason" gorm:"type:text"`
	Images          []PropertyImage `json:"images" gorm:"foreignKey:PropertyID;constraint:OnDelete:CASCADE"`
	Reservations    []Reservation   `json:"reservations,omitempty" gorm:"foreignKey:PropertyID"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// PropertyImage stores image URLs associated with a property
type PropertyImage struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	PropertyID uint      `json:"property_id" gorm:"not null;index"`
	ImageURL   string    `json:"image_url" gorm:"not null;size:500"`
	IsPrimary  bool      `json:"is_primary" gorm:"default:false"`
	CreatedAt  time.Time `json:"created_at"`
}
