"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch, getImageUrl } from "@/lib/api";
import type { Property, Reservation, User, Article } from "@/lib/types";
import MapView from "@/components/MapView/MapView";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <main className={styles.page}><div className={styles.container}><p>Loading...</p></div></main>;
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>
            {user.role === "admin" && "Admin Panel"}
            {user.role === "landlord" && "My Properties"}
            {user.role === "warden" && "Review Properties"}
            {user.role === "student" && "My Reservations"}
          </h1>
          <p className={styles.subtitle}>Welcome back, {user.full_name}</p>
        </div>
        {user.role === "landlord" && <LandlordDashboard />}
        {user.role === "warden" && <WardenDashboard />}
        {user.role === "student" && <StudentDashboard />}
        {user.role === "admin" && <AdminDashboard />}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  LANDLORD DASHBOARD                                                */
/* ═══════════════════════════════════════════════════════════════════ */
function LandlordDashboard() {
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [form, setForm] = useState({ title: "", description: "", property_type: "Flat", bedrooms: 1, bathrooms: 1, max_occupants: 1, rent_amount: 0, address: "", city: "Plymouth", postcode: "", latitude: 50.3755, longitude: -4.1427 });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const fetchData = async () => {
    try {
      const [propData, resData] = await Promise.all([
        apiFetch<{ properties: Property[] }>("/properties?limit=100"),
        apiFetch<{ reservations: Reservation[] }>("/reservations?limit=100"),
      ]);
      setProperties(propData.properties || []);
      setReservations(resData.reservations || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProperty) {
        await apiFetch(`/properties/${editingProperty.id}`, { method: "PUT", body: form });
        showToast("Property updated!", "success");
      } else {
        await apiFetch("/properties", { method: "POST", body: form });
        showToast("Property created! Awaiting warden approval.", "success");
      }
      setShowForm(false);
      setEditingProperty(null);
      setForm({ title: "", description: "", property_type: "Flat", bedrooms: 1, bathrooms: 1, max_occupants: 1, rent_amount: 0, address: "", city: "Plymouth", postcode: "", latitude: 50.3755, longitude: -4.1427 });
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this property?")) return;
    try {
      await apiFetch(`/properties/${id}`, { method: "DELETE" });
      showToast("Property deleted", "success");
      fetchData();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Failed", "error"); }
  };

  const handleImageUpload = async (propertyId: number, files: FileList) => {
    setUploadingImages(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("images", f));
    try {
      await apiFetch(`/properties/${propertyId}/images`, { method: "POST", body: formData, isFormData: true });
      showToast("Images uploaded!", "success");
      fetchData();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Upload failed", "error"); }
    finally { setUploadingImages(false); }
  };

  const handleReservation = async (id: number, action: "accept" | "deny", response: string) => {
    try {
      await apiFetch(`/reservations/${id}/${action}`, { method: "PUT", body: { response } });
      showToast(`Reservation ${action}ed`, "success");
      fetchData();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Failed", "error"); }
  };

  const startEdit = (p: Property) => {
    setEditingProperty(p);
    setForm({ title: p.title, description: p.description, property_type: p.property_type, bedrooms: p.bedrooms, bathrooms: p.bathrooms, max_occupants: p.max_occupants, rent_amount: p.rent_amount, address: p.address, city: p.city, postcode: p.postcode, latitude: p.latitude, longitude: p.longitude });
    setShowForm(true);
  };

  if (loading) return <p>Loading properties...</p>;

  return (
    <div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.addBtn} onClick={() => { setEditingProperty(null); setForm({ title: "", description: "", property_type: "Flat", bedrooms: 1, bathrooms: 1, max_occupants: 1, rent_amount: 0, address: "", city: "Plymouth", postcode: "", latitude: 50.3755, longitude: -4.1427 }); setShowForm(true); }}>
          + Add Property
        </button>
      </div>

      {showForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingProperty ? "Edit Property" : "Add New Property"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.propertyForm}>
              <div className={styles.formGrid}>
                <div className={styles.field}><label>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div className={styles.field}><label>Type *</label>
                  <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })}>
                    <option>Studio</option><option>Flat</option><option>House</option><option>Room</option>
                  </select>
                </div>
                <div className={styles.field}><label>Rent (£/month) *</label><input type="number" min="1" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: Number(e.target.value) })} required /></div>
                <div className={styles.field}><label>Bedrooms</label><input type="number" min="0" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })} /></div>
                <div className={styles.field}><label>Bathrooms</label><input type="number" min="0" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })} /></div>
                <div className={styles.field}><label>Max Occupants</label><input type="number" min="1" value={form.max_occupants} onChange={(e) => setForm({ ...form, max_occupants: Number(e.target.value) })} /></div>
              </div>
              <div className={styles.field}><label>Address *</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
              <div className={styles.formGrid}>
                <div className={styles.field}><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className={styles.field}><label>Postcode</label><input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></div>
              </div>
              <div className={styles.field}><label>Description</label><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className={styles.formGrid}>
                <div className={styles.field}><label>Latitude</label><input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} /></div>
                <div className={styles.field}><label>Longitude</label><input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} /></div>
              </div>
              <p className={styles.hint}>Click on the map below to set coordinates</p>
              <div style={{ height: 250, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                <MapView properties={[]} onMapClick={(c) => setForm({ ...form, latitude: c.lat, longitude: c.lng })} />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? "Saving..." : (editingProperty ? "Update Property" : "Create Property")}</button>
            </form>
          </div>
        </div>
      )}

      {/* Properties Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead><tr><th>Property</th><th>Status</th><th>Rent</th><th>Actions</th></tr></thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className={styles.propertyCell}>
                    {p.images?.[0] && <img src={getImageUrl(p.images[0].image_url)} alt="" className={styles.tableThumbnail} />}
                    <div><strong>{p.title}</strong><br /><small>{p.address}</small></div>
                  </div>
                </td>
                <td><span className={`${styles.statusBadge} ${styles[p.status]}`}>{p.status}</span>
                  {p.status === "rejected" && p.rejection_reason && <p className={styles.rejectionReason}>Reason: {p.rejection_reason}</p>}
                </td>
                <td>£{p.rent_amount}/mo</td>
                <td>
                  <div className={styles.actionBtns}>
                    <button type="button" onClick={() => startEdit(p)} className={styles.editBtn}>Edit</button>
                    <label className={styles.uploadLabel}>
                      {uploadingImages ? "..." : "📷"}
                      <input type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files && handleImageUpload(p.id, e.target.files)} />
                    </label>
                    <button type="button" onClick={() => handleDelete(p.id)} className={styles.deleteBtn}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {properties.length === 0 && <p className={styles.emptyMsg}>No properties yet. Click "Add Property" to get started.</p>}
      </div>

      {/* Reservations */}
      {reservations.length > 0 && (
        <div className={styles.section}>
          <h2>Reservation Requests</h2>
          <div className={styles.reservationList}>
            {reservations.map((r) => (
              <div key={r.id} className={styles.reservationCard}>
                <div className={styles.resInfo}>
                  <strong>{r.student?.full_name}</strong> wants to reserve <strong>{r.property?.title}</strong>
                  {r.message && <p className={styles.resMessage}>"{r.message}"</p>}
                  <span className={`${styles.statusBadge} ${styles[r.status]}`}>{r.status}</span>
                </div>
                {r.status === "pending" && (
                  <div className={styles.resActions}>
                    <button type="button" className={styles.acceptBtn} onClick={() => handleReservation(r.id, "accept", "Accepted! Welcome.")}>Accept</button>
                    <button type="button" className={styles.denyBtn} onClick={() => { const reason = prompt("Reason for denial:"); if (reason) handleReservation(r.id, "deny", reason); }}>Deny</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  WARDEN DASHBOARD                                                  */
/* ═══════════════════════════════════════════════════════════════════ */
function WardenDashboard() {
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await apiFetch<{ properties: Property[] }>(`/properties?status=${filter}&limit=100`);
      setProperties(data.properties || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); fetchData(); }, [filter]);

  const handleApprove = async (id: number) => {
    try {
      await apiFetch(`/properties/${id}/approve`, { method: "PUT" });
      showToast("Property approved!", "success");
      fetchData();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Failed", "error"); }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await apiFetch(`/properties/${id}/reject`, { method: "PUT", body: { reason } });
      showToast("Property rejected", "success");
      fetchData();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Failed", "error"); }
  };

  return (
    <div>
      <div className={styles.filterBar}>
        {["pending", "approved", "rejected"].map((s) => (
          <button key={s} type="button" className={`${styles.filterBtn} ${filter === s ? styles.filterActive : ""}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.wardenLayout}>
        <div className={styles.wardenList}>
          {loading ? <p>Loading...</p> : properties.length === 0 ? <p className={styles.emptyMsg}>No {filter} properties</p> : (
            properties.map((p) => (
              <div key={p.id} className={`${styles.wardenCard} ${selectedId === p.id ? styles.wardenSelected : ""}`} onClick={() => setSelectedId(p.id)}>
                <div className={styles.wardenCardRow}>
                  {p.images?.[0] && <img src={getImageUrl(p.images[0].image_url)} alt="" className={styles.wardenThumb} />}
                  <div className={styles.wardenCardInfo}>
                    <strong>{p.title}</strong>
                    <small>{p.address}</small>
                    <span>£{p.rent_amount}/mo • {p.bedrooms} bed • {p.bathrooms} bath</span>
                    <span className={styles.wardenLandlord}>By: {p.landlord?.full_name}</span>
                  </div>
                </div>
                {filter === "pending" && (
                  <div className={styles.wardenActions}>
                    <button type="button" className={styles.acceptBtn} onClick={(e) => { e.stopPropagation(); handleApprove(p.id); }}>Approve</button>
                    <button type="button" className={styles.denyBtn} onClick={(e) => { e.stopPropagation(); handleReject(p.id); }}>Reject</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className={styles.wardenMap}>
          <MapView properties={properties} selectedPropertyId={selectedId} onPropertySelect={(p) => setSelectedId(p.id)} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  STUDENT DASHBOARD                                                 */
/* ═══════════════════════════════════════════════════════════════════ */
function StudentDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ reservations: Reservation[] }>("/reservations?limit=100")
      .then((d) => setReservations(d.reservations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = { pending: styles.pending, accepted: styles.approved, denied: styles.rejected };

  if (loading) return <p>Loading reservations...</p>;

  return (
    <div>
      {reservations.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No reservations yet</h3>
          <p>Browse properties and send a reservation request to get started.</p>
          <a href="/properties" className={styles.addBtn}>Browse Properties</a>
        </div>
      ) : (
        <div className={styles.reservationList}>
          {reservations.map((r) => (
            <div key={r.id} className={styles.reservationCard}>
              <div className={styles.resPropertyInfo}>
                {r.property?.images?.[0] && <img src={getImageUrl(r.property.images[0].image_url)} alt="" className={styles.resThumb} />}
                <div>
                  <strong>{r.property?.title}</strong>
                  <small>{r.property?.address}</small>
                  <span>£{r.property?.rent_amount}/mo</span>
                </div>
              </div>
              <div className={styles.resStatus}>
                <span className={`${styles.statusBadge} ${statusColors[r.status]}`}>{r.status}</span>
                {r.message && <p className={styles.resMessage}>Your message: "{r.message}"</p>}
                {r.landlord_response && <p className={styles.resResponse}>Landlord: "{r.landlord_response}"</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  ADMIN DASHBOARD                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
function AdminDashboard() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"users" | "articles">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [userForm, setUserForm] = useState({ email: "", password: "", full_name: "", phone: "", role: "student" });
  const [articleForm, setArticleForm] = useState({ title: "", content: "", published: true });

  const fetchData = async () => {
    try {
      const [uData, aData] = await Promise.all([
        apiFetch<{ users: User[] }>("/users?limit=100"),
        apiFetch<{ articles: Article[] }>("/articles?limit=100"),
      ]);
      setUsers(uData.users || []);
      setArticles(aData.articles || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/users", { method: "POST", body: userForm });
      showToast("User created!", "success");
      setShowUserForm(false);
      setUserForm({ email: "", password: "", full_name: "", phone: "", role: "student" });
      fetchData();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Failed", "error"); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      showToast("User deleted", "success");
      fetchData();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Failed", "error"); }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingArticle) {
        await apiFetch(`/articles/${editingArticle.id}`, { method: "PUT", body: articleForm });
      } else {
        await apiFetch("/articles", { method: "POST", body: articleForm });
      }
      showToast(editingArticle ? "Article updated!" : "Article published!", "success");
      setShowArticleForm(false);
      setEditingArticle(null);
      setArticleForm({ title: "", content: "", published: true });
      fetchData();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Failed", "error"); }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!confirm("Delete this article?")) return;
    try {
      await apiFetch(`/articles/${id}`, { method: "DELETE" });
      showToast("Article deleted", "success");
      fetchData();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Failed", "error"); }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className={styles.tabBar}>
        <button type="button" className={`${styles.tabBtn} ${activeTab === "users" ? styles.tabActive : ""}`} onClick={() => setActiveTab("users")}>Users ({users.length})</button>
        <button type="button" className={`${styles.tabBtn} ${activeTab === "articles" ? styles.tabActive : ""}`} onClick={() => setActiveTab("articles")}>Articles ({articles.length})</button>
      </div>

      {activeTab === "users" && (
        <>
          <div className={styles.toolbar}><button type="button" className={styles.addBtn} onClick={() => setShowUserForm(true)}>+ Create User</button></div>
          {showUserForm && (
            <div className={styles.modal}><div className={styles.modalContent}>
              <div className={styles.modalHeader}><h2>Create User</h2><button type="button" onClick={() => setShowUserForm(false)} className={styles.closeBtn}>✕</button></div>
              <form onSubmit={handleCreateUser} className={styles.propertyForm}>
                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Full Name *</label><input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required /></div>
                  <div className={styles.field}><label>Email *</label><input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required /></div>
                  <div className={styles.field}><label>Password *</label><input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={6} /></div>
                  <div className={styles.field}><label>Phone</label><input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} /></div>
                  <div className={styles.field}><label>Role *</label>
                    <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                      <option value="student">Student</option><option value="landlord">Landlord</option><option value="warden">Warden</option><option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className={styles.submitBtn}>Create User</button>
              </form>
            </div></div>
          )}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.full_name}</strong></td>
                    <td>{u.email}</td>
                    <td><span className={`${styles.roleBadge} ${styles[`role_${u.role}`]}`}>{u.role}</span></td>
                    <td><button type="button" className={styles.deleteBtn} onClick={() => handleDeleteUser(u.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "articles" && (
        <>
          <div className={styles.toolbar}><button type="button" className={styles.addBtn} onClick={() => { setEditingArticle(null); setArticleForm({ title: "", content: "", published: true }); setShowArticleForm(true); }}>+ New Article</button></div>
          {showArticleForm && (
            <div className={styles.modal}><div className={styles.modalContent}>
              <div className={styles.modalHeader}><h2>{editingArticle ? "Edit Article" : "New Article"}</h2><button type="button" onClick={() => setShowArticleForm(false)} className={styles.closeBtn}>✕</button></div>
              <form onSubmit={handleSaveArticle} className={styles.propertyForm}>
                <div className={styles.field}><label>Title *</label><input value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} required /></div>
                <div className={styles.field}><label>Content *</label><textarea rows={10} value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} required /></div>
                <label className={styles.checkboxLabel}><input type="checkbox" checked={articleForm.published} onChange={(e) => setArticleForm({ ...articleForm, published: e.target.checked })} /> Published</label>
                <button type="submit" className={styles.submitBtn}>{editingArticle ? "Update" : "Publish"}</button>
              </form>
            </div></div>
          )}
          <div className={styles.articleList}>
            {articles.map((a) => (
              <div key={a.id} className={styles.articleCard}>
                <div><strong>{a.title}</strong><br /><small>{a.published ? "Published" : "Draft"} • {new Date(a.created_at).toLocaleDateString()}</small></div>
                <div className={styles.actionBtns}>
                  <button type="button" className={styles.editBtn} onClick={() => { setEditingArticle(a); setArticleForm({ title: a.title, content: a.content, published: a.published }); setShowArticleForm(true); }}>Edit</button>
                  <button type="button" className={styles.deleteBtn} onClick={() => handleDeleteArticle(a.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
