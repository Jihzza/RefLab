export function getTranslatedTopic(topic: string, t: (key: string) => string): string {
  const normalized = topic.trim().toLowerCase()
  const topicAliases: Record<string, string> = {
    offside: 'Offside',
    fouls: 'Fouls',
    'fouls & misconduct': 'Fouls & Misconduct',
    handball: 'Handball',
    penalties: 'Penalties',
    advantage: 'Advantage',
    cards: 'Cards',
    'cards & discipline': 'Cards & Discipline',
    substitutions: 'Substitutions',
    var: 'VAR',
    'free kicks': 'Free Kicks',
    'throw-ins': 'Throw-Ins',
    'goal kicks': 'Goal Kicks',
    'corner kicks': 'Corner Kicks',
    general: 'General',
    'general laws of the game': 'General Laws of the Game',
    uncategorized: 'Uncategorized',
  }

  return t(topicAliases[normalized] ?? topic)
}
