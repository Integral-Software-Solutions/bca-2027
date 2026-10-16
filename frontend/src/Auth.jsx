import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Mail, User, KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification State
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempUser, setTempUser] = useState(null);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = request email, 2 = enter token & new password
  const [resetData, setResetData] = useState({ email: '', token: '', newPassword: '' });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResetChange = (e) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
  };

  // --- Step 1: Handle Standard Login / Registration ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin
        ? `${API_URL}/auth/login`
        : `${API_URL}/auth/register`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogin ? { email: formData.email, password: formData.password } : formData)
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);

        const userData = data.user || data.userData || {
          email: formData.email,
          role: data.role || 'citizen',
          isEmailVerified: data.isEmailVerified
        };

        if (userData.isEmailVerified) {
          localStorage.setItem("user", JSON.stringify(userData));
          toast.success(isLogin ? "Authentication successful" : "Registration complete");
          setUser(userData);
        } else {
          setTempUser(userData);
          setShowOTP(true);
          await requestOTP(data.token);
        }
      } else {
        toast.error(data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Server connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Request the OTP Email ---
  const requestOTP = async (token) => {
    try {
      const res = await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Verification code sent to your email.");
      } else {
        toast.error(data.message || "Failed to send verification code.");
      }
    } catch (error) {
      toast.error("Network error while sending OTP.");
    }
  };

  // --- Step 3: Verify the OTP ---
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ otp: otpCode })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Email verified successfully!");
        const finalUser = { ...tempUser, isEmailVerified: true };
        localStorage.setItem("user", JSON.stringify(finalUser));
        setUser(finalUser);
      } else {
        toast.error(data.message || "Invalid verification code.");
      }
    } catch (error) {
      toast.error("Server connection error.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 4: Request Password Reset Code ---
  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetData.email })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Password reset code sent to your email.");
        setResetStep(2); // Move to token/password entry
      } else {
        toast.error(data.message || "Failed to send reset code.");
      }
    } catch (error) {
      toast.error("Network error while requesting reset.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 5: Submit New Password ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetData.email,
          token: resetData.token,
          newPassword: resetData.newPassword
        })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Password reset successfully. You can now log in.");
        setShowForgotPassword(false);
        setResetStep(1);
        setIsLogin(true);
      } else {
        toast.error(data.message || "Failed to reset password.");
      }
    } catch (error) {
      toast.error("Network error while resetting password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      zIndex: 10,
      background: 'var(--bg-main)'
    }}>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{
              background: 'rgba(0, 207, 255, 0.1)',
              padding: '12px',
              borderRadius: '50%',
              border: '1px solid rgba(0, 207, 255, 0.2)'
            }}>
              {showForgotPassword ? <Lock size={32} color="var(--color-primary)" />
                : showOTP ? <KeyRound size={32} color="var(--color-primary)" />
                  : <Shield size={32} color="var(--color-primary)" />}
            </div>
          </div>
          <h1 className="display-font" style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--text-primary)' }}>
            {showForgotPassword ? 'Password Recovery' : showOTP ? 'Identity Verification' : 'System Authorization'}
          </h1>
          <p className="mono-font" style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {showForgotPassword
              ? (resetStep === 1 ? 'Enter your registered email' : 'Create a new security key')
              : showOTP
                ? 'Enter 6-digit code sent to email'
                : (isLogin ? 'Enter credentials to access' : 'Register new citizen profile')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {showForgotPassword ? (
            /* --- FORGOT PASSWORD FORM --- */
            <motion.form
              key="forgot-password-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={resetStep === 1 ? handleRequestPasswordReset : handleResetPassword}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              <div className="input-group">
                <label style={labelStyle}>Email Address</label>
                <div style={inputWrapperStyle}>
                  <Mail size={16} color="var(--text-secondary)" />
                  <input
                    type="email"
                    name="email"
                    placeholder="citizen@domain.com"
                    value={resetData.email}
                    onChange={handleResetChange}
                    required
                    readOnly={resetStep === 2} // Lock email on step 2
                    style={inputStyle}
                    className="auth-input"
                  />
                </div>
              </div>

              {resetStep === 2 && (
                <>
                  <div className="input-group">
                    <label style={labelStyle}>Reset Token / OTP</label>
                    <div style={inputWrapperStyle}>
                      <KeyRound size={16} color="var(--text-secondary)" />
                      <input
                        type="text"
                        name="token"
                        placeholder="Enter code from email"
                        value={resetData.token}
                        onChange={handleResetChange}
                        required
                        style={inputStyle}
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label style={labelStyle}>New Security Key</label>
                    <div style={{ ...inputWrapperStyle, position: 'relative' }}>
                      <Lock size={16} color="var(--text-secondary)" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        placeholder="••••••••"
                        value={resetData.newPassword}
                        onChange={handleResetChange}
                        required
                        style={{ ...inputStyle, paddingRight: '30px' }}
                        className="auth-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={eyeButtonStyle}
                      >
                        {showPassword ? <EyeOff size={16} color="var(--text-secondary)" /> : <Eye size={16} color="var(--text-secondary)" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                style={buttonStyle(loading)}
              >
                {loading ? 'PROCESSING...' : resetStep === 1 ? 'SEND RECOVERY CODE' : 'RESET PASSWORD'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setResetStep(1); }}
                  style={linkButtonStyle}
                >
                  Return to Login
                </button>
              </div>
            </motion.form>

          ) : showOTP ? (

            /* --- OTP VERIFICATION FORM --- */
            <motion.form
              key="otp-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleVerifyOTP}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              <div className="input-group">
                <label style={{ ...labelStyle, textAlign: 'center' }}>Verification Code</label>
                <div style={{ ...inputWrapperStyle, justifyContent: 'center' }}>
                  <input
                    type="text"
                    name="otp"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    style={{
                      ...inputStyle,
                      textAlign: 'center',
                      fontSize: '24px',
                      letterSpacing: '0.5em',
                      paddingLeft: '0.5em'
                    }}
                    className="auth-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                style={buttonStyle(loading || otpCode.length !== 6)}
              >
                {loading ? 'VERIFYING...' : 'CONFIRM IDENTITY'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => requestOTP(localStorage.getItem("token"))}
                  style={linkButtonStyle}
                >
                  Resend Code
                </button>
              </div>
            </motion.form>

          ) : (

            /* --- LOGIN / REGISTER FORM --- */
            <motion.form
              key="auth-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              {!isLogin && (
                <div className="input-group">
                  <label style={labelStyle}>Full Name</label>
                  <div style={inputWrapperStyle}>
                    <User size={16} color="var(--text-secondary)" />
                    <input
                      type="text"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required={!isLogin}
                      style={inputStyle}
                      className="auth-input"
                    />
                  </div>
                </div>
              )}

              <div className="input-group">
                <label style={labelStyle}>Email Address</label>
                <div style={inputWrapperStyle}>
                  <Mail size={16} color="var(--text-secondary)" />
                  <input
                    type="email"
                    name="email"
                    placeholder="citizen@domain.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="input-group">
                <label style={labelStyle}>Security Key</label>
                <div style={{ ...inputWrapperStyle, position: 'relative' }}>
                  <Lock size={16} color="var(--text-secondary)" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    style={{ ...inputStyle, paddingRight: '30px' }}
                    className="auth-input"
                  />
                  {/* Password Toggle Eye Icon */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={eyeButtonStyle}
                  >
                    {showPassword ? <EyeOff size={16} color="var(--text-secondary)" /> : <Eye size={16} color="var(--text-secondary)" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setResetStep(1); }}
                    style={{ ...linkButtonStyle, fontSize: '11px', textDecoration: 'none' }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={buttonStyle(loading)}
              >
                {loading ? 'PROCESSING...' : (isLogin ? 'AUTHENTICATE' : 'INITIALIZE PROFILE')}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  {isLogin ? "No registered profile? " : "Already have clearance? "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    style={linkButtonStyle}
                  >
                    {isLogin ? "Request Access" : "Sign In"}
                  </button>
                </p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// --- Inline Styles for UI components ---
const labelStyle = {
  display: 'block',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  marginBottom: '8px',
  fontWeight: 500
};

const inputWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  borderBottom: '1px solid var(--border-subtle)',
  paddingBottom: '8px',
  transition: 'border-color 0.3s'
};

const inputStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-sans)'
};

const linkButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--color-primary)',
  fontWeight: 500,
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
  textUnderlineOffset: '4px'
};

const eyeButtonStyle = {
  position: 'absolute',
  right: '0',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: '4px',
  color: 'var(--text-secondary)'
};

const buttonStyle = (disabled) => ({
  background: 'var(--color-primary)',
  color: '#000',
  border: 'none',
  padding: '14px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  marginTop: '1rem',
  transition: 'transform 0.1s, opacity 0.2s',
  opacity: disabled ? 0.7 : 1,
  fontFamily: 'var(--font-sans)',
  letterSpacing: '0.02em',
  width: '100%'
});
