package docs_test

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	_ "booking/docs"
	"booking/src/swaggerui"
	"github.com/gin-gonic/gin"
)

func TestSwaggerUIAndAuthSchema(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	swaggerui.RegisterRoutes(router)
	for _, path := range []string{"/swagger/index.html", "/swagger/swagger-ui-bundle.js", "/swagger/doc.json"} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest("GET", path, nil))
		if response.Code != 200 {
			t.Fatalf("%s: status %d", path, response.Code)
		}
		if path == "/swagger/doc.json" {
			var schema struct {
				Paths               map[string]json.RawMessage `json:"paths"`
				SecurityDefinitions map[string]struct {
					Type     string `json:"type"`
					Flow     string `json:"flow"`
					TokenURL string `json:"tokenUrl"`
				} `json:"securityDefinitions"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &schema); err != nil {
				t.Fatal(err)
			}
			for _, endpoint := range []string{"/auth/register", "/auth/login", "/auth/token"} {
				if _, ok := schema.Paths[endpoint]; !ok {
					t.Fatalf("missing endpoint %s", endpoint)
				}
			}
			auth := schema.SecurityDefinitions["OAuth2Password"]
			if auth.Type != "oauth2" || auth.Flow != "password" || auth.TokenURL != "/auth/token" {
				t.Fatal("standard password authorization is not configured")
			}
		}
	}
}
