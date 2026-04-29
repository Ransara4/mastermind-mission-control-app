export interface WhoopRecovery {
  recovery_score: number;
  resting_heart_rate: number;
  hrv_rmssd_milli: number;
  spo2_percentage: number | null;
  skin_temp_celsius: number | null;
  user_calibrating: boolean;
}

export interface WhoopSleepStages {
  total_in_bed_time_milli: number;
  total_awake_time_milli: number;
  total_light_sleep_time_milli: number;
  total_slow_wave_sleep_time_milli: number;
  total_rem_sleep_time_milli: number;
  sleep_cycle_count: number;
  disturbance_count: number;
}

export interface WhoopSleep {
  stage_summary: WhoopSleepStages;
  sleep_needed: {
    baseline_milli: number;
    need_from_sleep_debt_milli: number;
    need_from_recent_strain_milli: number;
    need_from_recent_nap_milli: number;
  };
  respiratory_rate: number;
  sleep_performance_percentage: number;
  sleep_consistency_percentage: number;
  sleep_efficiency_percentage: number;
}

export interface WhoopStrain {
  strain: number;
  kilojoule: number;
  average_heart_rate: number;
  max_heart_rate: number;
}

export interface WhoopDashboard {
  authenticated: boolean;
  tokenExpiry: string | null;
  recovery: WhoopRecovery | null;
  sleep: WhoopSleep | null;
  strain: WhoopStrain | null;
  timestamp: string | null;
  error?: string;
}
