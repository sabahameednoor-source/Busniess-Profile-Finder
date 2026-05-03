/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Loader2, 
  Info,
  Building2,
  Phone,
  Globe,
  Star,
  Map as MapIcon,
  ShieldCheck,
  ShieldAlert,
  Key,
  Plus,
  Trash2,
  Copy,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signIn, signOut, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Types and interfaces
interface BusinessResult {
  exists: boolean;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
  category?: string;
  isClaimed: 'claimed' | 'unclaimed' | 'unknown';
  profileUrl: string;
  summary: string;
}

interface ApiKey {
  key: string;
  name: string;
  status: string;
  createdAt: string;
  lastUsed: string | null;
}

export default function App() {
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<BusinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'api'>('home');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchApiKeys(u.uid);
      } else {
        setApiKeys([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      setError(null);
      await signIn();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        console.log('Sign-in popup closed by user');
      } else if (err.code === 'auth/cancelled-popup-request') {
        console.log('Multiple sign-in popups requested');
      } else {
        console.error('Sign-in error:', err);
        setError('Failed to sign in. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const fetchApiKeys = async (uid: string) => {
    const path = "apiKeys";
    try {
      const q = query(collection(db, path), where("ownerId", "==", uid));
      const querySnapshot = await getDocs(q);
      const keys: ApiKey[] = [];
      querySnapshot.forEach((doc) => {
        keys.push(doc.data() as ApiKey);
      });
      setApiKeys(keys);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  };

  const generateApiKey = async () => {
    if (!user) return;
    setIsGeneratingKey(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, name: `Key for ${user.email}` })
      });
      const newKey = await response.json();
      setApiKeys(prev => [...prev, newKey]);
    } catch (err) {
      console.error("Error generating key:", err);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const deleteApiKey = async (key: string) => {
    const path = `apiKeys/${key}`;
    try {
      await deleteDoc(doc(db, "apiKeys", key));
      setApiKeys(prev => prev.filter(k => k.key !== key));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const checkGMB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, location })
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify business');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error checking GMB:', err);
      setError('An error occurred while verifying the business listing. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-8 bg-[#0B0F1A]/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <MapIcon size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">GMB Finder</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
          <a href="#" onClick={(e) => { e.preventDefault(); setView('home'); }} className={`hover:text-emerald-400 transition-colors ${view === 'home' ? 'text-emerald-400' : ''}`}>Checker</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('api'); }} className={`hover:text-emerald-400 transition-colors ${view === 'api' ? 'text-emerald-400' : ''}`}>API Access</a>
          <a href="https://github.com/google/generative-ai-js" target="_blank" className="hover:text-emerald-400 transition-colors">Documentation</a>
        </div>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
            <button 
              onClick={() => signOut()}
              className="p-2 rounded-full border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-400/20 transition-all bg-[#151B28]"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="px-5 py-2 rounded-full border border-slate-800 text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm bg-[#151B28] text-slate-300 flex items-center gap-2"
          >
            {isSigningIn ? <Loader2 className="animate-spin" size={16} /> : null}
            Sign In
          </button>
        )}
      </nav>

      <main className="flex-1 flex flex-col items-center px-4 md:px-12 py-16">
        <div className="max-w-3xl w-full">
          {view === 'home' ? (
            <>
              {/* Hero Section */}
              <section className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight leading-tight text-white">
                  Verify Google My Business Presence
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto">
                  Instantly check if a business is listed, verified, or claimed on Google Maps.
                </p>
              </section>

              {/* Search Card */}
              <div className="bg-[#151B28] p-6 md:p-8 rounded-2xl shadow-2xl shadow-black/50 border border-slate-800 mb-8">
                <form onSubmit={checkGMB} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-left">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block px-1">Business Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input
                          type="text"
                          placeholder="e.g. Blue Bottle Coffee"
                          className="w-full pl-10 pr-4 py-3 bg-[#0B0F1A] border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all text-white placeholder:text-slate-600"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="text-left">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block px-1">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input
                          type="text"
                          placeholder="e.g. San Francisco, CA"
                          className="w-full pl-10 pr-4 py-3 bg-[#0B0F1A] border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all text-white placeholder:text-slate-600"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-base hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2 group"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Search size={18} className="group-hover:scale-110 transition-transform" />
                        <span>Check GMB Status</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Quick Result Preview Cards */}
              {!result && !isSearching && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-[#151B28] p-5 rounded-2xl border border-slate-800 flex flex-col items-center group hover:border-emerald-500/50 transition-all">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle2 size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Verification</span>
                    <span className="text-sm font-semibold mt-1 text-slate-200">Highly Accurate</span>
                  </div>
                  <div className="bg-[#151B28] p-5 rounded-2xl border border-slate-800 flex flex-col items-center group hover:border-indigo-500/50 transition-all">
                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-3">
                      <Info size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Real-time</span>
                    <span className="text-sm font-semibold mt-1 text-slate-200">Live API Fetch</span>
                  </div>
                  <div className="bg-[#151B28] p-5 rounded-2xl border border-slate-800 flex flex-col items-center group hover:border-purple-500/50 transition-all">
                    <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-3">
                      <Building2 size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detailed</span>
                    <span className="text-sm font-semibold mt-1 text-slate-200">Status & Insights</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <section className="text-left">
                <h1 className="text-4xl font-bold mb-4 tracking-tight text-white">Developer API Access</h1>
                <p className="text-slate-400">Integrate GMB Checker into your own apps with our simple REST API.</p>
              </section>

              {!user ? (
                <div className="bg-[#151B28] p-8 rounded-2xl border border-slate-800 text-center space-y-4">
                  <Key size={48} className="mx-auto text-slate-700" />
                  <h3 className="text-xl font-bold text-white">Sign In Required</h3>
                  <p className="text-slate-500">You need to be signed in to generate and manage API keys.</p>
                  <button 
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-all flex items-center gap-2 mx-auto disabled:bg-slate-800"
                  >
                    {isSigningIn ? <Loader2 className="animate-spin" size={20} /> : null}
                    Sign In with Google
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-[#151B28] p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Your API Keys</h3>
                      <p className="text-sm text-slate-500">Generate multiple keys for different projects.</p>
                    </div>
                    <button 
                      onClick={generateApiKey}
                      disabled={isGeneratingKey}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-500 transition-all flex items-center gap-2 disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      {isGeneratingKey ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                      Create Key
                    </button>
                  </div>

                  <div className="space-y-4">
                    {apiKeys.length === 0 ? (
                      <div className="text-center py-12 bg-[#151B28]/50 rounded-2xl border border-slate-800/50 border-dashed">
                        <p className="text-slate-600 text-sm italic">No API keys generated yet.</p>
                      </div>
                    ) : (
                      apiKeys.map((k) => (
                        <div key={k.key} className="bg-[#151B28] p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{k.name}</span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => deleteApiKey(k.key)}
                                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <code className="bg-[#0B0F1A] px-4 py-2 rounded-lg border border-slate-700 text-emerald-400 font-mono text-sm flex-1 block truncate">
                              {k.key}
                            </code>
                            <button 
                              onClick={() => copyToClipboard(k.key)}
                              className="p-2 bg-[#0B0F1A] border border-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                            <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                            <span>Last Used: {k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : 'Never'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Documentation Snippet */}
                  <div className="bg-[#0B0F1A] p-6 rounded-2xl border border-slate-800 space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">Quick Usage</h4>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Endpoint:</p>
                      <code className="block bg-slate-900 p-3 rounded-lg border border-slate-800 text-emerald-500 text-xs">
                        POST /api/verify
                      </code>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Payload:</p>
                      <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-400 text-[10px] overflow-x-auto">
{`{
  "businessName": "Starbucks",
  "location": "Seattle",
  "apiKey": "your_api_key_here"
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-8"
              >
                <XCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <AnimatePresence>
            {view === 'home' && isSearching && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <div className="inline-flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="animate-spin text-emerald-500" size={48} />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-lg font-bold text-white">Searching Business Listings</p>
                    <p className="text-sm text-slate-500 underline decoration-emerald-500/20 underline-offset-4">Fetching live data via Search Grounding...</p>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'home' && result && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Result Hero */}
                <div className={`p-8 rounded-2xl border bg-[#151B28] shadow-2xl shadow-black/40 ${result.exists ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex gap-5">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${result.exists ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {result.exists ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                      </div>
                      <div className="text-left">
                        <h3 className="text-2xl font-bold text-white leading-none">{result.name || businessName}</h3>
                        <p className="text-slate-400 flex items-center gap-1 mt-2 text-sm">
                          <MapPin size={14} className="text-emerald-500" />
                          {result.address}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${result.exists ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {result.exists ? 'Listing Found' : 'Not Found'}
                          </span>
                          {result.isClaimed === 'claimed' && (
                            <span className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">
                              <ShieldCheck size={12} /> Claimed
                            </span>
                          )}
                          {result.isClaimed === 'unclaimed' && (
                            <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-yellow-500/20">
                              <ShieldAlert size={12} /> Unclaimed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {result.exists && (
                      <a 
                        href={result.profileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl shadow-sm border border-slate-800 transition-all text-sm h-fit"
                      >
                        <ExternalLink size={16} className="text-emerald-400" />
                        View Profile
                      </a>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                {result.exists && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {result.rating !== undefined && (
                        <div className="bg-[#151B28] p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rating</p>
                            <div className="flex items-center gap-2">
                              <Star size={16} fill="currentColor" className="text-yellow-400" />
                              <span className="text-xl font-bold text-white">{result.rating}</span>
                              <span className="text-slate-500 text-xs">({result.reviewsCount} reviews)</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {result.category && (
                        <div className="bg-[#151B28] p-5 rounded-2xl border border-slate-800 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Category</p>
                          <span className="font-bold text-slate-200">{result.category}</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-[#151B28] p-6 rounded-2xl border border-slate-800 shadow-sm">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-4 px-1">Detailed Analysis</h4>
                      <div className="bg-[#0B0F1A] p-4 rounded-xl border border-slate-800/50">
                        <p className="text-slate-400 leading-relaxed text-sm italic">
                          "{result.summary}"
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 bg-[#0B0F1A] border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-tighter">API Systems Operational</span>
            </div>
            <span className="text-xs text-slate-700 hidden sm:block">|</span>
            <span className="text-xs font-medium text-slate-500 underline decoration-slate-800 underline-offset-4 cursor-pointer hover:text-emerald-400 transition-colors">Documentation</span>
            <span className="text-xs font-medium text-slate-500 underline decoration-slate-800 underline-offset-4 cursor-pointer hover:text-emerald-400 transition-colors">Privacy Policy</span>
          </div>
          <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center">
            &copy; {new Date().getFullYear()} GMB Finder Utility — v4.2.1
          </div>
        </div>
      </footer>
    </div>
  );
}
