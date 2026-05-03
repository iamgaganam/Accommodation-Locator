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

// ArticleHandler handles article endpoints
type ArticleHandler struct {
	DB *gorm.DB
}

// NewArticleHandler creates a new ArticleHandler
func NewArticleHandler(db *gorm.DB) *ArticleHandler {
	return &ArticleHandler{DB: db}
}

// CreateArticleRequest is the expected JSON body for creating an article
type CreateArticleRequest struct {
	Title     string `json:"title"`
	Content   string `json:"content"`
	Published bool   `json:"published"`
}

// ListArticles returns all published articles (or all for admin)
func (h *ArticleHandler) ListArticles(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := h.DB.Model(&models.Article{}).Preload("Author")

	// Check if user is authenticated admin — if so, show all; otherwise only published
	claims := middleware.GetUserFromContext(r)
	if claims == nil || claims.Role != models.RoleAdmin {
		query = query.Where("published = ?", true)
	}

	var total int64
	query.Count(&total)

	var articles []models.Article
	query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&articles)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"articles": articles,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

// GetArticle returns a single article by ID
func (h *ArticleHandler) GetArticle(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var article models.Article
	if err := h.DB.Preload("Author").First(&article, id).Error; err != nil {
		http.Error(w, `{"error":"Article not found"}`, http.StatusNotFound)
		return
	}

	// Non-admins can only see published articles
	claims := middleware.GetUserFromContext(r)
	if !article.Published && (claims == nil || claims.Role != models.RoleAdmin) {
		http.Error(w, `{"error":"Article not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(article)
}

// CreateArticle creates a new article (admin only)
func (h *ArticleHandler) CreateArticle(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req CreateArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Content == "" {
		http.Error(w, `{"error":"Title and content are required"}`, http.StatusBadRequest)
		return
	}

	article := models.Article{
		AuthorID:  claims.UserID,
		Title:     req.Title,
		Content:   req.Content,
		Published: req.Published,
	}

	if err := h.DB.Create(&article).Error; err != nil {
		http.Error(w, `{"error":"Failed to create article"}`, http.StatusInternalServerError)
		return
	}

	h.DB.Preload("Author").First(&article, article.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(article)
}

// UpdateArticle updates an article by ID (admin only)
func (h *ArticleHandler) UpdateArticle(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	var article models.Article
	if err := h.DB.First(&article, id).Error; err != nil {
		http.Error(w, `{"error":"Article not found"}`, http.StatusNotFound)
		return
	}

	var req CreateArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Title != "" {
		article.Title = req.Title
	}
	if req.Content != "" {
		article.Content = req.Content
	}
	article.Published = req.Published

	if err := h.DB.Save(&article).Error; err != nil {
		http.Error(w, `{"error":"Failed to update article"}`, http.StatusInternalServerError)
		return
	}

	h.DB.Preload("Author").First(&article, article.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(article)
}

// DeleteArticle deletes an article by ID (admin only)
func (h *ArticleHandler) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])

	if err := h.DB.Delete(&models.Article{}, id).Error; err != nil {
		http.Error(w, `{"error":"Failed to delete article"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Article deleted successfully"})
}
