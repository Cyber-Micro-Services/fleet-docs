"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { AlertCircle, LogIn, UserPlus } from "lucide-react";

type AuthMode = "login" | "register";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEST_USERNAME = "admin";
const TEST_PASSWORD = "admin";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useApp();

  const resetError = () => {
    if (error) {
      setError("");
    }
  };

  const resetSuccess = () => {
    if (success) {
      setSuccess("");
    }
  };

  const validateLogin = (): string | null => {
    if (email.trim() === TEST_USERNAME && password === TEST_PASSWORD) {
      return null;
    }

    if (!email.trim()) {
      return "Email este obligatoriu";
    }
    if (email.trim().length > 180) {
      return "Email trebuie sa aiba maxim 180 de caractere";
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return "Invalid email format";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    return null;
  };

  const validateRegister = (): string | null => {
    if (!firstName.trim()) {
      return "Prenumele este obligatoriu";
    }
    if (firstName.trim().length > 120) {
      return "Prenumele trebuie sa aiba maxim 120 de caractere";
    }
    if (!lastName.trim()) {
      return "Numele este obligatoriu";
    }
    if (lastName.trim().length > 120) {
      return "Numele trebuie sa aiba maxim 120 de caractere";
    }

    const loginValidationError = validateLogin();
    if (loginValidationError) {
      return loginValidationError;
    }

    if (confirmPassword !== password) {
      return "Confirm password trebuie sa fie egal cu parola";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError =
      mode === "login" ? validateLogin() : validateRegister();
    if (validationError) {
      resetSuccess();
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      if (mode === "login") {
        await login({
          email: email.trim(),
          password,
        });
      } else {
        await register({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        });

        setMode("login");
        setFirstName("");
        setLastName("");
        setPassword("");
        setConfirmPassword("");
        setSuccess("Utilizator creat cu succes. Te poti autentifica acum.");
      }
    } catch (submitError) {
      resetSuccess();
      const message =
        submitError instanceof Error
          ? submitError.message
          : "A aparut o eroare neasteptata";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit =
    mode === "login"
      ? !!email.trim() && !!password && !isLoading
      : !!firstName.trim() &&
        !!lastName.trim() &&
        !!email.trim() &&
        !!password &&
        !!confirmPassword &&
        !isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-blue-600 mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FleetDocs</h1>
          <p className="text-gray-600">
            Autentificare si inregistrare utilizatori
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 mb-6">
          <div className="mb-6 grid grid-cols-2 rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                resetError();
                resetSuccess();
              }}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                mode === "login"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              disabled={isLoading}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                resetError();
                resetSuccess();
              }}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                mode === "register"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              disabled={isLoading}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "register" && (
              <>
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Prenume
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      resetError();
                      resetSuccess();
                    }}
                    placeholder="Ion"
                    maxLength={120}
                    className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nume
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      resetError();
                      resetSuccess();
                    }}
                    placeholder="Popescu"
                    maxLength={120}
                    className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type={mode === "login" ? "text" : "email"}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetError();
                  resetSuccess();
                }}
                placeholder={"ion.popescu@email.ro"}
                maxLength={180}
                className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Parolă
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  resetError();
                  resetSuccess();
                }}
                placeholder="••••••••"
                minLength={mode === "register" ? 8 : undefined}
                className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {mode === "register" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirma parola
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    resetError();
                    resetSuccess();
                  }}
                  placeholder="••••••••"
                  minLength={8}
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                <p className="text-sm">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Se proceseaza...
                </>
              ) : (
                <>
                  {mode === "login" ? (
                    <LogIn className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {mode === "login" ? "Conectare" : "Creare cont"}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Testing Info */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
          <p className="text-sm text-gray-700">
            For testing purposes you can use email: admin, password: admin
          </p>
        </div>
      </div>
    </div>
  );
}
