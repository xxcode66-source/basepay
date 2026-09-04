'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWalletClient,
  useChainId,
} from 'wagmi';
import {
  parseUnits,
  isAddress,
  parseSignature,
  recoverTypedDataAddress,
  type Address,
} from 'viem';
import {
  TIP_ROUTER_ABI,
  TIP_ROUTER_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
  TIP_ROUTER_USDT_ADDRESS,
  USDT_ADDRESS,
  USDT_DECIMALS,
  ERC20_ABI,
  ERC20_APPROVE_ABI,
  TIP_ROUTER_USDT_ABI,
  USDC_PERMIT_DOMAIN,
  USDC_PERMIT_TYPES,
} from '@/lib/contracts';
import { DisplayName } from '@/lib/basename';
import { IconAlert, IconTarget, IconMessage } from '@/lib/ui-icons';
import { isNimiqPay, useNimiqProvider } from '@/lib/nimiq';
import { useNimiqEvm } from '@/lib/useNimiqEvm';
import ContractBanner from '@/components/ContractBanner';
import TipHistory from '@/components/TipHistory';
import ShareButtons from '@/components/ShareButtons';

/* ── Confetti Component ──────────────────────────────────── */
function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1.5,
    color: ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899'][i % 5],
    size: 4 + Math.random() * 6,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Constants ───────────────────────────────────────────── */
const QUICK_AMOUNTS = [1, 5, 10, 25];
const PLATFORM_FEE_BPS = 500;
const BASE_MAINNET_CHAIN_ID = 8453;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type PaymentMethod = 'usdc' | 'usdt' | 'nim';
type Step = 'idle' | 'signing' | 'approving' | 'tipping' | 'success' | 'error';

/* ── localStorage helpers ────────────────────────────────── */
interface StoredMessage {
  txHash: string;
  sender: string;
  message: string;
  timestamp: number;
}

function storeMessage(recipient: Address, msg: StoredMessage) {
  const key = `basepay:messages:${recipient.toLowerCase()}`;
  const existing: StoredMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
  existing.unshift(msg);
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)));
}

function getGoal(addr: string): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(`basepay:goal:${addr.toLowerCase()}`) || '0');
}

/* ── Icons ───────────────────────────────────────────────── */
function IconSpinner() {
  return (
    <svg className="animate-spin-slow" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

/* ── Payment Method Selector ─────────────────────────────── */
function PaymentMethodSelector({
  current,
  onChange,
  showNim,
  disabled,
}: {
  current: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  showNim: boolean;
  disabled: boolean;
}) {
  const methods: Array<{ id: PaymentMethod; label: string; symbol: string }> = [
    { id: 'usdc', label: 'USDC', symbol: '$' },
    { id: 'usdt', label: 'USDT', symbol: '$' },
  ];
  if (showNim) {
    methods.push({ id: 'nim', label: 'NIM', symbol: '◈' });
  }

  return (
    <div className="flex gap-2 mb-4">
      {methods.map((m) => (
        <button
          key={m.id}
          disabled={disabled}
          onClick={() => onChange(m.id)}
          className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all disabled:opacity-50 ${
            current === m.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 border border-neutral-700/50'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ── Step Indicator ──────────────────────────────────────── */
function StepIndicator({ currentStep, method }: { currentStep: Step; method: PaymentMethod }) {
  const baseSteps = [
    { key: 'idle', label: 'Input' },
    { key: 'signing', label: 'Sign' },
    { key: 'tipping', label: 'Send' },
    { key: 'success', label: 'Done' },
  ];
  
  // For USDT, insert approve step
  const steps = method === 'usdt' && currentStep !== 'idle' && currentStep !== 'success' && currentStep !== 'error'
    ? [
        { key: 'idle', label: 'Input' },
        { key: 'approving', label: 'Approve' },
        { key: 'tipping', label: 'Send' },
        { key: 'success', label: 'Done' },
      ]
    : baseSteps;

  const activeIdx = steps.findIndex((s) => s.key === currentStep);
  const resolvedIdx = currentStep === 'error' ? -1 : activeIdx;

  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((s, i) => {
        const isActive = i === resolvedIdx;
        const isDone = i < resolvedIdx;
        return (
          <div key={s.key} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-500'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive || isDone ? 'text-neutral-200' : 'text-neutral-600'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-6 h-px mx-1 transition-colors ${
                  isDone ? 'bg-emerald-500/50' : 'bg-neutral-800'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Goal Progress Bar ───────────────────────────────────── */
function GoalProgress({
  goal,
  raised,
}: {
  goal: number;
  raised: number;
}) {
  if (goal <= 0) return null;
  const pct = Math.min(100, (raised / goal) * 100);

  return (
    <div className="glass-card rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <IconTarget />
          <span>Goal</span>
        </div>
        <span className="text-xs font-medium">
          <span className="text-emerald-400">${raised.toFixed(2)}</span>
          <span className="text-neutral-500"> / ${goal.toFixed(0)}</span>
        </span>
      </div>
      <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-neutral-500 text-right">
        {pct >= 100 ? 'Goal reached!' : `${pct.toFixed(0)}% — ${Math.ceil(goal - raised)} to go`}
      </p>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export default function TipPage() {
  const params = useParams<{ address: string }>();
  const recipientAddress = params.address as Address;
  const { address: senderAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: BASE_MAINNET_CHAIN_ID });

  // Nimiq integration
  const nimiqEnv = isNimiqPay();
  const { nimiq, accounts: nimiqAccounts, isReady: nimiqReady } = useNimiqProvider();
  const { ethereum: nimiqEth, accounts: evmAccounts } = useNimiqEvm();

  // State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('usdc');
  const [amount, setAmount] = useState('5');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [goal, setGoalState] = useState(0);
  const [raised, setRaised] = useState(0);
  const [nimAddress, setNimAddress] = useState('');
  const chainId = useChainId();

  const validRecipient = isAddress(recipientAddress);
  
  // Parse amount based on payment method
  const decimals = paymentMethod === 'nim' ? 5 : (paymentMethod === 'usdt' ? USDT_DECIMALS : USDC_DECIMALS);
  const parsedAmount = amount ? parseUnits(amount, decimals) : 0n;

  // Fee calculation (NIM has no platform fee)
  const feeAmount = paymentMethod === 'nim' ? 0n : (parsedAmount * BigInt(PLATFORM_FEE_BPS) + 9999n) / 10000n;
  const recipientReceives = parsedAmount - feeAmount;

  // Load goal from localStorage
  useEffect(() => {
    if (validRecipient) {
      setGoalState(getGoal(recipientAddress));
    }
  }, [recipientAddress, validRecipient]);

  // Calculate total raised from TipHistory events
  const handleHistoryLoaded = (events: { streamerAmount: bigint }[]) => {
    const total = events.reduce((sum, e) => sum + Number(e.streamerAmount), 0);
    const divisor = paymentMethod === 'nim' ? 1e5 : 1e6;
    setRaised(total / divisor);
  };

  const { data: nonceData } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'nonces',
    args: senderAddress ? [senderAddress] : undefined,
    query: { enabled: !!senderAddress },
  });
  const currentNonce = (nonceData as bigint | undefined) ?? 0n;
  const { writeContractAsync: writeTip, data: tipHash } = useWriteContract();
  const { writeContractAsync: writeApprove, data: approveHash } = useWriteContract();

  const { isSuccess: tipConfirmed } = useWaitForTransactionReceipt({
    hash: tipHash,
  });

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // USDC tip with permit
  const sendUsdcTip = async () => {
    try {
      setStep('signing');
      const deadline = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      if (!walletClient || !senderAddress) {
        throw new Error('Wallet is not ready. Please reconnect your wallet and try again.');
      }
      const permitDomain = USDC_PERMIT_DOMAIN(USDC_ADDRESS, BASE_MAINNET_CHAIN_ID);
      const permitMessage = {
        owner: senderAddress,
        spender: TIP_ROUTER_ADDRESS,
        value: parsedAmount,
        nonce: currentNonce,
        deadline,
      };
      const signature = await walletClient.signTypedData({
        account: senderAddress!,
        types: USDC_PERMIT_TYPES,
        primaryType: 'Permit',
        domain: permitDomain,
        message: permitMessage,
      });
      const { v, r, s } = parseSignature(signature);
      const recoveredOwner = await recoverTypedDataAddress({
        domain: permitDomain,
        types: USDC_PERMIT_TYPES,
        primaryType: 'Permit',
        message: permitMessage,
        signature,
      });
      if (recoveredOwner.toLowerCase() !== senderAddress!.toLowerCase()) {
        throw new Error('Wallet returned a signature for a different account. Please reconnect the same wallet and try again.');
      }
      setStep('tipping');
      await writeTip({
        account: senderAddress!,
        chainId: BASE_MAINNET_CHAIN_ID,
        address: TIP_ROUTER_ADDRESS,
        abi: TIP_ROUTER_ABI,
        functionName: 'tip',
        args: [recipientAddress, parsedAmount, deadline, currentNonce, Number(v), r, s, message.trim()],
      });
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.shortMessage ?? 'Transaction was rejected or failed.');
    }
  };

  // USDT tip with approve + transfer
  const sendUsdtTip = async () => {
    try {
      if (!senderAddress) {
        throw new Error('Wallet is not ready.');
      }
      
      // Step 1: Approve USDT
      setStep('approving');
      await writeApprove({
        account: senderAddress,
        chainId: BASE_MAINNET_CHAIN_ID,
        address: USDT_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [TIP_ROUTER_USDT_ADDRESS, parsedAmount],
      });
      // Step 2 (tip) will be triggered by useEffect when approveConfirmed becomes true
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.shortMessage ?? err?.message ?? 'Transaction was rejected or failed.');
    }
  };

  // Trigger tip after USDT approve is confirmed
  useEffect(() => {
    if (approveConfirmed && paymentMethod === 'usdt' && step === 'approving') {
      (async () => {
        try {
          setStep('tipping');
          await writeTip({
            account: senderAddress!,
            chainId: BASE_MAINNET_CHAIN_ID,
            address: TIP_ROUTER_USDT_ADDRESS,
            abi: TIP_ROUTER_USDT_ABI,
            functionName: 'tip',
            args: [recipientAddress, parsedAmount, message.trim()],
          });
        } catch (err: any) {
          setStep('error');
          setErrorMsg(err?.shortMessage ?? err?.message ?? 'Transaction was rejected or failed.');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed]);

  // NIM native transfer
  const sendNimTip = async () => {
    try {
      if (!nimiq || !nimiqAccounts[0]) {
        throw new Error('Nimiq provider not ready');
      }

      const amountInLuna = Math.round(parseFloat(amount) * 1e5);
      setStep('tipping');
      
      const txHash = message.trim()
        ? await nimiq.sendBasicTransactionWithData({
            recipient: nimAddress,
            value: amountInLuna,
            data: message.trim(),
          })
        : await nimiq.sendBasicTransaction({
            recipient: nimAddress,
            value: amountInLuna,
          });

      // Store message
      if (message.trim()) {
        storeMessage(recipientAddress, {
          txHash,
          sender: nimiqAccounts[0],
          message: message.trim(),
          timestamp: Date.now(),
        });
      }
      
      setStep('success');
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.message ?? 'NIM transfer failed');
    }
  };

  const handleSendTip = async () => {
    setErrorMsg('');
    if (isBusy || parsedAmount === 0n) return;

    if (paymentMethod === 'nim') {
      if (!nimAddress) {
        setErrorMsg('Please enter NIM recipient address');
        return;
      }
      await sendNimTip();
    } else if (paymentMethod === 'usdt') {
      if (chainId !== BASE_MAINNET_CHAIN_ID) {
        setStep('error');
        setErrorMsg('Please switch to Base mainnet');
        return;
      }
      await sendUsdtTip();
    } else {
      if (chainId !== BASE_MAINNET_CHAIN_ID) {
        setStep('error');
        setErrorMsg('Please switch to Base mainnet');
        return;
      }
      await sendUsdcTip();
    }
  };

  // On success
  useEffect(() => {
    if (tipConfirmed && paymentMethod !== 'nim') {
      setStep('success');
      if (message.trim() && senderAddress && tipHash) {
        storeMessage(recipientAddress, {
          txHash: tipHash as string,
          sender: senderAddress,
          message: message.trim(),
          timestamp: Date.now(),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipConfirmed]);

  const resetFlow = () => {
    setStep('idle');
    setErrorMsg('');
    setAmount('5');
    setMessage('');
    setNimAddress('');
  };

  if (!validRecipient) {
    return (
      <main className="min-h-screen bg-ambient flex items-center justify-center px-6 text-center">
        <div className="glass-card rounded-2xl p-8 max-w-sm animate-scale-in">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-400">
            <IconAlert />
          </div>
          <h2 className="text-lg font-semibold mb-2">Invalid link</h2>
          <p className="text-sm text-neutral-400">
            The wallet address in this link is not recognized.
          </p>
        </div>
      </main>
    );
  }

  const isBusy = step === 'signing' || step === 'approving' || step === 'tipping';
  const tipUrl = `${APP_URL}/tip/${recipientAddress}`;
  const canShowNim = nimiqEnv && nimiqReady;

  // Get current sender address
  const currentSender = paymentMethod === 'nim' ? nimiqAccounts[0] : (senderAddress || evmAccounts?.[0]);
  const isCurrentlyConnected = nimiqEnv ? !!currentSender : isConnected;

  return (
    <div className="bg-ambient bg-grid min-h-screen">
      {/* Floating orbs */}
      <div className="orb-container">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <main className="min-h-screen flex flex-col px-5 py-6 max-w-md mx-auto">
        {/* ── Header ──────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">BasePay</span>
          </div>
          {nimiqEnv && currentSender ? (
            <div className="text-xs text-neutral-400 font-mono">
              {currentSender.slice(0, 6)}...{currentSender.slice(-4)}
            </div>
          ) : (
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="avatar"
            />
          )}
        </header>

        {/* ── Step Indicator ──────────────────────────────── */}
        <div className="mb-6 animate-fade-in">
          <StepIndicator currentStep={step} method={paymentMethod} />
        </div>

        {/* ── Recipient Profile ───────────────────────────── */}
        <div className="text-center mb-6 animate-fade-in-up">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-lg font-mono text-blue-300">
              {recipientAddress.slice(2, 4).toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mb-1">Send a tip to</p>
          <DisplayName address={recipientAddress} />
        </div>

        {/* ── Content ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col">
          {step === 'success' ? (
            <>
              <Confetti />
              <div className="space-y-6 animate-scale-in">
                {/* Success Card */}
                <div className="glass-card glass-card-glow rounded-2xl p-8 text-center space-y-4 border-emerald-500/20 animate-glow-pulse">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 animate-success-bounce">
                    <IconCheck />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-emerald-400 mb-1">
                      Tip sent successfully!
                    </h2>
                    <p className="text-sm text-neutral-400">
                      ${amount} {paymentMethod.toUpperCase()} has been sent.
                    </p>
                  </div>
                  <button
                    onClick={resetFlow}
                    className="btn-primary w-full rounded-xl py-3 text-sm font-medium"
                  >
                    Send another tip
                  </button>
                </div>

                {/* Share after success */}
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <p className="text-xs text-neutral-500">Share this tip jar</p>
                  <ShareButtons url={tipUrl} address={recipientAddress} />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {/* Payment Method Selector */}
              <PaymentMethodSelector
                current={paymentMethod}
                onChange={setPaymentMethod}
                showNim={canShowNim}
                disabled={isBusy}
              />

              {/* Goal Progress */}
              {goal > 0 && (
                <GoalProgress goal={goal} raised={raised} />
              )}

              {/* Amount Input */}
              <div className="glass-card glass-card-glow rounded-2xl p-6 space-y-5">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-neutral-500 text-3xl font-bold">
                      {paymentMethod === 'nim' ? '◈' : '$'}
                    </span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || (parseFloat(v) > 0 && !v.startsWith('-'))) setAmount(v);
                      }}
                      disabled={isBusy}
                      className="bg-transparent w-36 text-center text-5xl font-bold outline-none disabled:opacity-50 text-white"
                    />
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    in {paymentMethod === 'nim' ? 'NIM' : paymentMethod.toUpperCase()}
                    {paymentMethod === 'nim' && ' (no platform fee)'}
                  </p>
                </div>

                {/* Quick Amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      disabled={isBusy}
                      onClick={() => setAmount(String(val))}
                      className={`rounded-xl py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                        amount === String(val)
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-105'
                          : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 hover:scale-105 border border-neutral-700/50'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>

                {/* Fee Breakdown */}
                {parsedAmount > 0n && (
                  <div className="border-t border-neutral-800/50 pt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Recipient receives</span>
                      <span className="text-neutral-200 font-medium">
                        {paymentMethod === 'nim'
                          ? `◈${(Number(recipientReceives) / 1e5).toFixed(2)}`
                          : `$${(Number(recipientReceives) / 1e6).toFixed(2)}`}
                      </span>
                    </div>
                    {paymentMethod !== 'nim' && (
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">Platform fee (5%)</span>
                        <span className="text-neutral-500">
                          ${(Number(feeAmount) / 1e6).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* NIM Address Input (only for NIM method) */}
              {paymentMethod === 'nim' && (
                <div className="glass-card glass-card-glow rounded-xl p-4 space-y-2">
                  <label className="text-xs font-medium text-neutral-400">
                    NIM recipient address (from URL param or enter manually)
                  </label>
                  <input
                    type="text"
                    value={nimAddress}
                    onChange={(e) => setNimAddress(e.target.value.trim())}
                    placeholder="NQ07 0000 0000 0000 0000 0000 0000 0000 0000"
                    disabled={isBusy}
                    className="input-base w-full rounded-lg px-3 py-2.5 text-sm font-mono"
                  />
                </div>
              )}

              {/* Message Input */}
              <div className="glass-card glass-card-glow rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <IconMessage />
                  <span>Add a message (optional)</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isBusy}
                  maxLength={140}
                  placeholder="Say something nice..."
                  rows={2}
                  className="input-base w-full rounded-lg px-3 py-2.5 text-sm resize-none"
                />
                <p className="text-[10px] text-neutral-600 text-right">
                  {message.length}/140
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/10 animate-fade-in">
                  <IconAlert />
                  <p className="text-red-400 text-xs">{errorMsg}</p>
                </div>
              )}

              {/* Action Button */}
              {isCurrentlyConnected ? (
                <button
                  onClick={handleSendTip}
                  disabled={isBusy || parsedAmount === 0n || (paymentMethod === 'nim' && !nimAddress)}
                  className={`w-full rounded-xl py-4 font-semibold text-base flex items-center justify-center gap-2 ${
                    isBusy ? 'btn-primary' : 'btn-primary btn-shimmer'
                  }`}
                >
                  {step === 'approving' ? (
                    <>
                      <IconSpinner />
                      Approving {paymentMethod.toUpperCase()}...
                    </>
                  ) : step === 'signing' ? (
                    <>
                      <IconSpinner />
                      Signing...
                    </>
                  ) : step === 'tipping' ? (
                    <>
                      <IconSpinner />
                      Sending tip...
                    </>
                  ) : (
                    'Send Tip'
                  )}
                </button>
              ) : (
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button
                      onClick={openConnectModal}
                      className="btn-primary btn-shimmer w-full rounded-xl py-4 font-semibold text-base"
                    >
                      Connect Wallet
                    </button>
                  )}
                </ConnectButton.Custom>
              )}

              <p className="text-center text-neutral-600 text-[11px]">
                Non-custodial · Funds go directly to the recipient · {paymentMethod === 'nim' ? 'Nimiq Network' : 'Base network'}
              </p>

              {/* ── Contract Verification ────────────────── */}
              <ContractBanner />

              {/* ── Share Buttons ──────────────────────────── */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-neutral-600 uppercase tracking-wider">
                  Share this tip jar
                </span>
                <ShareButtons url={tipUrl} address={recipientAddress} />
              </div>

              {/* ── Tip History ────────────────────────────── */}
              <div className="pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">
                  Recent tips
                </h3>
                <TipHistory recipient={recipientAddress} limit={10} onLoaded={handleHistoryLoaded} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
