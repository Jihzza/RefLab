import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar, IconButton } from '@/components/ui'
import MessageBubble from '@/features/messages/components/MessageBubble'
import MessageInput from '@/features/messages/components/MessageInput'
import type { Message, MessageUser } from '@/features/messages/types'
import FixtureShell from './FixtureShell'

const marta: MessageUser = {
  id: 'marta-fixture',
  username: 'marta.referee',
  name: 'Marta Correia',
  photo_url: null,
}

const rafael: MessageUser = {
  id: 'fixture-rafael',
  username: 'rafael',
  name: 'Rafael Martins',
  photo_url: null,
}

const messages: Message[] = [
  message('message-1', marta, 'Viste o lance do minuto 73? Para mim, o defesa joga primeiro a bola.', '2026-07-15T17:37:00.000Z'),
  message('message-2', rafael, 'Vi. Toca na bola, mas entra com a sola alta e põe em risco a segurança. Assinalava livre direto e cartão amarelo.', '2026-07-15T17:39:00.000Z'),
  message('message-3', marta, 'Concordo com a sanção disciplinar. Dentro da área mantinhas penálti?', '2026-07-15T17:40:00.000Z'),
  message('message-4', rafael, 'Sim. O contacto punível acontece sobre a linha, por isso a linha faz parte da área.', '2026-07-15T17:42:00.000Z'),
  message('message-5', marta, 'Certo. Vou publicar o clip na Comunidade.', '2026-07-15T17:43:00.000Z'),
]

export default function MessagesFixture() {
  const { t } = useTranslation()

  return (
    <FixtureShell title="Mensagens">
      <div className="flex h-[calc(100dvh-4rem-var(--mc-bottom-nav-height)-var(--mc-safe-bottom))] min-h-0 flex-col bg-(--mc-color-canvas) md:h-[calc(100dvh-4rem)]">
        <header className="flex min-h-[4.75rem] shrink-0 items-center gap-2 border-b border-(--mc-color-border) bg-(--mc-color-surface) px-3 py-2.5 sm:px-4">
          <IconButton label={t('Back')} variant="ghost" size="md">
            <ArrowLeft className="size-5" />
          </IconButton>
          <Avatar name="Marta Correia" size="lg" />
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-(--mc-color-text)">Marta Correia</span>
            <span className="mt-0.5 block truncate text-xs text-(--mc-color-text-muted)">@marta.referee</span>
          </span>
        </header>

        <div className="mc-scroll-region flex-1 px-4 py-4 sm:px-6">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-3">
            {messages.map((item) => (
              <MessageBubble key={item.id} message={item} isOwn={item.sender_id === rafael.id} />
            ))}
          </div>
        </div>

        <MessageInput onSend={async () => true} isSending={false} />
      </div>
    </FixtureShell>
  )
}

function message(
  id: string,
  sender: MessageUser,
  content: string,
  createdAt: string,
): Message {
  return {
    id,
    conversation_id: 'fixture-conversation',
    sender_id: sender.id,
    content,
    media_type: 'text',
    media_url: null,
    created_at: createdAt,
    sender,
  }
}
