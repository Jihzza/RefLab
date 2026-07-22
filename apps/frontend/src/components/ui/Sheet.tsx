import { forwardRef } from 'react'
import {
  Dialog,
  type DialogPlacement,
  type DialogProps,
} from './Dialog'

export type SheetSide = Exclude<DialogPlacement, 'center'>

export interface SheetProps extends Omit<DialogProps, 'placement' | 'size'> {
  side?: SheetSide
}

export const Sheet = forwardRef<HTMLDivElement, SheetProps>(function Sheet(
  { side = 'right', ...props },
  ref,
) {
  return <Dialog ref={ref} placement={side} size="md" {...props} />
})

Sheet.displayName = 'Sheet'

export default Sheet
