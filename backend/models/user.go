package models

import (
	"time"
)

// Role constants
const (
	RoleAdmin    = "admin"
	RoleLandlord = "landlord"
	RoleWarden   = "warden"
	RoleStudent  = "student"
)

// User represents a system user with one of four roles
type User struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null;size:255"`
	PasswordHash string    `json:"-" gorm:"not null"`
	FullName     string    `json:"full_name" gorm:"not null;size:255"`
	Phone        string    `json:"phone" gorm:"size:20"`
	Role         string    `json:"role" gorm:"not null;size:20;index"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
