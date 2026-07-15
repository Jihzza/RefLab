export function shouldAutoStartTest(): boolean {
  return new URLSearchParams(window.location.search).get('action') === 'start-test'
}
