'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, User, ShieldAlert, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const errorParam = searchParams.get('error');

  useEffect(() => {
    const auth = getAuthCookie();
    if (auth) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  useEffect(() => {
    if (errorParam === 'session_expired') {
      setError('Session expired. Please log in again.');
    }
  }, [errorParam]);

  function getAuthCookie() {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('admin_session='));
    if (authCookie) {
      return decodeURIComponent(authCookie.split('=')[1]);
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const auth = btoa(`${username}:${password}`);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/tickets`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (res.ok) {
        document.cookie = `admin_session=${encodeURIComponent(auth)}; path=/; max-age=28800; SameSite=Lax`;
        router.push('/admin/dashboard');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Connection error. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="page-section">
        <div className="container login-wrapper">
          <div className="animate-fade-in text-center mb-2xl">
            <div className="login-header-icon">
              <ShieldAlert size={28} />
            </div>
            <h1 className="login-title">Admin Login</h1>
            <p className="login-subtitle">
              Sign in to manage support tickets
            </p>
          </div>

          <div className="card">
            <div className="card-body p-2xl">
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="alert alert-danger mb-xl">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="username" className="form-label flex items-center gap-sm">
                    <User size={16} />
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label flex items-center gap-sm">
                    <Lock size={16} />
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-block"
                  disabled={isLoading || !username || !password}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={18} />
                      Sign In
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="text-center mt-xl">
            <a href="/" className="back-link mb-0">
              <ArrowLeft size={14} />
              Back to ticket submission
            </a>
          </div>
        </div>
      </main>
    </>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div className="container pt-2xl">
        <div className="skeleton" style={{ height: 440, maxWidth: 440, margin: '0 auto' }} />
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  );
}
