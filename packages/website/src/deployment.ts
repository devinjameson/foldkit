import { Match as M, Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

export const Production = ts('Production')
export const Canary = ts('Canary', { commit: S.NonEmptyString })

export const Deployment = S.Union([Production, Canary])
export type Deployment = typeof Deployment.Type

export const deploymentFromCanaryCommit = (
  canaryCommit: string | undefined,
): Deployment => {
  if (canaryCommit === undefined) {
    return Production()
  } else {
    return Canary({
      commit: S.decodeUnknownSync(S.NonEmptyString)(canaryCommit),
    })
  }
}

export const isTelemetryEnabled = (deployment: Deployment): boolean =>
  M.value(deployment).pipe(
    M.tagsExhaustive({
      Production: () => true,
      Canary: () => false,
    }),
  )

export const deployment = deploymentFromCanaryCommit(
  import.meta.env.VITE_FOLDKIT_CANARY_COMMIT,
)
