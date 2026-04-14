"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BusFront, ArrowRight, Mail, Lock, Loader2, Smartphone, KeyRound, ArrowLeft } from "lucide-react";
import axios from "axios";
import styles from "./login.module.css";

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "https://api2.freshbus.com/admin";

export default function LoginPage() {
  const router = useRouter();

  const [loginMethod, setLoginMethod] = useState<"email" | "otp">("email");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  
  // Email/Password fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // OTP fields
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // EMAIL/PASSWORD LOGIN
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${AUTH_API_URL}/auth/login`, {
        email,
        password,
        deviceId: "web"
      });

      if (response.data && response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));

        const userTypeId = Number(response.data.user.userTypeId);

        if (userTypeId === 3) {
          router.push("/dashboard/depot");
        } else if (userTypeId === 4) {
          router.push("/dashboard/captain");
        } else if (userTypeId === 10) {
          router.push("/dashboard/ops");
        } else {
          setError("Access Denied: Unrecognized user role.");
        }
      } else {
        router.push("/dashboard/ops");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP LOGIN - SEND OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.post(`${AUTH_API_URL}/auth/sendotp`, { mobile });
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP LOGIN - VERIFY OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError("Please enter a valid OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const otpNumber = parseInt(otp, 10);

      const response = await axios.post(`${AUTH_API_URL}/auth/verifyotp`, {
        mobile,
        otp: otpNumber,
        deviceId: "web"
      });

      if (response.data && response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));

        const userTypeId = Number(response.data.user.userTypeId);

        if (userTypeId === 3) {
          router.push("/dashboard/depot");
        } else if (userTypeId === 4) {
          router.push("/dashboard/captain");
        } else if (userTypeId === 10) {
          router.push("/dashboard/ops");
        } else {
          setError("Access Denied: Unrecognized user role.");
        }
      } else {
        router.push("/dashboard/ops");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.loginCard}>
          {/* Login Method Toggle */}
          <div className={styles.methodToggle}>
            <button
              type="button"
              onClick={() => { setLoginMethod("email"); setError(""); setStep("mobile"); }}
              className={`${styles.toggleButton} ${loginMethod === 'email' ? styles.active : ''}`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod("otp"); setError(""); }}
              className={`${styles.toggleButton} ${loginMethod === 'otp' ? styles.active : ''}`}
            >
              OTP via Mobile
            </button>
          </div>

          <div>
            <h1 className={styles.title}>Freshbus</h1>
            <p className={styles.subtitle}>
              {loginMethod === "email"
                ? "Login with your email and password to access the dashboard"
                : step === "mobile"
                ? "Enter your mobile number to sign in safely."
                : `We sent a verification code to +91 ${mobile}`
              }
            </p>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* EMAIL/PASSWORD LOGIN FORM */}
          {loginMethod === "email" && (
            <form className={styles.form} onSubmit={handleEmailLogin}>
              <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
                <label className={styles.label}>Email Address</label>
                <div className={styles.inputIconContainer}>
                  <div className={styles.inputIcon}>
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
                <label className={styles.label}>Password</label>
                <div className={styles.inputIconContainer}>
                  <div className={styles.inputIcon}>
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={`${styles.submitBtn} ${styles.buttonWithIcon}`} disabled={loading}>
                {loading ? <Loader2 size={20} className={styles.spinner} /> : "Login"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {/* OTP LOGIN FORM */}
          {loginMethod === "otp" && step === "mobile" && (
            <form className={`${styles.form} ${styles.formOtp}`} onSubmit={handleSendOtp}>
              <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
                <label className={styles.label}>Mobile Number</label>
                <div className={styles.inputIconContainer}>
                  <div className={styles.inputIcon}>
                    <Smartphone size={20} />
                  </div>
                  <input
                    type="tel"
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="Enter 10-digit number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className={`${styles.submitBtn} ${styles.buttonWithIcon}`} disabled={loading}>
                {loading ? <Loader2 size={20} className={styles.spinner} /> : "Send OTP"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {/* OTP VERIFICATION FORM */}
          {loginMethod === "otp" && step === "otp" && (
            <form className={`${styles.form} ${styles.formOtp}`} onSubmit={handleVerifyOtp}>
              <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
                <label className={styles.label}>One Time Password</label>
                <div className={styles.inputIconContainer}>
                  <div className={styles.inputIcon}>
                    <KeyRound size={20} />
                  </div>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.inputWithIcon} ${styles.otpInput}`}
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className={`${styles.submitBtn} ${styles.buttonWithIcon}`} disabled={loading}>
                {loading ? <Loader2 size={20} className={styles.spinner} /> : "Verify & Login"}
                {!loading && <ArrowRight size={18} />}
              </button>

              <button
                type="button"
                onClick={() => { setStep("mobile"); setOtp(""); setError(""); }}
                className={styles.textButton}
              >
                <ArrowLeft size={16} /> Edit mobile number
              </button>
            </form>
          )}
        </div>
      </div>
      <div className={styles.rightPanel}></div>
    </div>
  );
}
