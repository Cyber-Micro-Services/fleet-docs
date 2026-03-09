'use client';

import { useState } from 'react';
import { useApp } from '@/lib/app-context';
import { AlertCircle, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = login(username, password);
    
    if (!success) {
      setError('Username sau parolă incorectă');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-blue-600 mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FleetDocs</h1>
          <p className="text-gray-600">Gestionare Documente Vehicule</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Utilizator
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Parolă
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Se conectează...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Conectare
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
          <p className="text-xs text-gray-600 mb-2">Acces Demo:</p>
          <p className="text-sm">
            <span className="font-semibold text-gray-700">Utilizator: </span>
            <span className="text-gray-600">admin</span>
          </p>
          <p className="text-sm">
            <span className="font-semibold text-gray-700">Parolă: </span>
            <span className="text-gray-600">admin</span>
          </p>
        </div>
      </div>
    </div>
  );
}
