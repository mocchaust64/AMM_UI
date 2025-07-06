import {PublicKey} from '@solana/web3.js';


function u16ToBytes(num: number) {
    const arr = new ArrayBuffer(2);
    const view = new DataView(arr);
    view.setUint16(0, num, false);
    return new Uint8Array(arr);
  }

export async function getAmmConfigAddress(
  index: number,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from("amm_config"), u16ToBytes(index)],
    programId
  );
}

// Hàm để lấy PDA cho Pool
export async function getPoolAddress(
  ammConfigAddress: PublicKey,
  token0: PublicKey,
  token1: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [
      Buffer.from("pool_state_seed"),
      ammConfigAddress.toBuffer(),
      token0.toBuffer(),
      token1.toBuffer(),
    ],
    programId
  );
}

// Hàm để lấy PDA cho Authority
export async function getAuthAddress(programId: PublicKey): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from("vault_and_lp_mint_auth_seed")],
    programId
  );
}

// Hàm để lấy PDA cho LP Mint
export async function getPoolLpMintAddress(
  poolAddress: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from("pool_lp_mint"), poolAddress.toBuffer()],
    programId
  );
}

// Hàm để lấy PDA cho Pool Vault
export async function getPoolVaultAddress(
  poolAddress: PublicKey,
  mintAddress: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from("pool_vault"), poolAddress.toBuffer(), mintAddress.toBuffer()],
    programId
  );
}

// Hàm để lấy PDA cho Oracle
export async function getOracleAddress(
  poolAddress: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from("observation"), poolAddress.toBuffer()],
    programId
  );
}