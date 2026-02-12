const configs = {
  sepolia: {
    admin: '0x73Ce8067646858C6236eFB09e1EFcFc3BC3C937D',
    dailyRewardCapBps: 100n, // 1% daily reward cap
    redemptionDelay: 7n * 24n * 60n * 60n, // 7 days
    treasuryVault: '0x73Ce8067646858C6236eFB09e1EFcFc3BC3C937D', // TODO: replace with actual treasury vault address
    collateralTokens: ['0x656fdec9e0963117126cd6d52e517447b10c4341'],
  },
};

export const getConfig = (network: string) => {
  const config = configs[network as keyof typeof configs];
  if (!config) {
    throw new Error(`Config for network ${network} not found`);
  }
  return {
    ...config,
  };
};
