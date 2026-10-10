'use client';

import React, { useState } from 'react';
import { KeyRound, LogIn, ShoppingCart, UserPlus } from 'lucide-react';
import { sendPasswordReset, signIn, signUp } from '@/lib/supabase';

export function AuthView() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        const signedIn = await signUp(email.trim(), password, name);
        if (!signedIn) setMessage('Conta criada. Confirme o e-mail enviado pelo Supabase para entrar.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir o acesso.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage('Informe seu e-mail primeiro.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setMessage('Enviamos um link para redefinir sua senha.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar o link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <section className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white"><ShoppingCart size={24} /></div>
          <h1 className="text-xl font-extrabold text-slate-900">Minhas Listas</h1>
          <p className="mt-1 text-sm text-slate-500">Entre para sincronizar e compartilhar suas listas.</p>
        </div>
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => { setMode('login'); setMessage(''); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Entrar</button>
          <button type="button" onClick={() => { setMode('signup'); setMessage(''); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Criar conta</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && <label className="block text-xs font-bold text-slate-700">Nome<input required value={name} onChange={event => setName(event.target.value)} autoComplete="name" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" placeholder="Seu nome" /></label>}
          <label className="block text-xs font-bold text-slate-700">E-mail<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" placeholder="voce@exemplo.com" /></label>
          <label className="block text-xs font-bold text-slate-700">Senha<input required type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" placeholder="Mínimo de 8 caracteres" /></label>
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">{message}</p>}
          <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-60">{mode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
          {mode === 'login' && <button disabled={busy} type="button" onClick={resetPassword} className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-slate-500 hover:text-emerald-700"><KeyRound size={14} />Esqueci minha senha</button>}
        </form>
      </section>
    </main>
  );
}
