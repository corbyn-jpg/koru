import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Background from "../assets/backgrounds/Background.png";
import AuthInput from "../components/UI/authInput";
import GoogleAuthButton from "../components/UI/googleAuthButton";
import { GraduationCap } from "lucide-react";
import {
  loginUser,
  loginWithGoogle,
  registerUser,
  saveAuthSession,
} from "../services/authService";

// Placeholder institutions – lets the user identify where they are studying
const institutions = [
  "Open Window",
  "University of Pretoria",
  "University of Johannesburg",
  "University of Cape Town",
  "University of the Witwatersrand",
  "Stellenbosch University",
  "North-West University",
  "University of South Africa",
  "Rhodes University",
];

// Default form state – keeps all sign-up values in one place
const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "student",
  institution: "",
};

// Sign-up page – registers new users with profile, role, and institution details
export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Update the form state whenever the user changes an input or dropdown
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  // Validate and submit the sign-up form, then log the new user in automatically
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        institution: form.institution,
      });

      const loginData = await loginUser({
        email: form.email,
        password: form.password,
      });

      saveAuthSession({
        ...loginData,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        institution: form.institution,
      });
      setSuccess("Account created successfully. Redirecting...");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Complete registration by using the Google credential returned by the auth button
  async function handleGoogleSignup(credential) {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = await loginWithGoogle(credential, form.role);
      saveAuthSession({ ...data, institution: form.institution });
      setSuccess("Google account connected. Redirecting...");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-tts-root="true"
      className="fixed inset-0 flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: `url(${Background})` }}
    >
      <div className="w-full max-w-xl rounded-[32px] bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
          <p className="mt-2 text-sm text-slate-600">
            New here? Let’s get you set up.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <AuthInput
            label="First name"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="Jane"
            required
          />

          <AuthInput
            label="Last name"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Doe"
            required
          />

          <div className="sm:col-span-2">
            <AuthInput
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <label className="sm:col-span-2 flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>Institution</span>
            <select
              name="institution"
              value={form.institution}
              onChange={handleChange}
              required
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-mint"
            >
              <option value="" disabled>
                Select your institution
              </option>
              {institutions.map((institution) => (
                <option key={institution} value={institution}>
                  {institution}
                </option>
              ))}
            </select>
          </label>

          <AuthInput
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create a password"
            required
          />

          <AuthInput
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Repeat your password"
            required
          />

          <label className="sm:col-span-2 flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>Role</span>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-mint"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {error ? (
            <div className="sm:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 sm:col-span-2 rounded-2xl bg-brand px-4 py-3 font-semibold text-white transition hover:bg-[#2f005f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <GraduationCap size={18} />
            <span>{loading ? "Creating Account..." : "Lets Learn"}</span>
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <GoogleAuthButton
          text="signup_with"
          onCredential={handleGoogleSignup}
          onError={(err) => setError(err.message || "Google sign-up failed.")}
        />

        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-brand hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
