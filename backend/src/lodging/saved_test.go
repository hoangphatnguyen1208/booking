package lodging_test

import (
	"booking/src/identity"
	"booking/src/lodging"
	"booking/src/middleware"
	"context"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"testing"
)

func TestSavedHotelsAccountIsolation(t *testing.T) {
	_, s, owner, other, h := fixture(t)
	ctx := context.Background()
	for i := 0; i < 2; i++ {
		if err := s.SaveHotel(ctx, owner.ID, h.ID); err != nil {
			t.Fatal(err)
		}
	}
	ids, err := s.SavedHotels(ctx, owner.ID)
	if err != nil || len(ids) != 1 || ids[0] != h.ID {
		t.Fatalf("saved: %v %v", ids, err)
	}
	ids, err = s.SavedHotels(ctx, other.ID)
	if err != nil || len(ids) != 0 {
		t.Fatalf("other account leaked: %v %v", ids, err)
	}
	if err = s.UnsaveHotel(ctx, other.ID, h.ID); err != nil {
		t.Fatal(err)
	}
	ids, err = s.SavedHotels(ctx, owner.ID)
	if err != nil || len(ids) != 1 {
		t.Fatalf("foreign delete: %v %v", ids, err)
	}
	if err = s.UnsaveHotel(ctx, owner.ID, h.ID); err != nil {
		t.Fatal(err)
	}
	ids, err = s.SavedHotels(ctx, owner.ID)
	if err != nil || len(ids) != 0 {
		t.Fatalf("unsave: %v %v", ids, err)
	}
}

func TestSavedRoutesRequireAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	s := lodging.New(nil)
	s.RegisterRoutes(r.Group("/api/v1"), middleware.RequireAuth(identity.NewTokenManager("test-secret", 3600)))
	for _, method := range []string{"GET", "PUT", "DELETE"} {
		path := "/api/v1/me/saved-hotels"
		if method != "GET" {
			path += "/11111111-1111-1111-1111-111111111111"
		}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(method, path, nil))
		if w.Code != 401 {
			t.Fatalf("%s: got %d", method, w.Code)
		}
	}
}
