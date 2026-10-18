import { useEffect, useState } from 'react';
import { announcementApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const initialForm = { title: '', content: '', audience: 'all', isActive: true };
const audienceLabel = { all: 'Everyone', customer: 'Customers', tourProvider: 'Tour providers' };

export default function StaffAnnouncements() {
  const { user } = useAuth();
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await announcementApi.getManaged();
      setAnnouncements(response.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load managed announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'staff' || user?.role === 'admin') loadAnnouncements();
  }, [user?.role]);

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
    setError('');
  };

  const openEdit = (announcement) => {
    setEditingId(announcement._id);
    setForm({
      title: announcement.title || '',
      content: announcement.content || '',
      audience: announcement.audience || 'all',
      isActive: announcement.isActive !== false
    });
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) await announcementApi.update(editingId, form);
      else await announcementApi.create(form);
      toast.success(editingId ? 'Announcement updated.' : 'Announcement created.');
      closeForm();
      await loadAnnouncements();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save announcement.');
      toast.error(requestError.message || 'Unable to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (announcement) => {
    if (!window.confirm('Delete announcement "' + announcement.title + '"?')) return;
    try {
      await announcementApi.remove(announcement._id);
      toast.success('Announcement deleted.');
      await loadAnnouncements();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to delete announcement.');
    }
  };

  return (
    <section className="management-page-section">
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <span className="management-page-kicker">System Announcements</span>
          <h1>Platform announcements</h1>
          <p>Create, update, publish, and remove messages shown to TripMate users.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={showForm ? closeForm : openCreate}>
          <i className={'bi ' + (showForm ? 'bi-x-lg' : 'bi-plus-circle') + ' me-2'}></i>
          {showForm ? 'Close form' : 'New announcement'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <form className="card border-0 shadow-sm mb-4" onSubmit={handleSubmit}>
          <div className="card-body p-4">
            <h2 className="h5 fw-bold mb-3">{editingId ? 'Edit announcement' : 'Create announcement'}</h2>
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label fw-semibold" htmlFor="announcement-title">Title</label>
                <input id="announcement-title" name="title" className="form-control" maxLength="150" value={form.title} onChange={handleChange} required disabled={saving} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="announcement-audience">Audience</label>
                <select id="announcement-audience" name="audience" className="form-select" value={form.audience} onChange={handleChange} disabled={saving}>
                  <option value="all">Everyone</option>
                  <option value="customer">Customers</option>
                  <option value="tourProvider">Tour providers</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold" htmlFor="announcement-content">Content</label>
                <textarea id="announcement-content" name="content" className="form-control" rows="5" maxLength="5000" value={form.content} onChange={handleChange} required disabled={saving}></textarea>
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input id="announcement-active" name="isActive" type="checkbox" className="form-check-input" checked={form.isActive} onChange={handleChange} disabled={saving} />
                  <label className="form-check-label" htmlFor="announcement-active">Publish announcement immediately</label>
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={closeForm} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save announcement'}</button>
            </div>
          </div>
        </form>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><span className="spinner-border text-primary" role="status"></span></div>
          ) : announcements.length === 0 ? (
            <div className="text-center text-muted py-5">No announcements have been created.</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr><th className="ps-4">Title</th><th>Audience</th><th>Status</th><th>Updated</th><th className="text-end pe-4">Actions</th></tr>
                </thead>
                <tbody>
                  {announcements.map((announcement) => (
                    <tr key={announcement._id}>
                      <td className="ps-4"><div className="fw-semibold">{announcement.title}</div><div className="small text-muted text-truncate" style={{ maxWidth: '360px' }}>{announcement.content}</div></td>
                      <td><span className="badge text-bg-light">{audienceLabel[announcement.audience] || 'Everyone'}</span></td>
                      <td><span className={'badge ' + (announcement.isActive ? 'text-bg-success' : 'text-bg-secondary')}>{announcement.isActive ? 'Active' : 'Draft'}</span></td>
                      <td className="small text-muted">{new Date(announcement.updatedAt || announcement.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="text-end pe-4">
                        <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(announcement)}>Edit</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(announcement)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
