package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"backend/handlers"
	"backend/middleware"
	"backend/models"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize Database
	ConnectDatabase()

	// Create uploads directory
	uploadDir := "./uploads"
	os.MkdirAll(uploadDir, os.ModePerm)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(DB)
	userHandler := handlers.NewUserHandler(DB)
	propertyHandler := handlers.NewPropertyHandler(DB, uploadDir)
	reservationHandler := handlers.NewReservationHandler(DB)
	articleHandler := handlers.NewArticleHandler(DB)

	// Setup router
	r := mux.NewRouter()

	// Serve uploaded images as static files
	r.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadDir))))

	// API subrouter
	api := r.PathPrefix("/api").Subrouter()

	// ─── Public Routes ──────────────────────────────────────────────
	api.HandleFunc("/auth/login", authHandler.Login).Methods("POST")
	api.HandleFunc("/auth/register", authHandler.Register).Methods("POST")

	// Public property listing (only approved ones for unauthenticated users)
	api.HandleFunc("/properties", propertyHandler.ListProperties).Methods("GET")
	api.HandleFunc("/properties/{id:[0-9]+}", propertyHandler.GetProperty).Methods("GET")

	// Public articles
	api.HandleFunc("/articles", articleHandler.ListArticles).Methods("GET")
	api.HandleFunc("/articles/{id:[0-9]+}", articleHandler.GetArticle).Methods("GET")

	// ─── Authenticated Routes ───────────────────────────────────────
	authRoutes := api.PathPrefix("").Subrouter()
	authRoutes.Use(middleware.AuthMiddleware)

	// Current user
	authRoutes.HandleFunc("/auth/me", authHandler.GetMe).Methods("GET")

	// ─── Landlord Routes ────────────────────────────────────────────
	landlordRoutes := authRoutes.PathPrefix("").Subrouter()
	landlordRoutes.Use(middleware.RoleMiddleware(models.RoleLandlord, models.RoleAdmin))

	landlordRoutes.HandleFunc("/properties", propertyHandler.CreateProperty).Methods("POST")
	landlordRoutes.HandleFunc("/properties/{id:[0-9]+}", propertyHandler.UpdateProperty).Methods("PUT")
	landlordRoutes.HandleFunc("/properties/{id:[0-9]+}", propertyHandler.DeleteProperty).Methods("DELETE")
	landlordRoutes.HandleFunc("/properties/{id:[0-9]+}/images", propertyHandler.UploadImages).Methods("POST")
	landlordRoutes.HandleFunc("/properties/{id:[0-9]+}/images/{imageId:[0-9]+}", propertyHandler.DeleteImage).Methods("DELETE")

	// Landlord reservation management
	landlordRoutes.HandleFunc("/reservations/{id:[0-9]+}/accept", reservationHandler.AcceptReservation).Methods("PUT")
	landlordRoutes.HandleFunc("/reservations/{id:[0-9]+}/deny", reservationHandler.DenyReservation).Methods("PUT")

	// ─── Warden Routes ──────────────────────────────────────────────
	wardenRoutes := authRoutes.PathPrefix("").Subrouter()
	wardenRoutes.Use(middleware.RoleMiddleware(models.RoleWarden, models.RoleAdmin))

	wardenRoutes.HandleFunc("/properties/{id:[0-9]+}/approve", propertyHandler.ApproveProperty).Methods("PUT")
	wardenRoutes.HandleFunc("/properties/{id:[0-9]+}/reject", propertyHandler.RejectProperty).Methods("PUT")

	// ─── Student Routes ─────────────────────────────────────────────
	studentRoutes := authRoutes.PathPrefix("").Subrouter()
	studentRoutes.Use(middleware.RoleMiddleware(models.RoleStudent, models.RoleAdmin))

	studentRoutes.HandleFunc("/reservations", reservationHandler.CreateReservation).Methods("POST")

	// ─── Shared Authenticated Routes (Reservations) ─────────────────
	authRoutes.HandleFunc("/reservations", reservationHandler.ListReservations).Methods("GET")

	// ─── Admin Routes ───────────────────────────────────────────────
	adminRoutes := authRoutes.PathPrefix("").Subrouter()
	adminRoutes.Use(middleware.RoleMiddleware(models.RoleAdmin))

	adminRoutes.HandleFunc("/users", userHandler.ListUsers).Methods("GET")
	adminRoutes.HandleFunc("/users", userHandler.CreateUser).Methods("POST")
	adminRoutes.HandleFunc("/users/{id:[0-9]+}", userHandler.GetUser).Methods("GET")
	adminRoutes.HandleFunc("/users/{id:[0-9]+}", userHandler.UpdateUser).Methods("PUT")
	adminRoutes.HandleFunc("/users/{id:[0-9]+}", userHandler.DeleteUser).Methods("DELETE")

	adminRoutes.HandleFunc("/articles", articleHandler.CreateArticle).Methods("POST")
	adminRoutes.HandleFunc("/articles/{id:[0-9]+}", articleHandler.UpdateArticle).Methods("PUT")
	adminRoutes.HandleFunc("/articles/{id:[0-9]+}", articleHandler.DeleteArticle).Methods("DELETE")

	// ─── CORS Configuration ─────────────────────────────────────────
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	// Start server
	port := ":8080"
	fmt.Printf("Server starting on http://localhost%s\n", port)
	fmt.Println("API routes registered:")
	fmt.Println("  POST   /api/auth/login")
	fmt.Println("  POST   /api/auth/register")
	fmt.Println("  GET    /api/auth/me")
	fmt.Println("  GET    /api/properties")
	fmt.Println("  POST   /api/properties")
	fmt.Println("  GET    /api/properties/:id")
	fmt.Println("  PUT    /api/properties/:id")
	fmt.Println("  DELETE /api/properties/:id")
	fmt.Println("  POST   /api/properties/:id/images")
	fmt.Println("  PUT    /api/properties/:id/approve")
	fmt.Println("  PUT    /api/properties/:id/reject")
	fmt.Println("  GET    /api/reservations")
	fmt.Println("  POST   /api/reservations")
	fmt.Println("  PUT    /api/reservations/:id/accept")
	fmt.Println("  PUT    /api/reservations/:id/deny")
	fmt.Println("  GET    /api/users")
	fmt.Println("  POST   /api/users")
	fmt.Println("  GET    /api/articles")
	fmt.Println("  POST   /api/articles")
	log.Fatal(http.ListenAndServe(port, handler))
}
