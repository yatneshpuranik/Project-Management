import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { HiOutlineXCircle } from 'react-icons/hi';
import { motion } from 'framer-motion';

const verifiedTokens = new Set();
const inFlightRequests = new Map();

const VerifyEmailScreen = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'error'

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    if (verifiedTokens.has(token)) {
      navigate('/login?verified=true');
      return;
    }

    const performVerification = async () => {
      if (inFlightRequests.has(token)) {
        try {
          const success = await inFlightRequests.get(token);
          if (success) {
            navigate('/login?verified=true');
          } else {
            setStatus('error');
          }
        } catch (err) {
          setStatus('error');
        }
        return;
      }

      const verifyPromise = (async () => {
        const response = await axiosInstance.get(`/user/verify-email?token=${token}`);
        return response.data.success;
      })();

      inFlightRequests.set(token, verifyPromise);

      try {
        const success = await verifyPromise;
        inFlightRequests.delete(token);

        if (success) {
          verifiedTokens.add(token);
          navigate('/login?verified=true');
        } else {
          setStatus('error');
        }
      } catch (err) {
        inFlightRequests.delete(token);
        console.error('Email verification failed:', err);
        setStatus('error');
      }
    };

    performVerification();
  }, [token, navigate]);

  return (
    <div
      className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-4 py-16 overflow-hidden select-none bg-slate-950"
      style={{
        backgroundColor: '#050816',
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }}
    >
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-8 text-center space-y-6 shadow-2xl relative z-10"
      >
        <h3 className="text-xl font-extrabold text-white uppercase tracking-wider">
          {status === 'error' ? 'Verification Link Expired' : 'Email Verification'}
        </h3>

        {status === 'verifying' && (
          <div className="space-y-4 py-6">
            <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Verifying your email address, please wait...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-6">
            <HiOutlineXCircle className="h-16 w-16 text-rose-500 mx-auto animate-pulse" />
            <p className="text-sm text-rose-200 font-semibold">
              This verification link has already been used or has expired.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 text-xs tracking-wider transition uppercase cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmailScreen;
