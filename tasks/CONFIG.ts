const configs = {
  sepolia: {
    admin: '0x0cF34128CF383eB709c36c16cDa59F3Ae99B8Fb1',
    rewardRecipient: '0x...', // TODO: set reward recipient address
    dailyRewardCapBps: 100n, // 1% daily reward cap
    redemptionDelay: 7n * 24n * 60n * 60n, // 7 days
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
