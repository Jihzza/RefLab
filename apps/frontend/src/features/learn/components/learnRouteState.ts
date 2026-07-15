export interface LearnRouteState {
  autoStartTest: boolean
}

export function getLearnRouteState(search = window.location.search): LearnRouteState {
  const params = new URLSearchParams(search)

  return {
    autoStartTest: params.get('action') === 'start-test',
  }
}

export function shouldAutoStartTest(): boolean {
  return getLearnRouteState().autoStartTest
}
