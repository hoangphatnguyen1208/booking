package lodging_test

import (
	"booking/src/db"
	"booking/src/hotel"
	"booking/src/identity"
	"booking/src/permission"
	"context"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMembershipAndAdminBoundaries(t *testing.T) {
	conn, s, owner, other, h := fixture(t)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	s.RegisterRoutes(router.Group("/api/v1"), func(c *gin.Context) { c.Set("user_id", c.GetHeader("X-Test-Actor")); c.Next() })
	call := func(actor, role string) int {
		body, _ := json.Marshal(map[string]string{"email": owner.Email, "role": role})
		req := httptest.NewRequest("PUT", "/api/v1/hotels/"+h.ID+"/members", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Test-Actor", actor)
		out := httptest.NewRecorder()
		router.ServeHTTP(out, req)
		return out.Code
	}
	if status := call(other.ID, "remove"); status != 403 {
		t.Fatalf("outsider modified members: %d", status)
	}
	if status := call(owner.ID, "remove"); status != 409 {
		t.Fatalf("removed last owner: %d", status)
	}
	role := identity.Role{}
	if err := conn.First(&role, "name = ?", "admin").Error; err != nil {
		t.Fatal(err)
	}
	if err := conn.Exec("INSERT INTO user_roles(user_id,role_id) VALUES (?,?)", owner.ID, role.ID).Error; err != nil {
		t.Fatal(err)
	}
	if err := s.SetAdmin(context.Background(), other.ID, other.ID, true); err != permission.ErrForbidden {
		t.Fatalf("self-escalation: %v", err)
	}
	if err := s.SetAdmin(context.Background(), owner.ID, owner.ID, false); err == nil {
		t.Fatal("removed last admin")
	}
	if err := s.SetAdmin(context.Background(), owner.ID, other.ID, true); err != nil {
		t.Fatal(err)
	}
	if err := s.SetAdmin(context.Background(), other.ID, owner.ID, false); err != nil {
		t.Fatal(err)
	}
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("migration rerun: %v", err)
	}
	if err := hotel.NewService(hotel.NewRepository(conn)).DeleteForActor(context.Background(), owner.ID, h.ID); err != nil {
		t.Fatal(err)
	}
	var count int64
	conn.Unscoped().Model(&hotel.Hotel{}).Where("id = ?", h.ID).Count(&count)
	if count != 1 {
		t.Fatal("hotel history was physically deleted")
	}
}
