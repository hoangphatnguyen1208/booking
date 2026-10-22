import { useEffect, useState } from "react";
import { request } from "./api";
type User = {
  id: string;
  email: string;
  roles: { id: string; name: string }[];
};
export default function AdminPanel({ token }: { token: string | null }) {
  const [users, setUsers] = useState<User[]>([]),
    [page, setPage] = useState(1),
    [reload, setReload] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [auditLoaded, setAuditLoaded] = useState(false),
    [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    if (!token) return;
    const c = new AbortController();
    async function load() {
      setError("");
      setLoading(true);
      try {
        setUsers(
          await request<User[]>(`/admin/users?page=${page}`, {
            headers: { Authorization: "Bearer " + token },
            signal: c.signal,
          }),
        );
      } catch (err) {
        if (!c.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Không tải được người dùng",
          );
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => c.abort();
  }, [token, page, reload]);
  async function role(user: User, enabled: boolean) {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      await request("/admin/users/" + user.id + "/admin", {
        method: "PUT",
        headers: { Authorization: "Bearer " + token },
        body: JSON.stringify({ enabled }),
      });
      setReload((n) => n + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không cập nhật được quyền",
      );
    } finally {
      setBusy(false);
    }
  }
  async function audit() {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      setLogs(
        await request<Record<string, unknown>[]>("/admin/audit-logs", {
          headers: { Authorization: "Bearer " + token },
        }),
      );
      setAuditLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được audit");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="management-page">
      <header className="page-heading">
        <div>
          <h1>Quản trị hệ thống</h1>
          <p>Quản lý người dùng và theo dõi hoạt động hệ thống.</p>
        </div>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!token ? (
        <p>Vui lòng đăng nhập bằng tài khoản quản trị.</p>
      ) : (
        <>
          {loading && <p role="status">Đang tải người dùng…</p>}
          {!loading && !error && !users.length && (
            <p className="empty-state">Chưa có người dùng trên trang này.</p>
          )}
          <div className="management-list">
            {users.map((user) => (
              <article key={user.id}>
                <div>
                  <strong>{user.email}</strong>
                  <p>
                    {user.roles?.some((r) => r.name === "admin")
                      ? "Admin"
                      : "Người dùng"}
                  </p>
                </div>
                <button
                  aria-label={`${user.roles?.some((r) => r.name === "admin") ? "Thu hồi admin" : "Cấp quyền admin"} · ${user.email}`}
                  className="outline"
                  disabled={busy}
                  onClick={() =>
                    void role(
                      user,
                      !user.roles?.some((r) => r.name === "admin"),
                    )
                  }
                >
                  {user.roles?.some((r) => r.name === "admin")
                    ? "Thu hồi admin"
                    : "Cấp quyền admin"}
                </button>
              </article>
            ))}
          </div>
          <div className="pagination">
            <button
              className="outline"
              disabled={page === 1 || busy}
              onClick={() => setPage((n) => n - 1)}
            >
              Trang trước
            </button>
            <span>Trang {page}</span>
            <button
              className="outline"
              disabled={users.length < 20 || busy}
              onClick={() => setPage((n) => n + 1)}
            >
              Trang sau
            </button>
          </div>
          <h2>Nhật ký thao tác gần đây</h2>
          <button
            className="outline"
            disabled={busy}
            onClick={() => void audit()}
          >
            Tải nhật ký
          </button>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Người dùng</th>
                  <th>Thao tác</th>
                  <th>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {!logs.length && (
                  <tr>
                    <td colSpan={4}>
                      {auditLoaded
                        ? "Chưa có nhật ký thao tác."
                        : "Nhấn Tải nhật ký để xem hoạt động gần đây."}
                    </td>
                  </tr>
                )}
                {logs.map((row, i) => (
                  <tr key={i}>
                    <td>{String(row.created_at)}</td>
                    <td>{String(row.user_id || "Ẩn danh")}</td>
                    <td>
                      {String(row.method)} {String(row.path)}
                    </td>
                    <td>{String(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
