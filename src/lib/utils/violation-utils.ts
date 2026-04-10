import {
  CONDITION_TO_POLICY_ID,
  DEFAULT_PENALTY_PERCENT,
  POLICY_ID_TO_CONDITION,
  VIOLATION_POLICY_POINTS,
} from '@/constants/violation';
import { Policy } from '@/types/policy';
import { ViolationPolicy } from '@/types/violation';

// Convert Policy from database to ViolationPolicy
export function policyToViolationPolicy(policy: Policy): ViolationPolicy | null {
  const points = VIOLATION_POLICY_POINTS[policy.id];
  if (points === undefined) {
    return null;
  }

  // For violation policies with FIXED unit, amount represents percentage
  // For PER_DAY unit, amount is in VND
  const penaltyPercent = policy.unit === 'FIXED' ? policy.amount : 0;

  return {
    id: policy.id as ViolationPolicy['id'],
    name: policy.name,
    points,
    penaltyPercent,
  };
}

// Get violation policy metadata by policy ID
export function getViolationPolicyMetadata(
  policyId: string
): { points: number; penaltyPercent: number } | null {
  const points = VIOLATION_POLICY_POINTS[policyId];
  if (points === undefined) {
    return null;
  }

  // Return default penaltyPercent for fallback
  const penaltyPercent = DEFAULT_PENALTY_PERCENT[policyId] || 0;

  return { points, penaltyPercent };
}

// Map condition to policy ID
export function conditionToPolicyId(condition: string): string | null {
  return CONDITION_TO_POLICY_ID[condition] || null;
}

// Map policy ID to condition
export function policyIdToCondition(policyId: string): string {
  return POLICY_ID_TO_CONDITION[policyId] || '';
}
