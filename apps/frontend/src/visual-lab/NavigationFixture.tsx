import { useState } from 'react'
import { Menu } from 'lucide-react'
import { IconButton } from '@/components/ui'
import { Sidebar } from '@/components/Sidebar'
import FixtureAuthProvider from './FixtureAuthProvider'

export default function NavigationFixture() {
  const [open, setOpen] = useState(false)

  return (
    <FixtureAuthProvider>
      <main className="min-h-dvh bg-(--mc-color-canvas) p-4 text-(--mc-color-text)">
        <IconButton label="Abrir menu" onClick={() => setOpen(true)}>
          <Menu className="size-5" aria-hidden="true" />
        </IconButton>
        <Sidebar isOpen={open} onClose={() => setOpen(false)} />
      </main>
    </FixtureAuthProvider>
  )
}
