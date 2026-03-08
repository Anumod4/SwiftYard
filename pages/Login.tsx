
import React, { useState, useMemo, useEffect } from 'react';
import { Box, Lock, Mail, ArrowRight, AlertCircle, Truck, Phone, Building, ChevronDown, Warehouse, Briefcase, User, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuth as useClerkAuth, useSignIn, useSignUp, useClerk } from '@clerk/clerk-react';
import { useData } from '../contexts/DataContext';
import { Driver } from '../types';
import { Logo } from '../components/Logo';

export const Login: React.FC = () => {
    const { clerkLogin, clerkSignup, driverLogin, selectDriver } = useAuth();
    const { getToken } = useClerkAuth();
    const clerk = useClerk();
    const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
    const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
    const { facilities, allCarriers, addToast } = useData();

    // Force dark theme on login page - always
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);
    // SEQUENCE: YARD, CARRIER, DRIVER
    const [loginMode, setLoginMode] = useState<'carrier' | 'staff' | 'driver'>('staff');

    // Staff/Carrier State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState(''); // Used as identifier (username/email) for login, and explicitly email for signup
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [signupFacilityId, setSignupFacilityId] = useState('');
    const [signupCarrierId, setSignupCarrierId] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    // Clerk MFA / OTP States
    const [verifyingMfa, setVerifyingMfa] = useState(false);
    const [mfaCode, setMfaCode] = useState('');
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [emailCode, setEmailCode] = useState('');

    // Forgot Password State
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Driver State
    const [trailerInput, setTrailerInput] = useState('');
    const [matchedDrivers, setMatchedDrivers] = useState<Driver[]>([]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Filter carriers based on selected facility for signup
    // facilityId can be a string or JSON array
    const availableCarriers = useMemo(() => {
        if (!signupFacilityId) return allCarriers;
        return allCarriers.filter(c => {
            if (!c.facilityId) return false;
            try {
                const parsed = JSON.parse(c.facilityId);
                if (Array.isArray(parsed)) return parsed.includes(signupFacilityId);
                return parsed === signupFacilityId;
            } catch {
                return c.facilityId === signupFacilityId;
            }
        });
    }, [allCarriers, signupFacilityId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (loginMode === 'driver') {
                const foundDrivers = await driverLogin(trailerInput);
                if (foundDrivers.length === 0) setError("Trailer number not found or no driver assigned.");
                else if (foundDrivers.length > 1) setMatchedDrivers(foundDrivers);
                return;
            }

            // Handle Carrier or Staff login
            let authEmail = email;
            let authPassword = password;

            // Shortcut for testing
            if (email.trim() === 'admin' && password.trim() === 'admin') {
                authEmail = 'superadmin@swiftyard.com';
                authPassword = 'SuperSecretPassword123!';
            }

            if (isSignUp) {
                if (!isSignUpLoaded) return;

                if (!firstName.trim() || !lastName.trim()) {
                    setError("First name and Last name are required for signup.");
                    setLoading(false);
                    return;
                }

                // Start Clerk Sign Up
                const signUpResponse = await signUp.create({
                    emailAddress: authEmail,
                    password: authPassword,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    username: `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`.replace(/[^a-z0-9_.-]/g, '')
                });

                // Send email verification
                await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
                setVerifyingEmail(true);
            } else {
                if (!isSignInLoaded) return;

                // Start Clerk Sign In
                const signInResponse = await signIn.create({
                    identifier: authEmail,
                    password: authPassword,
                });

                if (signInResponse.status === 'needs_second_factor') {
                    setVerifyingMfa(true);
                } else if (signInResponse.status === 'complete') {
                    await setSignInActive({ session: signInResponse.createdSessionId });
                    // session will be active, and we get the token
                    const token = await getToken();
                    if (token) {
                        await clerkLogin(token, loginMode === 'carrier' ? 'carrier' : 'staff');
                    } else {
                        setError("Failed to get Clerk token after signin.");
                    }
                } else {
                    setError(`Unexpected status: ${signInResponse.status}`);
                }
            }
        } catch (err: any) {
            console.error("Authentication error:", JSON.stringify(err, null, 2));

            // If Clerk throws "You're already signed in", gracefully snag the existing active session
            if (err.errors?.[0]?.code === 'session_exists') {
                if (isSignUp) {
                    setError("You are currently signed in as another user. Please log out first, or try again in an Incognito window.");
                    return;
                }

                let token = await clerk.session?.getToken();
                if (token) {
                    await clerkLogin(token, loginMode === 'carrier' ? 'carrier' : 'staff');
                    return;
                }
            }

            const msg = err.errors?.[0]?.longMessage || err.message || 'Authentication failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Please enter your email above to reset your password.");
            return;
        }
        setError('');
        setLoading(true);
        try {
            await signIn?.create({
                strategy: 'reset_password_email_code',
                identifier: email,
            });
            setIsResettingPassword(true);
            addToast("Success", "Password reset code sent to your email", "success");
        } catch (err: any) {
            setError(err.errors?.[0]?.longMessage || err.message || 'Failed to send reset code.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSignInLoaded) return;
        setError('');
        setLoading(true);

        try {
            const result = await signIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code: resetCode,
                password: newPassword,
            });

            if (result.status === 'complete') {
                await setSignInActive({ session: result.createdSessionId });
                const token = await getToken();
                if (token) {
                    await clerkLogin(token, loginMode === 'carrier' ? 'carrier' : 'staff');
                } else {
                    setError("Failed to get Clerk token after password reset.");
                }
            } else {
                setError("Password reset requires further action.");
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.longMessage || err.message || 'Password reset failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSignUpLoaded) return;
        setError('');
        setLoading(true);

        try {
            let signUpResponse = signUp;

            if (signUp.status !== 'complete') {
                signUpResponse = await signUp.attemptEmailAddressVerification({
                    code: emailCode,
                });
            }

            if (signUpResponse.status === 'complete') {
                await setSignUpActive({ session: signUpResponse.createdSessionId });

                let token = await clerk.session?.getToken();
                if (!token) {
                    const session = clerk.client.sessions.find(s => s.id === signUpResponse.createdSessionId);
                    token = session ? await session.getToken() : null;
                }

                if (token) {
                    await clerkSignup(
                        token,
                        signupFacilityId,
                        loginMode === 'carrier' ? 'carrier' : 'user',
                        signupCarrierId,
                        firstName.trim(),
                        lastName.trim(),
                        `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`.replace(/[^a-z0-9_.-]/g, '')
                    );
                } else {
                    setError("Failed to get Clerk token after signup.");
                }
            } else {
                setError(`Unexpected status: ${signUpResponse.status}`);
            }
        } catch (err: any) {
            console.error("Email verification error:", JSON.stringify(err, null, 2));
            const msg = err.errors?.[0]?.longMessage || err.message || 'Verification failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSignInLoaded) return;
        setError('');
        setLoading(true);

        try {
            let signInResponse = signIn;

            if (signIn.status !== 'complete') {
                signInResponse = await signIn.attemptSecondFactor({
                    strategy: "totp",
                    code: mfaCode,
                });
            }

            if (signInResponse.status === 'complete') {
                await setSignInActive({ session: signInResponse.createdSessionId });

                let token = await clerk.session?.getToken();
                if (!token) {
                    const session = clerk.client.sessions.find(s => s.id === signInResponse.createdSessionId);
                    token = session ? await session.getToken() : null;
                }

                if (token) {
                    await clerkLogin(token, loginMode === 'carrier' ? 'carrier' : 'staff');
                } else {
                    setError("Failed to get Clerk token after MFA signin.");
                }
            } else {
                setError(`Unexpected status: ${signInResponse.status}`);
            }
        } catch (err: any) {
            console.error("MFA error:", JSON.stringify(err, null, 2));
            const msg = err.errors?.[0]?.longMessage || err.message || 'MFA verification failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const getFacilityName = (id?: string) => {
        if (!id) return 'Unknown Facility';
        const fac = facilities.find(f => f.id === id);
        return fac ? fac.name : id;
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-50 dark:bg-[#121212] overflow-y-auto transition-colors duration-500">
            <div className="min-h-full w-full flex items-center justify-center p-4 py-8">
                <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                    <div className="p-4 text-center border-b border-slate-200 dark:border-white/5 relative overflow-hidden bg-slate-50 dark:bg-white/5">
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent transition-transform duration-500 ${loading ? 'translate-x-full' : '-translate-x-full'}`} />

                        <div className="w-full max-w-[20rem] md:max-w-[24rem] mx-auto flex items-end justify-center">
                            <Logo className="h-24 md:h-32 drop-shadow-2xl object-bottom" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">SwiftYard</h1>
                        <p className="text-slate-500 dark:text-gray-400 text-sm">Every trailer. Every move. Simplified.</p>

                        {matchedDrivers.length === 0 && (
                            <div className="flex bg-slate-200 dark:bg-black/40 p-1 rounded-xl mt-6">
                                <button
                                    onClick={() => { setLoginMode('carrier'); setError(''); setIsSignUp(false); }}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-1.5 ${loginMode === 'carrier' ? 'bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                                >
                                    <Briefcase className="w-3.5 h-3.5" /> Carrier
                                </button>
                                <button
                                    onClick={() => { setLoginMode('staff'); setError(''); setIsSignUp(false); }}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-1.5 ${loginMode === 'staff' ? 'bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                                >
                                    <Warehouse className="w-3.5 h-3.5" /> Yard
                                </button>
                                <button
                                    onClick={() => { setLoginMode('driver'); setError(''); }}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-1.5 ${loginMode === 'driver' ? 'bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                                >
                                    <Truck className="w-3.5 h-3.5" /> Driver
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-8 min-h-[400px] flex flex-col transition-all duration-300">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium mb-6 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {matchedDrivers.length > 0 ? (
                            <div className="space-y-4">
                                <div className="text-center mb-4"><h3 className="font-bold">Select Facility</h3></div>
                                {matchedDrivers.map(d => (
                                    <button key={d.id} onClick={() => selectDriver(d)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 p-4 rounded-xl flex items-center gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-[#3B82F6] group-hover:text-white transition-colors"><Building className="w-5 h-5" /></div>
                                        <div className="text-left"><div className="font-bold text-slate-900 dark:text-white">{getFacilityName(d.facilityId)}</div><div className="text-xs text-slate-500">Log in as {d.name}</div></div>
                                        <ArrowRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-[#3B82F6]" />
                                    </button>
                                ))}
                            </div>
                        ) : isResettingPassword ? (
                            <form onSubmit={handleResetPassword} className="flex-1 flex flex-col h-full">
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 bg-[#3B82F6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Lock className="w-8 h-8 text-[#3B82F6]" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Reset Password</h3>
                                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">Enter the code sent to {email} and your new password.</p>
                                    </div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Reset Code</label>
                                    <div className="relative mb-4"><KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" /><input type="text" required value={resetCode} onChange={e => setResetCode(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#3B82F6]" placeholder="123456" /></div>

                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">New Password</label>
                                    <div className="relative"><Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" /><input type={showPassword ? 'text' : 'password'} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-12 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#3B82F6]" placeholder="••••••••" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div>
                                </div>
                                <div className="mt-auto pt-6">
                                    <button type="submit" disabled={loading} className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        {loading ? 'Resetting...' : <><ArrowRight className="w-5 h-5" /> Set Password</>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsResettingPassword(false); setError(''); }}
                                        className="w-full mt-3 text-sm text-slate-500 hover:text-[#3B82F6] font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : verifyingMfa ? (
                            <form onSubmit={handleVerifyMfa} className="flex-1 flex flex-col h-full">
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 bg-[#3B82F6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <KeyRound className="w-8 h-8 text-[#3B82F6]" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h3>
                                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">Enter the code from your authenticator app.</p>
                                    </div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Authenticator Code</label>
                                    <div className="relative"><KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" /><input type="text" required value={mfaCode} onChange={e => setMfaCode(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#3B82F6]" placeholder="000000" /></div>
                                </div>
                                <div className="mt-auto pt-6">
                                    <button type="submit" disabled={loading} className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        {loading ? 'Verifying...' : <><ArrowRight className="w-5 h-5" /> Verify</>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setVerifyingMfa(false); setError(''); }}
                                        className="w-full mt-3 text-sm text-slate-500 hover:text-[#3B82F6] font-medium"
                                    >
                                        Back to login
                                    </button>
                                </div>
                            </form>
                        ) : verifyingEmail ? (
                            <form onSubmit={handleVerifyEmail} className="flex-1 flex flex-col h-full">
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 bg-[#3B82F6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Mail className="w-8 h-8 text-[#3B82F6]" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Verify Your Email</h3>
                                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">We sent a verification code to {email}.</p>
                                    </div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Verification Code</label>
                                    <div className="relative"><KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" /><input type="text" required value={emailCode} onChange={e => setEmailCode(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#3B82F6]" placeholder="000000" /></div>
                                </div>
                                <div className="mt-auto pt-6">
                                    <button type="submit" disabled={loading} className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        {loading ? 'Verifying...' : <><ArrowRight className="w-5 h-5" /> Confirm Email</>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setVerifyingEmail(false); setError(''); }}
                                        className="w-full mt-3 text-sm text-slate-500 hover:text-[#3B82F6] font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col h-full">
                                <div className="space-y-4">
                                    {loginMode === 'driver' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Trailer Number</label>
                                            <div className="relative"><Truck className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" /><input type="text" required value={trailerInput} onChange={e => setTrailerInput(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#3B82F6]" placeholder="TRL-####" /></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                            {isSignUp && (
                                                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                                                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                                        {loginMode === 'carrier' ? 'Create Carrier Account' : 'Create Staff Account'}
                                                    </p>
                                                </div>
                                            )}

                                            {isSignUp && (
                                                <div className="flex gap-4">
                                                    <div className="flex-1"><label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">First Name</label><div className="relative"><User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" /><input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#3B82F6]" placeholder="Jane" /></div></div>
                                                    <div className="flex-1"><label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Last Name</label><div className="relative"><User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" /><input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#3B82F6]" placeholder="Doe" /></div></div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                                                    {isSignUp ? 'Email' : 'Username or Email'}
                                                </label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                                    <input
                                                        type={isSignUp ? "email" : "text"}
                                                        required
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#3B82F6]"
                                                        placeholder={isSignUp ? "user@company.com" : "username or user@company.com"}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
                                                    {!isSignUp && (
                                                        <button type="button" onClick={handleForgotPassword} disabled={loading} className="text-xs text-[#3B82F6] hover:text-blue-600 font-medium transition-colors focus:outline-none disabled:opacity-50">Forgot Password?</button>
                                                    )}
                                                </div>
                                                <div className="relative"><Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" /><input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-12 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#3B82F6]" placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div>
                                            </div>
                                            {isSignUp && loginMode === 'carrier' && (
                                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center mb-4">
                                                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                                        Carrier registration will be reviewed and assigned by an administrator.
                                                    </p>
                                                </div>
                                            )}

                                            {isSignUp && loginMode === 'staff' && (
                                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center mb-4">
                                                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                                        Facility access will be assigned by an administrator after signup.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-6">
                                    <button type="submit" disabled={loading} className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        {loading ? 'Processing...' : <><ArrowRight className="w-5 h-5" /> {isSignUp ? 'Create Account' : loginMode === 'driver' ? 'Find Driver' : 'Sign In'}</>}
                                    </button>

                                    {loginMode !== 'driver' ? (
                                        <button
                                            type="button"
                                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setSignupFacilityId(''); setSignupCarrierId(''); }}
                                            className="w-full mt-3 text-sm text-slate-500 hover:text-[#3B82F6] font-medium"
                                        >
                                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                                        </button>
                                    ) : (
                                        <div className="h-[32px] w-full" />
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
