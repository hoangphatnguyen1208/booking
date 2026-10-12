package hotel

import (
	"booking/src/identity"
	"booking/src/middleware"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRoutesRejectInvalidRequestsBeforeDatabase(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	tokens := identity.NewTokenManager("test-secret", 3600)
	NewCController(NewService(nil)).RegisterRoutes(router.Group("/api/v1"), middleware.RequireAuth(tokens))
	token, err := tokens.GenerateToken(&identity.User{ID: "test-user"})
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		method, path, body string
		auth               bool
		status             int
	}{
		{"POST", "/api/v1/hotels", "{}", false, 401},
		{"PUT", "/api/v1/hotels/invalid", "{}", false, 401},
		{"DELETE", "/api/v1/hotels/invalid", "", false, 401},
		{"GET", "/api/v1/hotels/invalid", "", false, 400},
		{"PUT", "/api/v1/hotels/invalid", "{}", true, 400},
		{"POST", "/api/v1/hotels", "{}", true, 400},
		{"POST", "/api/v1/hotels", `{"name":" ","slug":"a","city":"Hue","country":"VN"}`, true, 400},
		{"POST", "/api/v1/hotels", `{"name":"Hotel","slug":"Invalid Slug","city":"Hue","country":"VN"}`, true, 400},
		{"PUT", "/api/v1/hotels/11111111-1111-1111-1111-111111111111", `{"name":"Hotel"}`, true, 400},
	} {
		t.Run(tc.method+tc.path+tc.body, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			if tc.auth {
				req.Header.Set("Authorization", "Bearer "+token)
			}
			out := httptest.NewRecorder()
			router.ServeHTTP(out, req)
			if out.Code != tc.status {
				t.Fatalf("got %d body %s", out.Code, out.Body.String())
			}
		})
	}
}
