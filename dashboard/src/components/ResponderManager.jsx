import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Phone, Mail, MapPin } from 'lucide-react';
import { BACKEND_URL } from '../config';
import PremiumInput from './PremiumInput';
import './ResponderManager.css';

export function ResponderManager() {
    const [responders, setResponders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        role: 'police',
        sector_id: '',
        email: '',
        phone: ''
    });

    const fetchResponders = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/responders`);
            if (res.ok) {
                const data = await res.json();
                setResponders(data);
            }
        } catch (e) {
            console.error("Failed to load responders", e);
        }
    };

    useEffect(() => {
        fetchResponders();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm("Remove this responder?")) return;
        try {
            await fetch(`${BACKEND_URL}/responders/${id}`, { method: 'DELETE' });
            setResponders(prev => prev.filter(r => r._id !== id));
        } catch (e) {
            alert("Failed to delete");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/responders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                setFormData({ name: '', role: 'police', sector_id: '', email: '', phone: '' });
                fetchResponders();
            } else {
                alert("Error creating responder");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="responder-manager">
            <div className="rm-header">
                <h3>Responders & Sectors</h3>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add Responder
                </button>
            </div>

            <div className="rm-list">
                {responders.length === 0 ? (
                    <div className="empty-state">No responders added yet.</div>
                ) : (
                    responders.map(r => (
                        <div key={r._id} className="responder-card">
                            <div className="r-info">
                                <div className="r-avatar">
                                    {r.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="r-details">
                                    <span className="r-name">{r.name}</span>
                                    <div>
                                        <span className="r-role">{r.role}</span>
                                        <span className="r-sector">Sector: {r.sector_id}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="r-contacts">
                                {r.phone && <div title={r.phone}><Phone size={14} /></div>}
                                {r.email && <div title={r.email}><Mail size={14} /></div>}
                            </div>
                            <div className="r-actions">
                                <button className="btn-icon delete" onClick={() => handleDelete(r._id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add New Responder</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <PremiumInput
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Officer John Doe"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    className="premium-select" // Use existing class if available, else style similarly
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    style={{ width: '100%', padding: '10px', background: 'var(--surface-input)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                >
                                    <option value="police">Police</option>
                                    <option value="ambulance">Ambulance</option>
                                    <option value="fire">Fire Dept</option>
                                    <option value="admin">Sector Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Assigned Sector ID</label>
                                <PremiumInput
                                    value={formData.sector_id}
                                    onChange={e => setFormData({ ...formData, sector_id: e.target.value })}
                                    placeholder="e.g. Sector-A"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email (for Alerts)</label>
                                <PremiumInput
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="officer@police.gov"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone (WhatsApp)</label>
                                <PremiumInput
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1234567890"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Saving...' : 'Create Responder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
