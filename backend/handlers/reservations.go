package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/middleware"
	"backend/models"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// ReservationHandler handles reservation endpoints
type ReservationHandler struct {
	DB *gorm.DB
}

// NewReservationHandler creates a new ReservationHandler
func NewReservationHandler(db *gorm.DB) *ReservationHandler {
	return &ReservationHandler{DB: db}
}

// CreateReservationRequest is the expected JSON body for creating a reservation
type CreateReservationRequest struct {
	PropertyID uint   `json:"property_id"`
	Message    string `json:"message"`
}

// CreateReservation allows a student to reserve a property
func (h *ReservationHandler) CreateReservation(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req CreateReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.PropertyID == 0 {
		http.Error(w, `{"error":"Property ID is required"}`, http.StatusBadRequest)
		return
	}

	// Verify the property exists and is approved
	var property models.Property
	if err := h.DB.First(&property, req.PropertyID).Error; err != nil {
		http.Error(w, `{"error":"Property not found"}`, http.StatusNotFound)
		return
	}

	if property.Status != models.StatusApproved {
		http.Error(w, `{"error":"Property is not available for reservation"}`, http.StatusBadRequest)
		return
	}

	// Check for existing pending reservation by same student on same property
	var existingCount int64
	h.DB.Model(&models.Reservation{}).
		Where("property_id = ? AND student_id = ? AND status = ?", req.PropertyID, claims.UserID, models.ReservationPending).
		Count(&existingCount)

	if existingCount > 0 {
		http.Error(w, `{"error":"You already have a pending reservation for this property"}`, http.StatusConflict)
		return
	}

	reservation := models.Reservation{
		PropertyID: req.PropertyID,
		StudentID:  claims.UserID,
		Status:     models.ReservationPending,
		Message:    req.Message,
	}

	if err := h.DB.Create(&reservation).Error; err != nil {
		http.Error(w, `{"error":"Failed to create reservation"}`, http.StatusInternalServerError)
		return
	}

	// Reload with associations
	h.DB.Preload("Property").Preload("Property.Images").Preload("Student").First(&reservation, reservation.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(reservation)
}

// ListReservations returns reservations filtered by user role
func (h *ReservationHandler) ListReservations(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := h.DB.Model(&models.Reservation{}).
		Preload("Property").
		Preload("Property.Images").
		Preload("Student")

	switch claims.Role {
	case models.RoleStudent:
		// Students see only their own reservations
		query = query.Where("student_id = ?", claims.UserID)
	case models.RoleLandlord:
		// Landlords see reservations for their properties
		query = query.Joins("JOIN properties ON properties.id = reservations.property_id").
			Where("properties.landlord_id = ?", claims.UserID)
	case models.RoleAdmin, models.RoleWarden:
		// Admin and Warden see all reservations
	}

	statusFilter := r.URL.Query().Get("status")
	if statusFilter != "" {
		query = query.Where("reservations.status = ?", statusFilter)
	}

	var total int64
	query.Count(&total)

	var reservations []models.Reservation
	query.Order("reservations.created_at DESC").Offset(offset).Limit(limit).Find(&reservations)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"reservations": reservations,
		"total":        total,
		"page":         page,
		"limit":        limit,
	})
}

// AcceptReservation allows a landlord to accept a reservation
func (h *ReservationHandler) AcceptReservation(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var reservation models.Reservation
	if err := h.DB.Preload("Property").First(&reservation, id).Error; err != nil {
		http.Error(w, `{"error":"Reservation not found"}`, http.StatusNotFound)
		return
	}

	// Verify the landlord owns this property
	if claims.Role == models.RoleLandlord && reservation.Property.LandlordID != claims.UserID {
		http.Error(w, `{"error":"You can only manage reservations for your own properties"}`, http.StatusForbidden)
		return
	}

	if reservation.Status != models.ReservationPending {
		http.Error(w, `{"error":"This reservation has already been processed"}`, http.StatusBadRequest)
		return
	}

	var body struct {
		Response string `json:"response"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	reservation.Status = models.ReservationAccepted
	reservation.LandlordResponse = body.Response

	if err := h.DB.Save(&reservation).Error; err != nil {
		http.Error(w, `{"error":"Failed to accept reservation"}`, http.StatusInternalServerError)
		return
	}

	h.DB.Preload("Property").Preload("Property.Images").Preload("Student").First(&reservation, reservation.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reservation)
}

// DenyReservation allows a landlord to deny a reservation
func (h *ReservationHandler) DenyReservation(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var reservation models.Reservation
	if err := h.DB.Preload("Property").First(&reservation, id).Error; err != nil {
		http.Error(w, `{"error":"Reservation not found"}`, http.StatusNotFound)
		return
	}

	if claims.Role == models.RoleLandlord && reservation.Property.LandlordID != claims.UserID {
		http.Error(w, `{"error":"You can only manage reservations for your own properties"}`, http.StatusForbidden)
		return
	}

	if reservation.Status != models.ReservationPending {
		http.Error(w, `{"error":"This reservation has already been processed"}`, http.StatusBadRequest)
		return
	}

	var body struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Response == "" {
		http.Error(w, `{"error":"A response reason is required"}`, http.StatusBadRequest)
		return
	}

	reservation.Status = models.ReservationDenied
	reservation.LandlordResponse = body.Response

	if err := h.DB.Save(&reservation).Error; err != nil {
		http.Error(w, `{"error":"Failed to deny reservation"}`, http.StatusInternalServerError)
		return
	}

	h.DB.Preload("Property").Preload("Property.Images").Preload("Student").First(&reservation, reservation.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reservation)
}
