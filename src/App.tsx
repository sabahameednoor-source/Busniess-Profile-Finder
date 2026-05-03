/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
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
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

export default function App() {
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<BusinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkGMB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `Verify if the business "${businessName}" exists on Google Maps (Google Business Profile) in the location "${location || 'anywhere'}". 
      Provide detailed information about its existence, address, profile URL, and whether it appears to be claimed or unclaimed.
      If multiple businesses exist with similar names, focus on the most relevant one for the specified location.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              exists: { type: Type.BOOLEAN },
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              phone: { type: Type.STRING },
              website: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewsCount: { type: Type.INTEGER },
              category: { type: Type.STRING },
              isClaimed: { 
                type: Type.STRING, 
                enum: ['claimed', 'unclaimed', 'unknown'] 
              },
              profileUrl: { type: Type.STRING },
              summary: { type: Type.STRING }
            },
            required: ['exists', 'name', 'address', 'isClaimed', 'profileUrl', 'summary']
          },
          tools: [{ googleSearch: {} }]
        }
      });

      const data = JSON.parse(response.text || '{}') as BusinessResult;
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <MapIcon size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">GMB Finder</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
          <a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Bulk Search</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">API Access</a>
        </div>
        <button className="px-5 py-2 rounded-full border border-slate-800 text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm bg-[#151B28] text-slate-300">Sign In</button>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-12 py-16">
        <div className="max-w-3xl w-full">
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

          {/* Quick Result Preview Cards (Waiting State) */}
          {!result && !isSearching && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-[#151B28] p-5 rounded-2xl border border-slate-800 flex flex-col items-center group hover:border-emerald-500/50 transition-all">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Verification</span>
                <span className="text-sm font-semibold mt-1 text-slate-200">Highly Accurate</span>
              </div>
              <div className="bg-[#151B28] p-5 rounded-2xl border border-slate-800 flex flex-col items-center group hover:border-indigo-500/50 transition-all">
                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-3">
                  <Info size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Real-time</span>
                <span className="text-sm font-semibold mt-1 text-slate-200">Live API Fetch</span>
              </div>
              <div className="bg-[#151B28] p-5 rounded-2xl border border-slate-800 flex flex-col items-center group hover:border-purple-500/50 transition-all">
                <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-3">
                  <Building2 size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Detailed</span>
                <span className="text-sm font-semibold mt-1 text-slate-200">Status & Insights</span>
              </div>
            </div>
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
            {isSearching && (
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

            {result && !isSearching && (
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
