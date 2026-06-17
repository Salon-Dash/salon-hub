import { apiClient } from "@/config/api";

export interface ReferralCode {
  id: number;
  code: string;
  businessId: number;
  ownerId: number;
  type: "CLIENT_REFERRAL" | "BUSINESS_REFERRAL" | "UNIVERSAL";
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" | "SUSPENDED";
  description?: string;
  rewardAmount: number;
  rewardPoints: number;
  newUserReward: number;
  newUserPoints: number;
  maxUses?: number;
  currentUses: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReferralUsage {
  id: number;
  referralCodeId: number;
  businessId: number;
  usedByUserId: number;
  referredClientId?: number;
  referredBusinessId?: number;
  status: "PENDING" | "REWARDED" | "FAILED" | "CANCELLED";
  rewardAmount?: number;
  rewardPoints?: number;
  newUserReward?: number;
  newUserPoints?: number;
  notes?: string;
  usedAt: string;
  rewardedAt?: string;
}

export interface ReferralAnalytics {
  businessId: number;
  totalReferralCodes: number;
  activeReferralCodes: number;
  totalUsages: number;
  successfulUsages: number;
  totalRewardsGiven: number;
  totalRewardsEarned: number;
  totalPointsGiven: number;
  totalPointsEarned: number;
  totalReferredClients: number;
  totalReferredBusinesses: number;
}

export interface CreateReferralCodeRequest {
  businessId: number;
  ownerId: number;
  type: "CLIENT_REFERRAL" | "BUSINESS_REFERRAL" | "UNIVERSAL";
  description?: string;
  rewardAmount?: number;
  rewardPoints?: number;
  newUserReward?: number;
  newUserPoints?: number;
  maxUses?: number;
  expirationDays?: number;
}

class ReferralService {
  /**
   * Get all referral codes for a business
   */
  async getReferralCodesByBusiness(businessId: number): Promise<ReferralCode[]> {
    return apiClient.get<ReferralCode[]>(`/referrals/codes/business/${businessId}`);
  }

  /**
   * Get referral code by code string
   */
  async getReferralCodeByCode(code: string): Promise<ReferralCode> {
    return apiClient.get<ReferralCode>(`/referrals/codes/${code}`);
  }

  /**
   * Create a new referral code
   */
  async createReferralCode(request: CreateReferralCodeRequest): Promise<ReferralCode> {
    return apiClient.post<ReferralCode>("/referrals/codes", request);
  }

  /**
   * Get referral analytics for a business
   */
  async getAnalytics(businessId: number): Promise<ReferralAnalytics> {
    return apiClient.get<ReferralAnalytics>(`/referrals/analytics/business/${businessId}`);
  }

  /**
   * Get referral usages for a business
   */
  async getReferralUsages(businessId: number): Promise<ReferralUsage[]> {
    // Note: This endpoint might need to be added to the backend
    return apiClient.get<ReferralUsage[]>(`/referrals/usages/business/${businessId}`);
  }

  /**
   * Use a referral code
   */
  async useReferralCode(code: string, businessId: number, userId: number, referredClientId?: number, referredBusinessId?: number): Promise<ReferralUsage> {
    return apiClient.post<ReferralUsage>("/referrals/use", {
      code,
      businessId,
      userId,
      referredClientId,
      referredBusinessId,
    });
  }

  /**
   * Process reward for a referral usage
   */
  async processReward(usageId: number): Promise<ReferralUsage> {
    return apiClient.put<ReferralUsage>(`/referrals/usages/${usageId}/process`, {});
  }

  /**
   * Get the universal referral code for a business owner
   */
  async getReferralCodeByOwner(ownerId: number): Promise<ReferralCode | null> {
    try {
      return await apiClient.get<ReferralCode>(`/referrals/codes/owner/${ownerId}`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the universal referral code for a business
   */
  async getBusinessUniversalCode(businessId: number): Promise<ReferralCode | null> {
    try {
      return await apiClient.get<ReferralCode>(`/referrals/codes/business/${businessId}/universal`);
    } catch (error) {
      return null;
    }
  }
}

export const referralService = new ReferralService();

