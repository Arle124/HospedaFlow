package service

import (
	"context"
	"time"

	"github.com/Arle124/HospedaSync/internal/auth"
	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/repository"
)

// AuthService define los casos de uso de autenticación.
type AuthService interface {
	Login(ctx context.Context, email, password, ipAddress, userAgent string) (token string, user *domain.User, err error)
	Logout(ctx context.Context, tokenHash string) error
	ValidateSession(ctx context.Context, tokenString, secret string) (*auth.Claims, error)
	GetUserByID(ctx context.Context, id int64) (*domain.User, error)
}

type authService struct {
	repo      repository.Repository
	jwtSecret string
	jwtExpiry time.Duration
}

// NewAuthService crea una nueva instancia de AuthService.
func NewAuthService(repo repository.Repository, jwtSecret string, jwtExpiry time.Duration) AuthService {
	return &authService{
		repo:      repo,
		jwtSecret: jwtSecret,
		jwtExpiry: jwtExpiry,
	}
}

// Login autentica a un usuario y crea una sesión.
func (s *authService) Login(ctx context.Context, email, password, ipAddress, userAgent string) (string, *domain.User, error) {
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if err == domain.ErrNotFound {
			return "", nil, domain.ErrInvalidCredentials
		}
		return "", nil, err
	}

	if !user.Active {
		return "", nil, domain.ErrUserInactive
	}

	if err := auth.CheckPassword(password, user.PasswordHash); err != nil {
		return "", nil, domain.ErrInvalidCredentials
	}

	token, err := auth.GenerateToken(user.ID, user.Role, s.jwtSecret, s.jwtExpiry)
	if err != nil {
		return "", nil, err
	}

	tokenHash := auth.HashToken(token)
	session := &domain.UserSession{
		UserID:    user.ID,
		TokenHash: tokenHash,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		ExpiresAt: time.Now().Add(s.jwtExpiry),
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return "", nil, err
	}

	return token, user, nil
}

// Logout invalida una sesión activa.
func (s *authService) Logout(ctx context.Context, tokenHash string) error {
	return s.repo.RevokeSession(ctx, tokenHash)
}

// ValidateSession verifica la validez del token y de la sesión en BD.
func (s *authService) ValidateSession(ctx context.Context, tokenString, secret string) (*auth.Claims, error) {
	claims, err := auth.ValidateToken(tokenString, secret)
	if err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	tokenHash := auth.HashToken(tokenString)
	session, err := s.repo.GetActiveSession(ctx, tokenHash)
	if err != nil {
		if err == domain.ErrNotFound {
			return nil, domain.ErrSessionRevoked
		}
		return nil, err
	}

	if session.ExpiresAt.Before(time.Now()) {
		return nil, domain.ErrSessionExpired
	}

	return claims, nil
}


// GetUserByID obtiene un usuario de BD por su id.
func (s *authService) GetUserByID(ctx context.Context, id int64) (*domain.User, error) {
	return s.repo.GetUserByID(ctx, id)
}
