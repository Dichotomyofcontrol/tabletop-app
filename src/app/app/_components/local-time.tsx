'use client';

import { useState, useEffect } from 'react';

type Props = { iso: string };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function fmtFullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtDow(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
}
function fmtDay(iso: string) {
  return String(new Date(iso).getDate());
}
function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function LocalTime({ iso }: Props) {
  const [s, setS] = useState(() => fmtTime(iso));
  useEffect(() => { setS(fmtTime(iso)); }, [iso]);
  return <span suppressHydrationWarning>{s}</span>;
}
export function LocalFullDate({ iso }: Props) {
  const [s, setS] = useState(() => fmtFullDate(iso));
  useEffect(() => { setS(fmtFullDate(iso)); }, [iso]);
  return <span suppressHydrationWarning>{s}</span>;
}
export function LocalDow({ iso }: Props) {
  const [s, setS] = useState(() => fmtDow(iso));
  useEffect(() => { setS(fmtDow(iso)); }, [iso]);
  return <span suppressHydrationWarning>{s}</span>;
}
export function LocalDay({ iso }: Props) {
  const [s, setS] = useState(() => fmtDay(iso));
  useEffect(() => { setS(fmtDay(iso)); }, [iso]);
  return <span suppressHydrationWarning>{s}</span>;
}
export function LocalShortDate({ iso }: Props) {
  const [s, setS] = useState(() => fmtShortDate(iso));
  useEffect(() => { setS(fmtShortDate(iso)); }, [iso]);
  return <span suppressHydrationWarning>{s}</span>;
}
