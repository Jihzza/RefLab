import { createContext } from 'react'
import type { BillingContextType } from '../types'

export const BillingContext = createContext<BillingContextType | undefined>(undefined)
