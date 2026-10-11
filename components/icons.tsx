'use client'

import { Banknote, Bell, Heart, BarChart3, Bot, CheckCircle2, CircleDollarSign, Clapperboard, CreditCard, Eye, FileCheck2, FileSearch, Gauge, Landmark, Layers, LayoutDashboard, Link2, Lock, Mail, Megaphone, Receipt, Rocket, ScrollText, Search, Settings, ShieldAlert, ShieldCheck, Smartphone, Sparkles, Trophy, Unlock, UserCheck, Users } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

const ICONS = { Banknote, Bell, Heart, BarChart3, Bot, CheckCircle2, CircleDollarSign, Clapperboard, CreditCard, Eye, FileCheck2, FileSearch, Gauge, Landmark, Layers, LayoutDashboard, Link2, Lock, Mail, Megaphone, Receipt, Rocket, ScrollText, Search, Settings, ShieldAlert, ShieldCheck, Smartphone, Sparkles, Trophy, Unlock, UserCheck, Users }

export type IconName = keyof typeof ICONS

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = ICONS[name]
  return <C {...props} />
}
