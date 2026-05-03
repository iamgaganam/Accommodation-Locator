package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/middleware"
	"backend/models"

	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserHandler handles user management endpoints (admin only)
type UserHandler struct {
	DB *gorm.DB
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{DB: db}
}

// CreateUserRequest is the expected JSON body for creating a user
type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

// UpdateUserRequest is the expected JSON body for updating a user
type UpdateUserRequest struct {
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
	Password string `json:"password,omitempty"`
}

// ListUsers returns all users with optional role filter and pagination
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	roleFilter := r.URL.Query().Get("role")

	var users []models.User
	var total int64

	query := h.DB.Model(&models.User{})
	if roleFilter != "" {
		query = query.Where("role = ?", roleFilter)
	}

	query.Count(&total)
	query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"users": users,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// CreateUser creates a new user (admin only)
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" || req.Role == "" {
		http.Error(w, `{"error":"Email, password, full name, and role are required"}`, http.StatusBadRequest)
		return
	}

	// Validate role
	validRoles := map[string]bool{
		models.RoleAdmin:    true,
		models.RoleLandlord: true,
		models.RoleWarden:   true,
		models.RoleStudent:  true,
	}
	if !validRoles[req.Role] {
		http.Error(w, `{"error":"Invalid role. Must be admin, landlord, warden, or student"}`, http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		http.Error(w, `{"error":"Password must be at least 6 characters"}`, http.StatusBadRequest)
		return
	}

	// Check if email already exists
	var existing models.User
	if err := h.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		http.Error(w, `{"error":"Email already registered"}`, http.StatusConflict)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, `{"error":"Failed to hash password"}`, http.StatusInternalServerError)
		return
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		FullName:     req.FullName,
		Phone:        req.Phone,
		Role:         req.Role,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		http.Error(w, `{"error":"Failed to create user"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// GetUser returns a single user by ID
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var user models.User
	if err := h.DB.First(&user, id).Error; err != nil {
		http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// UpdateUser updates a user by ID (admin only)
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var user models.User
	if err := h.DB.First(&user, id).Error; err != nil {
		http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Prevent admin from changing their own role
	claims := middleware.GetUserFromContext(r)
	if claims != nil && claims.UserID == user.ID && req.Role != "" && req.Role != user.Role {
		http.Error(w, `{"error":"Cannot change your own role"}`, http.StatusForbidden)
		return
	}

	if req.Email != "" {
		user.Email = req.Email
	}
	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.Role != "" {
		validRoles := map[string]bool{
			models.RoleAdmin:    true,
			models.RoleLandlord: true,
			models.RoleWarden:   true,
			models.RoleStudent:  true,
		}
		if !validRoles[req.Role] {
			http.Error(w, `{"error":"Invalid role"}`, http.StatusBadRequest)
			return
		}
		user.Role = req.Role
	}
	if req.Password != "" {
		if len(req.Password) < 6 {
			http.Error(w, `{"error":"Password must be at least 6 characters"}`, http.StatusBadRequest)
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, `{"error":"Failed to hash password"}`, http.StatusInternalServerError)
			return
		}
		user.PasswordHash = string(hash)
	}

	if err := h.DB.Save(&user).Error; err != nil {
		http.Error(w, `{"error":"Failed to update user"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// DeleteUser deletes a user by ID (admin only)
func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	// Prevent admin from deleting themselves
	claims := middleware.GetUserFromContext(r)
	if claims != nil && claims.UserID == uint(id) {
		http.Error(w, `{"error":"Cannot delete your own account"}`, http.StatusForbidden)
		return
	}

	if err := h.DB.Delete(&models.User{}, id).Error; err != nil {
		http.Error(w, `{"error":"Failed to delete user"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User deleted successfully"})
}
