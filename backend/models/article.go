package models

import (
	"time"
)

// Article represents an informational post by the admin
type Article struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	AuthorID  uint      `json:"author_id" gorm:"not null;index"`
	Author    User      `json:"author" gorm:"foreignKey:AuthorID"`
	Title     string    `json:"title" gorm:"not null;size:255"`
	Content   string    `json:"content" gorm:"type:text;not null"`
	Published bool      `json:"published" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
