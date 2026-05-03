package main

import (
	"fmt"
	"log"

	"backend/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DB is the global database connection instance
var DB *gorm.DB

// ConnectDatabase establishes the PostgreSQL connection and runs migrations
func ConnectDatabase() {
	dsn := "host=localhost user=postgres password=admin123 dbname=AccommodationLocator port=5432 sslmode=disable"
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Ping the database to verify connection
	sqlDB, err := database.DB()
	if err != nil {
		log.Fatal("Failed to get database instance:", err)
	}

	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Database connection is not alive:", err)
	}

	fmt.Println("Successfully connected to the database and verified connection!")
	DB = database

	// Run auto migrations
	RunMigrations()

	// Seed default admin user
	SeedDefaultAdmin()
}

// RunMigrations creates/updates database tables based on model definitions
func RunMigrations() {
	err := DB.AutoMigrate(
		&models.User{},
		&models.Property{},
		&models.PropertyImage{},
		&models.Reservation{},
		&models.Article{},
	)
	if err != nil {
		log.Fatal("Failed to run database migrations:", err)
	}
	fmt.Println("Database migrations completed successfully!")
}

// SeedDefaultAdmin creates a default admin user if none exists
func SeedDefaultAdmin() {
	var count int64
	DB.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count)

	if count == 0 {
		hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("Failed to hash admin password:", err)
		}

		admin := models.User{
			Email:        "admin@plymouth.ac.uk",
			PasswordHash: string(hash),
			FullName:     "System Administrator",
			Phone:        "+44 1752 600600",
			Role:         models.RoleAdmin,
		}

		if err := DB.Create(&admin).Error; err != nil {
			log.Println("Warning: Failed to create default admin user:", err)
		} else {
			fmt.Println("Default admin user created: admin@plymouth.ac.uk / admin123")
		}

		// Also seed a default warden
		wardenHash, _ := bcrypt.GenerateFromPassword([]byte("warden123"), bcrypt.DefaultCost)
		warden := models.User{
			Email:        "warden@plymouth.ac.uk",
			PasswordHash: string(wardenHash),
			FullName:     "Campus Warden",
			Phone:        "+44 1752 600601",
			Role:         models.RoleWarden,
		}
		if err := DB.Create(&warden).Error; err != nil {
			log.Println("Warning: Failed to create default warden user:", err)
		} else {
			fmt.Println("Default warden user created: warden@plymouth.ac.uk / warden123")
		}

		// Seed a test landlord
		landlordHash, _ := bcrypt.GenerateFromPassword([]byte("landlord123"), bcrypt.DefaultCost)
		landlord := models.User{
			Email:        "landlord@example.com",
			PasswordHash: string(landlordHash),
			FullName:     "John Smith Properties",
			Phone:        "+44 7700 900001",
			Role:         models.RoleLandlord,
		}
		if err := DB.Create(&landlord).Error; err != nil {
			log.Println("Warning: Failed to create test landlord:", err)
		} else {
			fmt.Println("Test landlord created: landlord@example.com / landlord123")
		}

		// Seed a test student
		studentHash, _ := bcrypt.GenerateFromPassword([]byte("student123"), bcrypt.DefaultCost)
		student := models.User{
			Email:        "student@plymouth.ac.uk",
			PasswordHash: string(studentHash),
			FullName:     "Jane Doe",
			Phone:        "+44 7700 900002",
			Role:         models.RoleStudent,
		}
		if err := DB.Create(&student).Error; err != nil {
			log.Println("Warning: Failed to create test student:", err)
		} else {
			fmt.Println("Test student created: student@plymouth.ac.uk / student123")
		}

		// Seed sample properties around Plymouth
		SeedSampleProperties(landlord.ID)
	}
}

// SeedSampleProperties creates sample property listings around the University of Plymouth campus
func SeedSampleProperties(landlordID uint) {
	properties := []models.Property{
		{
			LandlordID:   landlordID,
			Title:        "Modern Studio near Drake Circus",
			Description:  "A beautifully furnished studio apartment just 5 minutes walk from Drake Circus Shopping Centre. Perfect for a single student looking for a cozy, well-maintained space with all bills included. Features include a modern kitchenette, en-suite bathroom, and high-speed internet.",
			PropertyType: "Studio",
			Bedrooms:     1,
			Bathrooms:    1,
			MaxOccupants: 1,
			RentAmount:   550,
			Address:      "15 North Hill, Plymouth",
			City:         "Plymouth",
			Postcode:     "PL4 8JY",
			Latitude:     50.3762,
			Longitude:    -4.1385,
			Status:       models.StatusApproved,
		},
		{
			LandlordID:   landlordID,
			Title:        "Spacious 3-Bed House in Mutley",
			Description:  "Large 3-bedroom terraced house in the heart of Mutley Plain. Recently refurbished with a new kitchen, modern bathroom, and a private rear garden. Walking distance to campus and local amenities. Ideal for a group of students or professionals.",
			PropertyType: "House",
			Bedrooms:     3,
			Bathrooms:    2,
			MaxOccupants: 4,
			RentAmount:   1200,
			Address:      "42 Mutley Plain, Plymouth",
			City:         "Plymouth",
			Postcode:     "PL4 6LF",
			Latitude:     50.3810,
			Longitude:    -4.1290,
			Status:       models.StatusApproved,
		},
		{
			LandlordID:   landlordID,
			Title:        "Cozy 1-Bed Flat at The Barbican",
			Description:  "Charming one-bedroom flat overlooking the historic Barbican area. This bright and airy property offers stunning harbour views, wooden floors, and is close to restaurants, bars, and the waterfront. Perfect for those who want to experience Plymouth's culture.",
			PropertyType: "Flat",
			Bedrooms:     1,
			Bathrooms:    1,
			MaxOccupants: 2,
			RentAmount:   700,
			Address:      "8 Southside Street, The Barbican, Plymouth",
			City:         "Plymouth",
			Postcode:     "PL1 2LA",
			Latitude:     50.3660,
			Longitude:    -4.1340,
			Status:       models.StatusApproved,
		},
		{
			LandlordID:   landlordID,
			Title:        "4-Bed Shared House near Campus",
			Description:  "Excellent 4-bedroom shared house located within a 2-minute walk of the University of Plymouth campus. Each room is generously sized and comes with a desk, wardrobe, and bed. Shared kitchen and two bathrooms. Bills included in the rent.",
			PropertyType: "House",
			Bedrooms:     4,
			Bathrooms:    2,
			MaxOccupants: 4,
			RentAmount:   480,
			Address:      "22 Portland Villas, Plymouth",
			City:         "Plymouth",
			Postcode:     "PL4 8NH",
			Latitude:     50.3745,
			Longitude:    -4.1420,
			Status:       models.StatusPending,
		},
		{
			LandlordID:   landlordID,
			Title:        "Luxury 2-Bed Apartment at Millbay",
			Description:  "Brand new luxury apartment at the Millbay waterfront development. Features two spacious double bedrooms, an open-plan living area with floor-to-ceiling windows, a designer kitchen with integrated appliances, and access to a private gym and communal gardens.",
			PropertyType: "Flat",
			Bedrooms:     2,
			Bathrooms:    2,
			MaxOccupants: 3,
			RentAmount:   950,
			Address:      "Millbay Marina Village, Plymouth",
			City:         "Plymouth",
			Postcode:     "PL1 3EF",
			Latitude:     50.3670,
			Longitude:    -4.1500,
			Status:       models.StatusApproved,
		},
		{
			LandlordID:   landlordID,
			Title:        "Budget Room in Stoke Village",
			Description:  "Affordable single room in a friendly shared house in Stoke Village. The property has a fully equipped shared kitchen, a clean bathroom, and a communal living room. Great value for money with easy bus access to the university campus.",
			PropertyType: "Room",
			Bedrooms:     1,
			Bathrooms:    1,
			MaxOccupants: 1,
			RentAmount:   350,
			Address:      "5 Devonport Road, Stoke, Plymouth",
			City:         "Plymouth",
			Postcode:     "PL3 4DL",
			Latitude:     50.3730,
			Longitude:    -4.1580,
			Status:       models.StatusApproved,
		},
	}

	for _, p := range properties {
		if err := DB.Create(&p).Error; err != nil {
			log.Printf("Warning: Failed to seed property '%s': %v\n", p.Title, err)
		}
	}
	fmt.Printf("Seeded %d sample properties\n", len(properties))

	// Seed a sample article
	article := models.Article{
		AuthorID:  1, // Admin
		Title:     "Tips for Finding Student Accommodation in Plymouth",
		Content:   "Finding the right accommodation is one of the most important decisions you'll make as a student. Here are some essential tips to help you find the perfect place:\n\n## Start Early\nBegin your search at least 3-4 months before the start of the academic year. The best properties get snapped up quickly.\n\n## Set a Budget\nConsider all costs including rent, bills, food, and travel. Many student properties include bills in the rent, which makes budgeting easier.\n\n## Location Matters\nLook for properties within walking distance of campus or with good public transport links. Areas like Mutley, Greenbank, and Stoke are popular with students.\n\n## Check the Property\nAlways visit the property in person before committing. Check for damp, working appliances, and adequate heating.\n\n## Know Your Rights\nAs a tenant, you have legal rights. Make sure you receive a proper tenancy agreement and your deposit is protected in a government-approved scheme.\n\n## Use University Resources\nThe University of Plymouth offers accommodation advice through the Student Hub. Don't hesitate to ask for help!",
		Published: true,
	}
	DB.Create(&article)
	fmt.Println("Seeded sample article")
}
