export function getEtherscanLink(network: string, txHash: string) {
  return `https://${network !== 'mainnet' ? network + '.' : ''}etherscan.io/tx/${txHash}`;
}
