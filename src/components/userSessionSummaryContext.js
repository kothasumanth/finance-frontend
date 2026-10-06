import { createContext, useContext } from 'react'

export const UserSessionSummaryContext = createContext(null)

export function useUserSessionSummary() {
  const summary = useContext(UserSessionSummaryContext)
  if (!summary) throw new Error('UserSessionSummary must be used within UserSessionSummaryProvider')
  return summary
}