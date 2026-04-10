import { conditionToPolicyId, policyToViolationPolicy } from '@/lib/utils/violation-utils';
import { ViolationPolicy } from '@/types/violation';
import { useMemo } from 'react';
import { usePolicies } from './usePolicies';

/**
 * Hook to get violation policies from database with metadata
 */
export function useViolationPolicies() {
  const { data: policies, isLoading, error } = usePolicies();

  const violationPolicies = useMemo(() => {
    if (!policies) return null;

    const violationPoliciesMap: Record<string, ViolationPolicy> = {};

    for (const policy of policies) {
      const violationPolicy = policyToViolationPolicy(policy);
      if (violationPolicy) {
        violationPoliciesMap[policy.id] = violationPolicy;
      }
    }

    return violationPoliciesMap;
  }, [policies]);

  return {
    violationPolicies,
    isLoading,
    error,
  };
}

/**
 * Hook to get violation policy by condition
 */
export function useViolationPolicyByCondition(condition: string): ViolationPolicy | null {
  const { violationPolicies, isLoading } = useViolationPolicies();

  // Wait for policies to load to get accurate penaltyPercent from database
  if (isLoading || !violationPolicies) {
    // Return null while loading
    return null;
  }

  const policyId = conditionToPolicyId(condition);
  if (!policyId) return null;
  return violationPolicies[policyId] || null;
}

/**
 * Hook to get violation policy by policy ID
 */
export function useViolationPolicyById(policyId: string): ViolationPolicy | null {
  const { violationPolicies, isLoading } = useViolationPolicies();

  // Wait for policies to load to get accurate penaltyPercent from database
  if (isLoading || !violationPolicies) {
    // Return null while loading
    return null;
  }

  return violationPolicies[policyId] || null;
}
