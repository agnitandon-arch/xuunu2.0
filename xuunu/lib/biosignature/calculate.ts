export type BiosignatureInput = {
  activityScore?: number;
  recoveryScore?: number;
  stressScore?: number;
};

export type BiosignatureResult = {
  score: number;
  inputs: Required<BiosignatureInput>;
};

function toScore(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateBiosignature(payload: unknown): BiosignatureResult {
  const input = (payload ?? {}) as BiosignatureInput;
  const activityScore = toScore(input.activityScore);
  const recoveryScore = toScore(input.recoveryScore);
  const stressScore = toScore(input.stressScore);
  const score = Math.round((activityScore + recoveryScore + stressScore) / 3);

  return {
    score,
    inputs: { activityScore, recoveryScore, stressScore },
  };
}
