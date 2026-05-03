package models

import (
	"time"
)

// Reservation status constants
const (
	ReservationPending  = "pending"
	ReservationAccepted = "accepted"
	ReservationDenied   = "denied"
)

// Reservation represents a student's request to rent a property
type Reservation struct {
	ID               uint      `json:"id" gorm:"primaryKey"`
	PropertyID       uint      `json:"property_id" gorm:"not null;index"`
	Property         Property  `json:"property" gorm:"foreignKey:PropertyID"`
	StudentID        uint      `json:"student_id" gorm:"not null;index"`
	Student          User      `json:"student" gorm:"foreignKey:StudentID"`
	Status           string    `json:"status" gorm:"not null;default:'pending';size:20"`
	Message          string    `json:"message" gorm:"type:text"`
	LandlordResponse string    `json:"landlord_response" gorm:"type:text"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}
