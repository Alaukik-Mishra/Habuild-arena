import React, { useState } from 'react';
import { Swords, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { getProfileByPhone, upsertProfile } from '../lib/db';

interface Props {
  onLogin: (user: UserProfile) => void;
}

export default function Login({ onLogin }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;

  const handleLogin = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const existing = await getProfileByPhone(fullPhone);
      if (existing) {
        onLogin({
          name: existing.name,
          phone: existing.phone,
          countryCode: existing.country_code,
          points: existing.coins ?? 1000,
          streak: existing.streak ?? 0,
          wins: existing.wins ?? 0,
          losses: existing.losses ?? 0,
        });
        return;
      }

      const id = crypto.randomUUID();
      const profile = {
        id,
        name: name.trim(),
        phone: fullPhone,
        country_code: countryCode,
        coins: 1000,
        streak: 0,
        wins: 0,
        losses: 0,
        stars: 0,
      };
      await upsertProfile(profile);
      onLogin({
        name: profile.name,
        phone: profile.phone,
        countryCode: profile.country_code,
        points: profile.coins,
        streak: profile.streak,
        wins: profile.wins,
        losses: profile.losses,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-10">

        <div className="text-center space-y-3">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center transform rotate-3">
            <Swords className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-5xl font-serif font-bold text-primary italic tracking-tight">Arena</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Enter the Battleground</p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-100 text-red-600 text-xs font-bold p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-action uppercase tracking-wider ml-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Leo"
              className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-4 font-bold text-gray-800 placeholder:text-gray-300 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-[0_4px_0_#f3f4f6] focus:shadow-[0_2px_0_#f3f4f6] focus:translate-y-[2px]"
            />
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-action uppercase tracking-wider ml-1">Phone Number</label>
            <div className="flex space-x-2">
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="bg-white border-2 border-gray-200 rounded-xl px-2 py-4 font-bold text-gray-800 outline-none focus:border-primary shadow-[0_4px_0_#f3f4f6]"
              >
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+91">🇮🇳 +91</option>
                <option value="+92">🇵🇰 +92</option>
                <option value="+971">🇦🇪 +971</option>
              </select>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="999-999-9999"
                className="flex-1 w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-4 font-bold text-gray-800 placeholder:text-gray-300 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-[0_4px_0_#f3f4f6] focus:shadow-[0_2px_0_#f3f4f6] focus:translate-y-[2px]"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-primary text-white rounded-xl py-5 font-bold tracking-widest text-lg shadow-[0_6px_0_var(--color-primary-dark)] active:shadow-[0_0px_0_var(--color-primary-dark)] active:translate-y-[6px] transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span className="uppercase text-[15px] leading-none">Enter Arena</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

