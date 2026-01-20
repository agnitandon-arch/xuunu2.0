export type TerraClientConfig = {
  apiKey: string;
  devId: string;
  secret: string;
};

export const terraConfig: TerraClientConfig = {
  apiKey: process.env.TERRA_API_KEY ?? "",
  devId: process.env.TERRA_DEV_ID ?? "",
  secret: process.env.TERRA_SECRET ?? "",
};

export function getTerraAuthHeader() {
  return terraConfig.apiKey ? { "x-api-key": terraConfig.apiKey } : {};
}
