import { Schema as S } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const Deployment = defineTaggedUnion({
  Production: {},
  Canary: { commit: S.NonEmptyString },
})
export type Deployment = typeof Deployment.Type

export const deploymentFromCanaryCommit = (
  canaryCommit: string | undefined,
): Deployment => {
  if (canaryCommit === undefined) {
    return Deployment.Production()
  } else {
    return Deployment.Canary({
      commit: S.decodeUnknownSync(S.NonEmptyString)(canaryCommit),
    })
  }
}

export const isTelemetryEnabled = (deployment: Deployment): boolean =>
  Deployment.match(deployment, {
    Production: () => true,
    Canary: () => false,
  })

export const deployment = deploymentFromCanaryCommit(
  import.meta.env.VITE_FOLDKIT_CANARY_COMMIT,
)
