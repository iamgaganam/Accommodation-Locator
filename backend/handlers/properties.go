package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backend/middleware"
	"backend/models"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// PropertyHandler handles property-related endpoints
type PropertyHandler struct {
	DB        *gorm.DB
	UploadDir string
}

// NewPropertyHandler creates a new PropertyHandler
func NewPropertyHandler(db *gorm.DB, uploadDir string) *PropertyHandler {
	// Ensure the upload directory exists
	os.MkdirAll(uploadDir, os.ModePerm)
	return &PropertyHandler{DB: db, UploadDir: uploadDir}
}

// CreatePropertyRequest is the expected JSON body for creating a property
type CreatePropertyRequest struct {
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	PropertyType string  `json:"property_type"`
	Bedrooms     int     `json:"bedrooms"`
	Bathrooms    int     `json:"bathrooms"`
	MaxOccupants int     `json:"max_occupants"`
	RentAmount   float64 `json:"rent_amount"`
	Address      string  `json:"address"`
	City         string  `json:"city"`
	Postcode     string  `json:"postcode"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
}

// ListProperties returns properties with optional filters and pagination
func (h *PropertyHandler) ListProperties(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	statusFilter := r.URL.Query().Get("status")
	landlordFilter := r.URL.Query().Get("landlord_id")
	searchQuery := r.URL.Query().Get("search")

	query := h.DB.Model(&models.Property{}).Preload("Images").Preload("Landlord")

	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}
	if landlordFilter != "" {
		query = query.Where("landlord_id = ?", landlordFilter)
	}
	if searchQuery != "" {
		search := "%" + strings.ToLower(searchQuery) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(address) LIKE ? OR LOWER(city) LIKE ?", search, search, search)
	}

	var total int64
	query.Count(&total)

	var properties []models.Property
	query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&properties)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"properties": properties,
		"total":      total,
		"page":       page,
		"limit":      limit,
	})
}

// GetProperty returns a single property by ID with full details
func (h *PropertyHandler) GetProperty(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var property models.Property
	if err := h.DB.Preload("Images").Preload("Landlord").Preload("Reservations").Preload("Reservations.Student").First(&property, id).Error; err != nil {
		http.Error(w, `{"error":"Property not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(property)
}

// CreateProperty creates a new property listing (landlord only)
func (h *PropertyHandler) CreateProperty(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req CreatePropertyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validation
	if req.Title == "" || req.Address == "" || req.PropertyType == "" {
		http.Error(w, `{"error":"Title, address, and property type are required"}`, http.StatusBadRequest)
		return
	}
	if req.RentAmount <= 0 {
		http.Error(w, `{"error":"Rent amount must be greater than 0"}`, http.StatusBadRequest)
		return
	}
	if req.Bedrooms < 0 || req.Bathrooms < 0 || req.MaxOccupants < 1 {
		http.Error(w, `{"error":"Invalid bedroom, bathroom, or occupant count"}`, http.StatusBadRequest)
		return
	}

	property := models.Property{
		LandlordID:   claims.UserID,
		Title:        req.Title,
		Description:  req.Description,
		PropertyType: req.PropertyType,
		Bedrooms:     req.Bedrooms,
		Bathrooms:    req.Bathrooms,
		MaxOccupants: req.MaxOccupants,
		RentAmount:   req.RentAmount,
		Address:      req.Address,
		City:         req.City,
		Postcode:     req.Postcode,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		Status:       models.StatusPending,
	}

	if err := h.DB.Create(&property).Error; err != nil {
		http.Error(w, `{"error":"Failed to create property"}`, http.StatusInternalServerError)
		return
	}

	// Reload with associations
	h.DB.Preload("Images").Preload("Landlord").First(&property, property.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(property)
}

// UpdateProperty updates a property (landlord can only update their own)
func (h *PropertyHandler) UpdateProperty(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var property models.Property
	if err := h.DB.First(&property, id).Error; err != nil {
		http.Error(w, `{"error":"Property not found"}`, http.StatusNotFound)
		return
	}

	// Only the owning landlord or admin can update
	if claims.Role == models.RoleLandlord && property.LandlordID != claims.UserID {
		http.Error(w, `{"error":"You can only update your own properties"}`, http.StatusForbidden)
		return
	}

	var req CreatePropertyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Title != "" {
		property.Title = req.Title
	}
	if req.Description != "" {
		property.Description = req.Description
	}
	if req.PropertyType != "" {
		property.PropertyType = req.PropertyType
	}
	if req.Bedrooms > 0 {
		property.Bedrooms = req.Bedrooms
	}
	if req.Bathrooms > 0 {
		property.Bathrooms = req.Bathrooms
	}
	if req.MaxOccupants > 0 {
		property.MaxOccupants = req.MaxOccupants
	}
	if req.RentAmount > 0 {
		property.RentAmount = req.RentAmount
	}
	if req.Address != "" {
		property.Address = req.Address
	}
	if req.City != "" {
		property.City = req.City
	}
	if req.Postcode != "" {
		property.Postcode = req.Postcode
	}
	if req.Latitude != 0 {
		property.Latitude = req.Latitude
	}
	if req.Longitude != 0 {
		property.Longitude = req.Longitude
	}

	// Reset status to pending after edit so warden re-approves
	if claims.Role == models.RoleLandlord {
		property.Status = models.StatusPending
		property.RejectionReason = ""
	}

	if err := h.DB.Save(&property).Error; err != nil {
		http.Error(w, `{"error":"Failed to update property"}`, http.StatusInternalServerError)
		return
	}

	h.DB.Preload("Images").Preload("Landlord").First(&property, property.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(property)
}

// DeleteProperty deletes a property (landlord can only delete their own)
func (h *PropertyHandler) DeleteProperty(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var property models.Property
	if err := h.DB.Preload("Images").First(&property, id).Error; err != nil {
		http.Error(w, `{"error":"Property not found"}`, http.StatusNotFound)
		return
	}

	if claims.Role == models.RoleLandlord && property.LandlordID != claims.UserID {
		http.Error(w, `{"error":"You can only delete your own properties"}`, http.StatusForbidden)
		return
	}

	// Delete associated image files from disk
	for _, img := range property.Images {
		os.Remove(filepath.Join(h.UploadDir, filepath.Base(img.ImageURL)))
	}

	// Delete property (cascades to images via DB constraint)
	if err := h.DB.Delete(&property).Error; err != nil {
		http.Error(w, `{"error":"Failed to delete property"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Property deleted successfully"})
}

// UploadImages handles multipart image upload for a property
func (h *PropertyHandler) UploadImages(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var property models.Property
	if err := h.DB.First(&property, id).Error; err != nil {
		http.Error(w, `{"error":"Property not found"}`, http.StatusNotFound)
		return
	}

	if claims.Role == models.RoleLandlord && property.LandlordID != claims.UserID {
		http.Error(w, `{"error":"You can only upload images to your own properties"}`, http.StatusForbidden)
		return
	}

	// Parse multipart form (max 32MB)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, `{"error":"Failed to parse form data"}`, http.StatusBadRequest)
		return
	}

	files := r.MultipartForm.File["images"]
	if len(files) == 0 {
		http.Error(w, `{"error":"No images provided"}`, http.StatusBadRequest)
		return
	}

	// Check existing image count
	var existingCount int64
	h.DB.Model(&models.PropertyImage{}).Where("property_id = ?", id).Count(&existingCount)
	if int(existingCount)+len(files) > 10 {
		http.Error(w, `{"error":"Maximum 10 images allowed per property"}`, http.StatusBadRequest)
		return
	}

	var uploadedImages []models.PropertyImage

	for i, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			continue
		}
		defer file.Close()

		// Validate file type
		contentType := fileHeader.Header.Get("Content-Type")
		if !strings.HasPrefix(contentType, "image/") {
			continue
		}

		// Generate unique filename
		ext := filepath.Ext(fileHeader.Filename)
		if ext == "" {
			ext = ".jpg"
		}
		filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().UnixNano(), ext)
		filePath := filepath.Join(h.UploadDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			continue
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			os.Remove(filePath)
			continue
		}

		isPrimary := existingCount == 0 && i == 0

		image := models.PropertyImage{
			PropertyID: uint(id),
			ImageURL:   "/uploads/" + filename,
			IsPrimary:  isPrimary,
		}

		if err := h.DB.Create(&image).Error; err != nil {
			os.Remove(filePath)
			continue
		}

		uploadedImages = append(uploadedImages, image)
	}

	if len(uploadedImages) == 0 {
		http.Error(w, `{"error":"Failed to upload any images"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": fmt.Sprintf("%d image(s) uploaded successfully", len(uploadedImages)),
		"images":  uploadedImages,
	})
}

// DeleteImage deletes a single image from a property
func (h *PropertyHandler) DeleteImage(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	propertyID, _ := strconv.Atoi(mux.Vars(r)["id"])
	imageID, _ := strconv.Atoi(mux.Vars(r)["imageId"])

	var property models.Property
	if err := h.DB.First(&property, propertyID).Error; err != nil {
		http.Error(w, `{"error":"Property not found"}`, http.StatusNotFound)
		return
	}

	if claims.Role == models.RoleLandlord && property.LandlordID != claims.UserID {
		http.Error(w, `{"error":"You can only manage images of your own properties"}`, http.StatusForbidden)
		return
	}

	var image models.PropertyImage
	if err := h.DB.Where("id = ? AND property_id = ?", imageID, propertyID).First(&image).Error; err != nil {
		http.Error(w, `{"error":"Image not found"}`, http.StatusNotFound)
		return
	}

	// Delete file from disk
	os.Remove(filepath.Join(h.UploadDir, filepath.Base(image.ImageURL)))

	h.DB.Delete(&image)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Image deleted successfully"})
}

// ApproveProperty approves a property listing (warden only)
func (h *PropertyHandler) ApproveProperty(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var property models.Property
	if err := h.DB.First(&property, id).Error; err != nil {
		http.Error(w, `{"error":"Property not found"}`, http.StatusNotFound)
		return
	}

	property.Status = models.StatusApproved
	property.RejectionReason = ""

	if err := h.DB.Save(&property).Error; err != nil {
		http.Error(w, `{"error":"Failed to approve property"}`, http.StatusInternalServerError)
		return
	}

	h.DB.Preload("Images").Preload("Landlord").First(&property, property.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(property)
}

// RejectProperty rejects a property listing with a reason (warden only)
func (h *PropertyHandler) RejectProperty(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var body struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Reason == "" {
		http.Error(w, `{"error":"A rejection reason is required"}`, http.StatusBadRequest)
		return
	}

	var property models.Property
	if err := h.DB.First(&property, id).Error; err != nil {
		http.Error(w, `{"error":"Property not found"}`, http.StatusNotFound)
		return
	}

	property.Status = models.StatusRejected
	property.RejectionReason = body.Reason

	if err := h.DB.Save(&property).Error; err != nil {
		http.Error(w, `{"error":"Failed to reject property"}`, http.StatusInternalServerError)
		return
	}

	h.DB.Preload("Images").Preload("Landlord").First(&property, property.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(property)
}
