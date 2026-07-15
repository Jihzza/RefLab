const MAX_RECOMMENDED_AREA_LENGTH = 160

export interface LearnRouteState {
  autoStartTest: boolean
  recommendedArea: string | null
}

export function getLearnRouteState(search = window.location.search): LearnRouteState {
  const params = new URLSearchParams(search)
  const area = params.get('area')?.trim() ?? ''
  const shouldStartRecommendedArea = params.get('tab') === 'questions'
    && params.get('action') === 'start-area'
    && area.length > 0
    && area.length <= MAX_RECOMMENDED_AREA_LENGTH

  return {
    autoStartTest: params.get('action') === 'start-test',
    recommendedArea: shouldStartRecommendedArea ? area : null,
  }
}

export function shouldAutoStartTest(): boolean {
  return getLearnRouteState().autoStartTest
}
