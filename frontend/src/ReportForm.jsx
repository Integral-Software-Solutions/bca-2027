import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ChevronRight, ChevronLeft, UploadCloud, MapPin, ShieldAlert, CheckCircle } from 'lucide-react';
import LocationPicker from './components/maps/LocationPicker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Make sure to import the CSS file we created in the previous step!
import './FileReport.css';

const categoryOptions = [
  { value: 'theft', label: 'Theft' },
  { value: 'cybercrime', label: 'Cybercrime' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'assault', label: 'Assault' },
  { value: 'missing_person', label: 'Missing Person' },
  { value: 'other', label: 'Other' },
];

const severityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const downloadReceipt = async (reportId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/reports/${reportId}/receipt`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Receipt download failed');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CRMS-${reportId.substring(0, 8).toUpperCase()}-receipt.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

function ReportForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Combined form data state for cleaner wizard management
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    lat: '',
    lng: '',
    category: 'other',
    severity: 'medium',
  });
  const [files, setFiles] = useState([]);

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 3));
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const payload = new FormData();

      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('location', formData.location);
      payload.append('lat', formData.lat);
      payload.append('lng', formData.lng);
      payload.append('category', formData.category);
      payload.append('severity', formData.severity);
      files.forEach((selectedFile) => payload.append('evidence', selectedFile));

      const res = await fetch(`${API_URL}/reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Report submitted to database successfully!");
        try {
          await downloadReceipt(data._id);
        } catch (error) {
          toast.error("Report saved, but receipt download failed");
        }

        // Reset form
        setFormData({ title: '', description: '', location: '', lat: '', lng: '', category: 'other', severity: 'medium' });
        setFiles([]);
        setStep(1);
      } else {
        toast.error(data.message || "Failed to submit report");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Network error. Could not reach servers.");
    } finally {
      setLoading(false);
    }
  };

  // Staggered animation variants matching your prompt
  const formVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.2 } }
  };

  return (
    <div className="report-wrapper">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <h1 className="hero-title">File a New Complaint</h1>
        <p className="hero-subtitle">Provide exact details to log this incident in the database.</p>

        {/* Progress Indicator */}
        <div className="progress-container">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <ShieldAlert size={14} /> 01 Incident
          </div>
          <div className={`progress-line ${step >= 2 ? 'active' : ''}`} />
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <MapPin size={14} /> 02 Location
          </div>
          <div className={`progress-line ${step >= 3 ? 'active' : ''}`} />
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <CheckCircle size={14} /> 03 Review
          </div>
        </div>

        {/* Form Card */}
        <div className="form-card">
          <AnimatePresence mode="wait">

            {/* STEP 1: Incident Details */}
            {step === 1 && (
              <motion.div key="step1" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <div className="input-group">
                  <label className="input-label">Incident Title</label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    placeholder="e.g., Vehicle Theft on 5th Ave"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Detailed Description</label>
                  <textarea
                    name="description"
                    className="form-input"
                    placeholder="Provide as much detail as possible about the incident..."
                    value={formData.description}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label className="input-label">Category</label>
                    <select
                      name="category"
                      className="form-input"
                      value={formData.category}
                      onChange={handleChange}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Severity</label>
                    <select
                      name="severity"
                      className="form-input"
                      value={formData.severity}
                      onChange={handleChange}
                    >
                      {severityOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Location & Media */}
            {step === 2 && (
              <motion.div key="step2" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <div className="input-group">
                  <label className="input-label">Exact Location</label>
                  <input
                    type="text"
                    name="location"
                    className="form-input"
                    placeholder="Street address or distinct landmark"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Pin Location on Map</label>
                  <LocationPicker
                    value={formData.lat && formData.lng ? { lat: Number(formData.lat), lng: Number(formData.lng) } : null}
                    onChange={(coords, address) => setFormData({
                      ...formData,
                      lat: coords.lat,
                      lng: coords.lng,
                      location: formData.location || address || '',
                    })}
                  />
                  <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {formData.lat && formData.lng ? `Selected: ${formData.lat}, ${formData.lng}` : 'Click the map to select the incident location.'}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Attach Evidence</label>
                  <label className="dropzone">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    />
                    <UploadCloud size={32} color="var(--color-primary)" style={{ marginBottom: '10px' }} />
                    <div style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>
                      {files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : "Click to upload or drag files here"}
                    </div>
                    {/* FIXED: Was white with 0.4 opacity, now uses secondary text variable */}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>JPG, PNG, WEBP, PDF, MP4, MOV up to 50MB each</div>
                  </label>
                  {files.length > 0 && (
                    <div className="file-list">
                      {files.map((selectedFile) => (
                        <div key={`${selectedFile.name}-${selectedFile.size}`} className="file-pill">
                          {selectedFile.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
              <motion.div key="step3" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                {/* FIXED: Was color: '#fff', now uses var(--text-primary) */}
                <h3 style={{ fontFamily: 'Syne', fontSize: '20px', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Review Submission</h3>
                <div className="review-block">
                  <label className="input-label">System Timestamp</label>
                  <div className="review-code" style={{ color: 'var(--color-primary)' }}>
                    {new Date().toLocaleString('en-US', {
                      year: 'numeric', month: 'short', day: '2-digit',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </div>
                </div>
                <div className="review-block">
                  <label className="input-label">Title</label>
                  {/* FIXED: Error text now uses var(--color-danger) */}
                  <div className="review-data">{formData.title || <span style={{ color: 'var(--color-danger)' }}>Missing Title</span>}</div>
                </div>

                <div className="review-block">
                  <label className="input-label">Location</label>
                  {/* FIXED: Error text now uses var(--color-danger) */}
                  <div className="review-data">{formData.location || <span style={{ color: 'var(--color-danger)' }}>Missing Location</span>}</div>
                </div>

                <div className="review-block">
                  <label className="input-label">Map Coordinates</label>
                  <div className="review-data">{formData.lat && formData.lng ? `${formData.lat}, ${formData.lng}` : 'No map pin selected'}</div>
                </div>

                <div className="review-block">
                  <label className="input-label">Classification</label>
                  <div className="review-data">
                    {categoryOptions.find((option) => option.value === formData.category)?.label || 'Other'} / {severityOptions.find((option) => option.value === formData.severity)?.label || 'Medium'}
                  </div>
                </div>

                <div className="review-block">
                  <label className="input-label">Attached Evidence</label>
                  <div className="review-data">{files.length ? files.map((selectedFile) => selectedFile.name).join(', ') : 'None attached'}</div>
                </div>

                <div className="review-block" style={{ borderBottom: 'none' }}>
                  <label className="input-label">Description</label>
                  {/* FIXED: Was white with 0.8 opacity, now uses secondary text variable */}
                  <div className="review-data" style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    {formData.description || <span style={{ color: 'var(--color-danger)' }}>Missing Description</span>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="button-group">
            {step > 1 ? (
              <button className="btn btn-secondary" onClick={handlePrev}>
                <ChevronLeft size={18} /> Back
              </button>
            ) : <div></div>} {/* Empty div keeps Next button aligned right */}

            {step < 3 ? (
              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={
                  (step === 1 && (!formData.title || !formData.description)) ||
                  (step === 2 && !formData.location)
                }
                style={{
                  opacity: ((step === 1 && (!formData.title || !formData.description)) || (step === 2 && !formData.location)) ? 0.5 : 1
                }}
              >
                Continue <ChevronRight size={18} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Transmitting...' : 'Submit to Database'} <CheckCircle size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ReportForm;
