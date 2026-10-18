'use client'

import { createContext, useContext } from 'react'

/** The team roles of whoever is looking at an owner page, known on the server, so tabs that are only for developers never flash in or out. */
const Ctx = createContext<readonly string[]>([])
export const StaffRoles = Ctx.Provider
export const useStaffRoles = () => useContext(Ctx)
