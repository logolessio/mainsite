import type { OnboardingData } from '@/lib/onboarding'

export type StepProps = {
  data: OnboardingData
  update: (patch: Partial<OnboardingData>) => void
  next: () => void
  /** Called by the final step once everything has been saved. */
  onFinish?: () => void
}
