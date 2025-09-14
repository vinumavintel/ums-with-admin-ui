"use client";
import React, { useState } from 'react';

interface CopyToClipboardProps {
  value: string;
  className?: string;
  label?: string;
}

export const CopyToClipboard: React.FC<CopyToClipboardProps> = ({ value, className = '', label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (_) {}
      document.body.removeChild(textarea);
    }
  };
  return (
    <button
      type="button"
      onClick={doCopy}
      className={`inline-flex items-center gap-1 rounded border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-[10px] font-medium uppercase tracking-wide hover:bg-neutral-100 dark:hover:bg-neutral-800 transition ${className}`}
    >
      {copied ? 'Copied' : label}
    </button>
  );
};

export default CopyToClipboard;
