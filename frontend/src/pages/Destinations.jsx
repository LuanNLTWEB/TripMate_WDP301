import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { destinationApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const initialForm = {
  name: '',
  category: '',
  description: '',
  address: '',
  city: '',
  country: ''
};

function Destinations() {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canManage = user?.role === 'staff' || user?.role === 'admin';

  const loadDestinations = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await destinationApi.list(query ? { search: query } : {});
      setDestinations(response.destinations || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDestinations();
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    loadDestinations(search.trim());
  };

  const handleFormChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await destinationApi.create({
        name: form.name,
        category: form.category,
        description: form.description,
        location: {
          address: form.address,
          city: form.city,
          country: form.country
        }
      });
      setForm(initialForm);
      setShowForm(false);
      setMessage('Destination created successfully.');
      await loadDestinations(search.trim());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (destination) => {
    try {
      await destinationApi.updateStatus(
        destination._id,
        destination.status === 'active' ? 'inactive' : 'active'
      );
      setMessage('Destination status updated successfully.');
      await loadDestinations(search.trim());
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-light py-5">
        <div className="container">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-4">
            <div>
              <p className="text-primary text-uppercase fw-semibold small mb-2">Explore TripMate</p>
              <h1 className="fw-bold mb-2">Destinations</h1>
              <p className="text-muted mb-0">Find places for your next personal itinerary.</p>
            </div>
            {canManage && (
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                <i className="bi bi-plus-lg me-2" />
                {showForm ? 'Close form' : 'Create destination'}
              </button>
            )}
          </div>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-danger">{error}</div>}

          {canManage && showForm && (
            <form className="card border-0 shadow-sm mb-4" onSubmit={handleCreate}>
              <div className="card-body p-4">
                <h2 className="h5 fw-bold mb-3">New destination</h2>
                <div className="row g-3">
                  {[
                    ['name', 'Name'],
                    ['category', 'Category'],
                    ['address', 'Address'],
                    ['city', 'City'],
                    ['country', 'Country']
                  ].map(([name, label]) => (
                    <div className="col-md-6" key={name}>
                      <label className="form-label" htmlFor={name}>{label}</label>
                      <input
                        id={name}
                        name={name}
                        className="form-control"
                        value={form[name]}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                  ))}
                  <div className="col-12">
                    <label className="form-label" htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      name="description"
                      className="form-control"
                      rows="3"
                      value={form.description}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
                <button className="btn btn-primary mt-3" disabled={saving}>
                  {saving ? 'Saving...' : 'Save destination'}
                </button>
              </div>
            </form>
          )}

          <form className="input-group mb-4" onSubmit={handleSearch}>
            <input
              className="form-control"
              placeholder="Search by destination or city"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search destinations"
            />
            <button className="btn btn-dark" type="submit">
              <i className="bi bi-search me-2" />Search
            </button>
          </form>

          {loading ? (
            <div className="text-center py-5 text-muted">Loading destinations...</div>
          ) : destinations.length === 0 ? (
            <div className="card border-0 shadow-sm text-center py-5">
              <div className="card-body">
                <i className="bi bi-geo-alt fs-1 text-primary" />
                <h2 className="h5 mt-3">No destinations found</h2>
                <p className="text-muted mb-0">Try another search or add the first destination.</p>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {destinations.map((destination) => (
                <div className="col-md-6 col-xl-4" key={destination._id}>
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between gap-3 mb-3">
                        <span className="badge text-bg-primary">{destination.category}</span>
                        {canManage && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleStatusChange(destination)}
                          >
                            {destination.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                      <h2 className="h5 fw-bold">{destination.name}</h2>
                      <p className="text-muted small mb-2">
                        <i className="bi bi-pin-map me-2" />
                        {destination.location.city}, {destination.location.country}
                      </p>
                      <p className="text-muted mb-0">
                        {destination.description || 'Discover this destination with TripMate.'}
                      </p>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Destinations;
