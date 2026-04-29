// Token Readiness & DEX Verification Engine
// Performs on-chain + off-chain checks for any Solana SPL mint and returns
// a normalized audit report (authority, metadata, liquidity, indexing,
// holders, activity) with a 0-100 readiness score.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

type Network = "mainnet" | "devnet";

type AuditCheck = {
  status: "pass" | "warn" | "fail" | "unknown";
  score: number; // 0..20
  title: string;
  message: string;
  details?: Record<string, unknown>;
  fix?: { label: string; action: string } | null;
  steps?: string[];
};

type TokenOverview = {
  identity: {
    name: string | null;
    symbol: string | null;
    logo: string | null;
    description: string | null;
    decimals: number | null;
    supplyRaw: string | null;
    supplyUi: number | null;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    metadataSource: "on-chain" | "jupiter" | "dexscreener" | "none";
  };
  socials: {
    website: string | null;
    twitter: string | null;
    telegram: string | null;
    discord: string | null;
  };
  market: {
    priceUsd: number | null;
    priceNative: number | null;
    fdv: number | null;
    marketCap: number | null;
    liquidityUsd: number | null;
    priceChange: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
    volume: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
    txns24h: { buys: number; sells: number };
    pairCreatedAt: string | null;
    ageDays: number | null;
  };
  pools: Array<{
    dex: string;
    pairAddress: string;
    quoteSymbol: string;
    liquidityUsd: number | null;
    volume24h: number | null;
    priceUsd: number | null;
    url: string | null;
  }>;
  topHolders: Array<{ address: string; uiAmount: number; pct: number }>;
  indexers: { dexscreener: boolean; jupiter: boolean; birdeye: boolean };
  links: {
    solscan: string;
    explorer: string;
    dexscreener: string;
    birdeye: string;
    jupiter: string;
  };
};

type AuditReport = {
  mint: string;
  network: Network;
  fetchedAt: string;
  scoreTotal: number;
  ready: boolean;
  checks: {
    authority: AuditCheck;
    metadata: AuditCheck;
    liquidity: AuditCheck;
    indexing: AuditCheck;
    holders: AuditCheck;
    activity: AuditCheck;
  };
  missingSteps: string[];
  overview: TokenOverview;
};

// ---------- RPC with fallbacks ----------

const MAINNET_RPCS = [
  "https://solana-mainnet.g.alchemy.com/v2/demo",
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana",
];
const DEVNET_RPCS = ["https://api.devnet.solana.com"];

async function rpc(network: Network, method: string, params: unknown[]) {
  const urls = network === "devnet" ? DEVNET_RPCS : MAINNET_RPCS;
  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        lastErr = new Error(`${method} ${res.status} @ ${new URL(url).host}`);
        continue;
      }
      const j = await res.json();
      if (j.error) {
        lastErr = new Error(`${method}: ${j.error.message ?? "error"}`);
        continue;
      }
      return j.result;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error(`RPC ${method} failed`);
}

// ---------- base58 ----------

const BS58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function b58encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (let k = 0; k < zeros; k++) out += "1";
  for (let q = digits.length - 1; q >= 0; q--) out += BS58_ALPHABET[digits[q]];
  return out;
}

function b58decode(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (const c of str) {
    const v = BS58_ALPHABET.indexOf(c);
    if (v < 0) throw new Error("invalid base58");
    let carry = v;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let zeros = 0;
  for (const c of str) {
    if (c === "1") zeros++;
    else break;
  }
  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[zeros + i] = bytes[bytes.length - 1 - i];
  return out;
}

// ---------- decoders ----------

function decodeMint(b64: string) {
  const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const mintAuthorityTag = buf[0] | (buf[1] << 8) | (buf[2] << 16) | (buf[3] << 24);
  const mintAuthority =
    mintAuthorityTag === 1 ? b58encode(buf.slice(4, 36)) : null;
  let supply = 0n;
  for (let i = 0; i < 8; i++) supply |= BigInt(buf[36 + i]) << BigInt(8 * i);
  const decimals = buf[44];
  const freezeAuthorityTag =
    buf[46] | (buf[47] << 8) | (buf[48] << 16) | (buf[49] << 24);
  const freezeAuthority =
    freezeAuthorityTag === 1 ? b58encode(buf.slice(50, 82)) : null;
  return { mintAuthority, freezeAuthority, decimals, supply: supply.toString() };
}

function decodeMetadata(b64: string) {
  const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  let off = 1 + 32 + 32;
  const readStr = (max: number) => {
    const len = buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24);
    off += 4;
    const slice = buf.slice(off, off + Math.min(len, max));
    off += max;
    return new TextDecoder().decode(slice).replace(/\u0000+$/g, "").trim();
  };
  const name = readStr(32);
  const symbol = readStr(10);
  const uri = readStr(200);
  // sellerFeeBasisPoints (u16)
  off += 2;
  // creators: Option<Vec<Creator>>  Creator = 32 + 1 + 1 = 34
  let isMutable: boolean | null = null;
  try {
    const hasCreators = buf[off]; off += 1;
    if (hasCreators === 1) {
      const len = buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24);
      off += 4;
      off += len * 34;
    }
    // primarySaleHappened (u8)
    off += 1;
    isMutable = buf[off] === 1;
  } catch { /* leave null */ }
  return { name, symbol, uri, isMutable };
}

// Derive the Metaplex metadata PDA without external libs.
// PDA seeds: ["metadata", TOKEN_METADATA_PROGRAM_ID, mint]
async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  // Copy into a fresh ArrayBuffer to satisfy BufferSource typing in Deno.
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const h = await crypto.subtle.digest("SHA-256", ab);
  return new Uint8Array(h);
}

const PDA_MARKER = new TextEncoder().encode("ProgramDerivedAddress");

// Ed25519 on-curve check using @noble/ed25519 via esm.sh
let _isOnCurve: ((p: Uint8Array) => boolean) | null = null;
async function loadCurveCheck() {
  if (_isOnCurve) return _isOnCurve;
  const mod: any = await import("https://esm.sh/@noble/ed25519@2.1.0");
  // ExtendedPoint.fromHex throws if the point is not on the curve.
  _isOnCurve = (p: Uint8Array) => {
    try { mod.ExtendedPoint.fromHex(p); return true; } catch { return false; }
  };
  return _isOnCurve;
}

async function findProgramAddress(seeds: Uint8Array[], programId: Uint8Array): Promise<{ pubkey: Uint8Array; bump: number }> {
  const isOnCurve = await loadCurveCheck();
  for (let bump = 255; bump >= 0; bump--) {
    const parts: Uint8Array[] = [...seeds, new Uint8Array([bump]), programId, PDA_MARKER];
    const total = parts.reduce((n, p) => n + p.length, 0);
    const buf = new Uint8Array(total);
    let o = 0;
    for (const p of parts) { buf.set(p, o); o += p.length; }
    const hash = await sha256(buf);
    if (!isOnCurve(hash)) return { pubkey: hash, bump };
  }
  throw new Error("Unable to find a viable PDA bump");
}

async function deriveMetadataPda(mint: string): Promise<string> {
  const programId = b58decode(TOKEN_METADATA_PROGRAM_ID);
  const seeds = [
    new TextEncoder().encode("metadata"),
    programId,
    b58decode(mint),
  ];
  const { pubkey } = await findProgramAddress(seeds, programId);
  return b58encode(pubkey);
}

// Direct getAccountInfo on a single RPC URL — used to iterate every endpoint
// when looking up the metadata PDA. A specific RPC can return value:null when
// its snapshot is stale right after a token launch, which is exactly why the
// first audit run kept missing metadata that the second run found.
async function getAccountInfoDirect(url: string, address: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getAccountInfo",
        params: [address, { encoding: "base64", commitment: "confirmed" }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.result?.value?.data?.[0] ?? null;
  } catch { return null; }
}

// Locate the Metaplex metadata account.
// 1) Derive PDA + try every RPC until one returns data (fixes "metadata
//    not detected on first scan" issue when a stale RPC returns value:null).
// 2) Fallback to getProgramAccounts (some RPCs disable this).
async function findMetadataAccount(network: Network, mint: string) {
  let pda: string | null = null;
  try { pda = await deriveMetadataPda(mint); } catch { /* */ }
  if (pda) {
    const urls = network === "devnet" ? DEVNET_RPCS : MAINNET_RPCS;
    for (const url of urls) {
      const data = await getAccountInfoDirect(url, pda);
      if (data) return { pubkey: pda, data };
    }
  }

  // Fallback: search by program (no dataSize — accounts can be 679 or larger).
  try {
    const res = await rpc(network, "getProgramAccounts", [
      TOKEN_METADATA_PROGRAM_ID,
      {
        encoding: "base64",
        commitment: "confirmed",
        filters: [{ memcmp: { offset: 33, bytes: mint } }],
      },
    ]);
    if (Array.isArray(res) && res.length > 0) {
      return { pubkey: res[0].pubkey as string, data: res[0].account.data[0] as string };
    }
  } catch (_) { /* RPC disabled */ }
  return null;
}

// ---------- check builders ----------

function unknown(title: string, msg: string): AuditCheck {
  return { status: "unknown", score: 0, title, message: msg, fix: null };
}

async function checkAuthority(network: Network, mint: string): Promise<AuditCheck> {
  try {
    const acct = await rpc(network, "getAccountInfo", [
      mint,
      { encoding: "base64", commitment: "confirmed" },
    ]);
    if (!acct?.value) {
      return {
        status: "fail",
        score: 0,
        title: "On-chain Authority",
        message: "Mint account not found on this network. Double-check the address and network.",
        steps: [
          "Confirm you pasted the SPL token mint address (not a wallet or pair address).",
          "Switch network if your token was launched on devnet.",
        ],
        fix: null,
      };
    }
    const { mintAuthority, freezeAuthority, decimals, supply } = decodeMint(acct.value.data[0]);
    const allRevoked = !mintAuthority && !freezeAuthority;
    if (allRevoked) {
      return {
        status: "pass",
        score: 20,
        title: "On-chain Authority",
        message: "Mint and freeze authorities are revoked. Holders are protected from rug-style risks.",
        details: { mintAuthority, freezeAuthority, decimals, supply },
        fix: null,
      };
    }
    const issues: string[] = [];
    const steps: string[] = [];
    if (mintAuthority) {
      issues.push("mint authority not revoked");
      steps.push("Revoke MINT authority so no new tokens can ever be created.");
    }
    if (freezeAuthority) {
      issues.push("freeze authority not revoked");
      steps.push("Revoke FREEZE authority so holder accounts can never be frozen.");
    }
    steps.push("Open Launch Token → 'Manage Existing' and use the Revoke buttons (or run `spl-token authorize <mint> mint --disable` and `... freeze --disable`).");
    return {
      status: "fail",
      score: mintAuthority && freezeAuthority ? 0 : 8,
      title: "On-chain Authority",
      message: `CRITICAL: ${issues.join(" · ")}. DEX listings and serious buyers will skip your token.`,
      details: { mintAuthority, freezeAuthority, decimals, supply },
      fix: { label: "Revoke Authority", action: "revoke_authority" },
      steps,
    };
  } catch (e) {
    return unknown("On-chain Authority", e instanceof Error ? e.message : String(e));
  }
}

async function checkMetadata(network: Network, mint: string, ds: any, jup: any): Promise<AuditCheck> {
  // 1. Try on-chain Metaplex metadata via getProgramAccounts.
  let onchain: { name: string; symbol: string; uri: string; isMutable: boolean | null } | null = null;
  try {
    const found = await findMetadataAccount(network, mint);
    if (found) onchain = decodeMetadata(found.data);
  } catch (_) { /* ignore */ }

  // 2. Fallback to off-chain aggregators (DexScreener / Jupiter) so we still report
  //    something useful when the public RPC blocks getProgramAccounts.
  const dsToken = ds?.pairs?.[0]?.baseToken ?? null;
  const fallbackName = onchain?.name || jup?.name || dsToken?.name || "";
  const fallbackSymbol = onchain?.symbol || jup?.symbol || dsToken?.symbol || "";
  const uri = onchain?.uri || jup?.logoURI || "";
  const isMutable = onchain?.isMutable ?? null;
  const verifiedOnJup = !!jup?.address; // Jupiter strict / verified list inclusion

  if (!fallbackName && !fallbackSymbol && !uri) {
    return {
      status: "fail",
      score: 0,
      title: "Metadata",
      message: "No Metaplex metadata account found. Token will not display name, symbol or logo on DEXs and wallets.",
      fix: { label: "Upload Metadata", action: "upload_metadata" },
      steps: [
        "Create a metadata JSON (name, symbol, description, image URL, socials).",
        "Pin the JSON + logo to IPFS (Pinata / NFT.Storage).",
        "Attach the metadata to your mint via Metaplex Token Metadata (createMetadataAccountV3).",
        "In this app: Launch Token → 'Add Metadata' will do all of the above for you.",
      ],
    };
  }

  // 3. Fetch off-chain JSON if URI is present.
  let json: any = null;
  let imageOk = !!jup?.logoURI || !!dsToken?.image;
  if (uri) {
    try {
      const url = uri.startsWith("ipfs://")
        ? `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`
        : uri;
      const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (r.ok) {
        try { json = await r.json(); imageOk = imageOk || !!json?.image; }
        catch { /* logo URL directly */ imageOk = true; }
      }
    } catch (_) { /* ignore */ }
  }

  const missing: string[] = [];
  if (!fallbackName) missing.push("name");
  if (!fallbackSymbol) missing.push("symbol");
  if (!json?.description) missing.push("description");
  if (!imageOk) missing.push("logo image");
  const socialsOk = json && (json.extensions?.twitter || json.extensions?.telegram || json.extensions?.website);
  if (!socialsOk) missing.push("socials (twitter / telegram / website)");

  // Treat mutable metadata as a warn even when fields are complete — buyers
  // see "Mutable metadata" as a yellow flag on aggregators.
  if (isMutable === true) missing.push("immutable metadata (currently mutable)");
  if (!verifiedOnJup) missing.push("Jupiter verification");

  const details = {
    name: fallbackName, symbol: fallbackSymbol, uri, json,
    source: onchain ? "on-chain" : (jup ? "jupiter" : "dexscreener"),
    isMutable, verifiedOnJup,
  };

  if (missing.length === 0) {
    return { status: "pass", score: 20, title: "Metadata", message: `Full metadata: ${fallbackName} (${fallbackSymbol}), immutable & verified on Jupiter.`, details };
  }
  if (fallbackName && fallbackSymbol && imageOk) {
    // Surface mutable / unverified specifically because they map to common
    // aggregator warnings ("Mutable metadata", "Unverified token").
    const headline = isMutable === true
      ? "Metadata is mutable — buyers see 'Mutable metadata' as a yellow flag."
      : !verifiedOnJup
        ? "Token is not on Jupiter's verified list — appears as 'Unverified token'."
        : `Basic metadata is present. Missing: ${missing.join(", ")}.`;
    return {
      status: "warn",
      score: 12,
      title: "Metadata",
      message: headline,
      details,
      fix: { label: isMutable ? "Make Metadata Immutable" : (!verifiedOnJup ? "Verify on Jupiter" : "Improve Metadata"), action: "upload_metadata" },
      steps: [
        ...(isMutable === true ? ["Set `isMutable=false` on your Metaplex metadata via updateMetadataAccountV2 to lock identity in place."] : []),
        ...(!verifiedOnJup ? ["Submit your token to Jupiter's verified list to remove the 'Unverified' warning: https://station.jup.ag/guides/general/get-your-token-on-jupiter"] : []),
        "Edit your metadata JSON to add any missing fields (description, socials, image).",
        "Re-pin to IPFS and update the on-chain URI before re-scanning.",
      ],
    };
  }
  return {
    status: "fail",
    score: 4,
    title: "Metadata",
    message: `Metadata incomplete. Missing: ${missing.join(", ")}.`,
    details,
    fix: { label: "Upload Metadata", action: "upload_metadata" },
    steps: [
      "Create a complete metadata JSON (name, symbol, description, image, extensions).",
      "Pin to IPFS and call createMetadataAccountV3 (or use Launch Token → Add Metadata).",
    ],
  };
}

async function fetchDexScreener(mint: string) {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function fetchJupiter(mint: string) {
  try {
    const r = await fetch(`https://tokens.jup.ag/token/${mint}`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function checkLiquidity(network: Network, ds: any, launchRow: any | null): Promise<AuditCheck> {
  const pairs: any[] = ds?.pairs ?? [];
  if (!pairs.length) {
    return {
      status: "fail",
      score: 0,
      title: "Liquidity",
      message: "No liquidity pool detected on Raydium / Orca / Meteora. Token cannot be traded.",
      fix: { label: "Create Liquidity Pool", action: "add_liquidity" },
      steps: [
        "Pair your token with SOL or USDC on Raydium (recommended for memecoins).",
        "Seed at least $1,000 of liquidity for visibility on aggregators.",
        "Lock the LP tokens (e.g. via Streamflow) so buyers know liquidity can't be pulled.",
        "In this app: Launch Token → 'Create LP & Lock' walks you through it.",
      ],
    };
  }
  const top = [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const usd = top?.liquidity?.usd ?? 0;

  // Try to detect LP lock + LP providers via the LP mint we recorded in token_launches.
  let lpLocked: boolean | null = launchRow?.liquidity_locked ?? null;
  let lpProviderCount: number | null = null;
  let lpUnlockedPct: number | null = null;
  const lpMint: string | null = launchRow?.lp_mint ?? null;
  if (lpMint) {
    try {
      const r = await rpc(network, "getTokenLargestAccounts", [lpMint, { commitment: "confirmed" }]);
      const accs = (r?.value ?? []) as any[];
      lpProviderCount = accs.filter((a) => Number(a.uiAmount ?? 0) > 0).length;
      const supplyRes = await rpc(network, "getTokenSupply", [lpMint]);
      const totalUi = Number(supplyRes?.value?.uiAmount ?? 0);
      if (totalUi > 0 && launchRow?.lock_address) {
        const locked = accs.find((a) => a.address === launchRow.lock_address);
        const lockedAmt = Number(locked?.uiAmount ?? 0);
        const lockedPct = (lockedAmt / totalUi) * 100;
        lpLocked = lockedPct >= 90;
        lpUnlockedPct = Math.max(0, 100 - lockedPct);
      } else if (totalUi > 0) {
        // No lock account known — assume fully unlocked.
        lpUnlockedPct = 100;
        lpLocked = false;
      }
    } catch { /* ignore */ }
  }

  const baseDetails = { dex: top.dexId, pair: top.pairAddress, usd, lpLocked, lpProviderCount, lpUnlockedPct, lpMint };

  // Severity ladder
  if (usd < 100) {
    return {
      status: "fail",
      score: 0,
      title: "Liquidity",
      message: `Critically low liquidity ($${usd.toFixed(2)}) on ${top.dexId}. Buyers cannot trade meaningfully.`,
      details: baseDetails,
      fix: { label: "Add Liquidity", action: "add_liquidity" },
      steps: [
        `Add at least $1,000 of liquidity to your ${top.dexId} pool.`,
        "Lock the new LP tokens to keep the trust signal.",
      ],
    };
  }
  if (usd < 1000) {
    return {
      status: "warn",
      score: 6,
      title: "Liquidity",
      message: `Low liquidity ($${usd.toFixed(0)}) on ${top.dexId}. Buyers will face high slippage.`,
      details: baseDetails,
      fix: { label: "Add Liquidity", action: "add_liquidity" },
      steps: [
        `Add depth to your ${top.dexId} pool — aim for at least $1,000 to clear aggregator thresholds.`,
        "Once added, lock the new LP tokens.",
      ],
    };
  }
  if (lpUnlockedPct !== null && lpUnlockedPct >= 50) {
    return {
      status: "fail",
      score: 4,
      title: "Liquidity",
      message: `Large amount of LP unlocked (${lpUnlockedPct.toFixed(2)}%). The owner can pull liquidity at any time.`,
      details: baseDetails,
      fix: { label: "Lock Liquidity", action: "lock_liquidity" },
      steps: [
        "Lock at least 90% of your LP tokens via Streamflow / Team.Finance for 6+ months.",
        "Buyers will not trust a pool with most LP unlocked — this is the #1 rug signal.",
      ],
    };
  }
  if (lpProviderCount !== null && lpProviderCount < 3) {
    return {
      status: "warn",
      score: 10,
      title: "Liquidity",
      message: `Only ${lpProviderCount} LP provider${lpProviderCount === 1 ? "" : "s"}. A single exit can drain the pool.`,
      details: baseDetails,
      fix: { label: "Add Liquidity", action: "add_liquidity" },
      steps: [
        "Encourage community members to add LP via promotion campaigns.",
        "More LP providers = more resilient pool depth.",
      ],
    };
  }
  return {
    status: "pass",
    score: 20,
    title: "Liquidity",
    message: `Healthy pool on ${top.dexId} with $${usd.toLocaleString()} liquidity${lpLocked ? ", LP locked" : ""}.`,
    details: baseDetails,
  };
}

function checkIndexing(ds: any, jup: any): AuditCheck {
  const onDex = !!(ds?.pairs?.length);
  const onJup = !!jup?.address;
  const onBird = onDex; // Birdeye uses the same indexing source as DexScreener
  const count = [onDex, onJup, onBird].filter(Boolean).length;
  if (count === 3) {
    return { status: "pass", score: 20, title: "Indexing", message: "FULLY INDEXED: DexScreener, Birdeye and Jupiter all show this token.", details: { onDex, onJup, onBird } };
  }
  if (count === 0) {
    return {
      status: "fail",
      score: 0,
      title: "Indexing",
      message: "NOT INDEXED on any major aggregator. Wallets and traders cannot find your token.",
      fix: { label: "Submit to Indexers", action: "submit_indexers" },
      steps: [
        "Make sure your liquidity pool is live first — indexers only pick up tradable tokens.",
        "Submit to Jupiter strict list: https://station.jup.ag/guides/general/get-your-token-on-jupiter",
        "Update DexScreener token info: https://dexscreener.com/solana/<pair-address> → Update Token Info.",
        "Claim Birdeye listing: https://docs.birdeye.so/docs/token-list-application.",
      ],
    };
  }
  const missing: string[] = [];
  if (!onDex) missing.push("DexScreener");
  if (!onJup) missing.push("Jupiter strict list");
  return {
    status: "warn",
    score: 10,
    title: "Indexing",
    message: `Partially indexed — DexScreener: ${onDex ? "yes" : "no"}, Jupiter: ${onJup ? "yes" : "no"}, Birdeye: ${onBird ? "yes" : "no"}.`,
    details: { onDex, onJup, onBird },
    fix: { label: "Submit to Indexers", action: "submit_indexers" },
    steps: missing.map((m) => `Submit your token to ${m}.`).concat([
      "Make sure your metadata image and socials are correct — indexers reject incomplete tokens.",
    ]),
  };
}

async function checkHolders(network: Network, mint: string): Promise<AuditCheck> {
  try {
    const res = await rpc(network, "getTokenLargestAccounts", [mint, { commitment: "confirmed" }]);
    const list = res?.value ?? [];
    if (!list.length) {
      return { status: "warn", score: 5, title: "Holder Distribution", message: "No holder data available yet.", fix: null };
    }
    const supplyRes = await rpc(network, "getTokenSupply", [mint]);
    const totalUi = Number(supplyRes?.value?.uiAmount ?? 0);
    if (!totalUi) return { status: "warn", score: 5, title: "Holder Distribution", message: "Supply unavailable for concentration check.", fix: null };
    const top10Sum = list.slice(0, 10).reduce((s: number, h: any) => s + Number(h.uiAmount ?? 0), 0);
    const pct = (top10Sum / totalUi) * 100;
    const topSingle = Number(list[0]?.uiAmount ?? 0);
    const singlePct = (topSingle / totalUi) * 100;

    // Single-holder ownership is its own red flag — surface it first.
    if (singlePct > 25 && pct > 50) {
      return {
        status: "fail",
        score: 3,
        title: "Holder Distribution",
        message: `Single wallet holds ${singlePct.toFixed(2)}% and top 10 hold ${pct.toFixed(1)}% — extreme concentration risk.`,
        details: { topPct: pct, singlePct },
        fix: { label: "Improve Distribution", action: "promote" },
        steps: [
          "If the top wallet is a locker / LP / treasury, label it on DexScreener (Update Token Info).",
          "Run airdrops or community campaigns to spread supply across more wallets.",
          "Stage additional liquidity instead of holding it in one wallet.",
        ],
      };
    }
    if (pct > 60) {
      return {
        status: "fail",
        score: 4,
        title: "Holder Distribution",
        message: `Top 10 wallets hold ${pct.toFixed(1)}% — extreme whale risk; price will dump on any sell.`,
        details: { topPct: pct, singlePct },
        fix: { label: "Improve Distribution", action: "promote" },
        steps: [
          "Distribute supply: airdrop, community rounds, or staged liquidity additions.",
          "If top wallets are LP / locker / treasury, label them publicly (DexScreener team update).",
        ],
      };
    }
    if (pct > 30 || singlePct > 15) {
      return {
        status: "warn",
        score: 12,
        title: "Holder Distribution",
        message: singlePct > 15
          ? `Single holder owns ${singlePct.toFixed(2)}% — buyers worry about a sudden dump.`
          : `Top 10 hold ${pct.toFixed(1)}% — moderate concentration, watch for sell pressure.`,
        details: { topPct: pct, singlePct },
        fix: { label: "Improve Distribution", action: "promote" },
        steps: [
          "Continue distribution via promotions and incentives.",
          "Label any team / locker wallets on DexScreener so the % is correctly attributed.",
        ],
      };
    }
    return { status: "pass", score: 20, title: "Holder Distribution", message: `Top 10 hold ${pct.toFixed(1)}%, top wallet ${singlePct.toFixed(2)}% — healthy distribution.`, details: { topPct: pct, singlePct } };
  } catch (e) {
    return unknown("Holder Distribution", e instanceof Error ? e.message : String(e));
  }
}

function checkActivity(ds: any): AuditCheck {
  const pairs: any[] = ds?.pairs ?? [];
  if (!pairs.length) {
    return {
      status: "fail",
      score: 0,
      title: "Volume & Activity",
      message: "No Activity – Token Hidden. No trades detected on any DEX.",
      fix: { label: "Promote Token", action: "promote" },
      steps: [
        "List on a DEX with real liquidity (Raydium / Orca).",
        "Run a promotion campaign to drive first buyers — without volume, aggregators will keep hiding the token.",
      ],
    };
  }
  const top = [...pairs].sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))[0];
  const v24 = top?.volume?.h24 ?? 0;
  const txns = (top?.txns?.h24?.buys ?? 0) + (top?.txns?.h24?.sells ?? 0);
  if (v24 === 0 && txns === 0) {
    return {
      status: "fail",
      score: 0,
      title: "Volume & Activity",
      message: "No Activity – Token Hidden. Zero trades in last 24h.",
      fix: { label: "Promote Token", action: "promote" },
      steps: [
        "Launch a promotion campaign on Telegram / Discord to bring buyers.",
        "Aggregators auto-hide tokens with zero 24h volume — even one trade unlocks visibility.",
      ],
    };
  }
  if (v24 < 500) {
    return {
      status: "warn",
      score: 10,
      title: "Volume & Activity",
      message: `Low activity: $${v24.toFixed(0)} volume / ${txns} txns in 24h.`,
      details: { v24, txns },
      fix: { label: "Promote Token", action: "promote" },
      steps: [
        "Run a Campaign Engine promo to push 24h volume above $500 — that's the typical 'trending' threshold.",
      ],
    };
  }
  return { status: "pass", score: 20, title: "Volume & Activity", message: `$${v24.toLocaleString()} 24h volume across ${txns} txns.`, details: { v24, txns } };
}

// ---------- handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mint = String(body.mint ?? "").trim();
    const network: Network = body.network === "devnet" ? "devnet" : "mainnet";
    if (!mint || mint.length < 32 || mint.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid mint address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up our own launch row (if any) so we can use lp_mint / lock_address
    // for the LP-lock + LP-providers checks. This is best-effort; the audit
    // works fine for tokens we never launched ourselves.
    let launchRow: any = null;
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SR_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SR_KEY) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/token_launches?mint_address=eq.${mint}&select=lp_mint,lock_address,liquidity_locked,network&limit=1`, {
          headers: { apikey: SR_KEY, Authorization: `Bearer ${SR_KEY}` },
        });
        if (r.ok) { const j = await r.json(); launchRow = Array.isArray(j) && j.length ? j[0] : null; }
      }
    } catch { /* ignore */ }

    const [authority, ds, jup, holders] = await Promise.all([
      checkAuthority(network, mint),
      fetchDexScreener(mint),
      fetchJupiter(mint),
      checkHolders(network, mint),
    ]);
    const metadata = await checkMetadata(network, mint, ds, jup);
    const liquidity = await checkLiquidity(network, ds, launchRow);
    const indexing = checkIndexing(ds, jup);
    const activity = checkActivity(ds);

    const checks = { authority, metadata, liquidity, indexing, holders, activity };
    const scoreTotal = Object.values(checks).reduce((s, c) => s + c.score, 0);
    const ready = scoreTotal >= 80 && authority.status === "pass" && liquidity.status !== "fail";

    const missingSteps: string[] = [];
    Object.values(checks).forEach((c) => {
      if (c.fix && c.status !== "pass") missingSteps.push(c.fix.label);
    });

    // Build rich overview from already-fetched data
    const authDetails = (authority.details ?? {}) as { mintAuthority?: string | null; freezeAuthority?: string | null; decimals?: number; supply?: string };
    const metaDetails = (metadata.details ?? {}) as { name?: string; symbol?: string; uri?: string; json?: any; source?: string };
    const metaJson = metaDetails.json ?? null;
    const pairs: any[] = ds?.pairs ?? [];
    const top = pairs.length ? [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] : null;
    const decimals = authDetails.decimals ?? null;
    const supplyRaw = authDetails.supply ?? null;
    let supplyUi: number | null = null;
    try { if (supplyRaw && decimals != null) supplyUi = Number(BigInt(supplyRaw)) / 10 ** decimals; } catch { /* */ }

    let topHolders: TokenOverview["topHolders"] = [];
    try {
      const res = await rpc(network, "getTokenLargestAccounts", [mint, { commitment: "confirmed" }]);
      const list = res?.value ?? [];
      const totalUi = supplyUi ?? 0;
      topHolders = list.slice(0, 10).map((h: any) => ({
        address: h.address as string,
        uiAmount: Number(h.uiAmount ?? 0),
        pct: totalUi > 0 ? (Number(h.uiAmount ?? 0) / totalUi) * 100 : 0,
      }));
    } catch { /* ignore */ }

    const ageDays = top?.pairCreatedAt ? Math.max(0, Math.floor((Date.now() - Number(top.pairCreatedAt)) / 86400000)) : null;
    const pairCreatedAt = top?.pairCreatedAt ? new Date(Number(top.pairCreatedAt)).toISOString() : null;

    const overview: TokenOverview = {
      identity: {
        name: metaDetails.name || jup?.name || top?.baseToken?.name || null,
        symbol: metaDetails.symbol || jup?.symbol || top?.baseToken?.symbol || null,
        logo: (() => {
          // Prefer on-chain JSON image, then Jupiter, then DexScreener.
          // Skip DexScreener CDN URLs that aren't publicly hotlinkable (return 422 on direct GET).
          const dsImg = top?.info?.imageUrl || null;
          const dsSafe = dsImg && !/cdn\.dexscreener\.com\/tokens\//i.test(dsImg) ? dsImg : null;
          return metaJson?.image || jup?.logoURI || dsSafe || dsImg || null;
        })(),
        description: metaJson?.description || null,
        decimals,
        supplyRaw,
        supplyUi,
        mintAuthority: authDetails.mintAuthority ?? null,
        freezeAuthority: authDetails.freezeAuthority ?? null,
        metadataSource: (metaDetails.source as any) || "none",
      },
      socials: {
        website: metaJson?.extensions?.website || top?.info?.websites?.[0]?.url || null,
        twitter: metaJson?.extensions?.twitter || (top?.info?.socials?.find((s: any) => s.type === "twitter")?.url) || null,
        telegram: metaJson?.extensions?.telegram || (top?.info?.socials?.find((s: any) => s.type === "telegram")?.url) || null,
        discord: metaJson?.extensions?.discord || (top?.info?.socials?.find((s: any) => s.type === "discord")?.url) || null,
      },
      market: {
        priceUsd: top?.priceUsd ? Number(top.priceUsd) : null,
        priceNative: top?.priceNative ? Number(top.priceNative) : null,
        fdv: top?.fdv ?? null,
        marketCap: top?.marketCap ?? null,
        liquidityUsd: top?.liquidity?.usd ?? null,
        priceChange: {
          m5: top?.priceChange?.m5 ?? null,
          h1: top?.priceChange?.h1 ?? null,
          h6: top?.priceChange?.h6 ?? null,
          h24: top?.priceChange?.h24 ?? null,
        },
        volume: {
          m5: top?.volume?.m5 ?? null,
          h1: top?.volume?.h1 ?? null,
          h6: top?.volume?.h6 ?? null,
          h24: top?.volume?.h24 ?? null,
        },
        txns24h: {
          buys: top?.txns?.h24?.buys ?? 0,
          sells: top?.txns?.h24?.sells ?? 0,
        },
        pairCreatedAt,
        ageDays,
      },
      pools: pairs.slice(0, 8).map((p: any) => ({
        dex: p.dexId,
        pairAddress: p.pairAddress,
        quoteSymbol: p.quoteToken?.symbol ?? "",
        liquidityUsd: p.liquidity?.usd ?? null,
        volume24h: p.volume?.h24 ?? null,
        priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
        url: p.url ?? null,
      })),
      topHolders,
      indexers: {
        dexscreener: !!pairs.length,
        jupiter: !!jup?.address,
        birdeye: !!pairs.length,
      },
      links: {
        solscan: `https://solscan.io/token/${mint}`,
        explorer: `https://explorer.solana.com/address/${mint}`,
        dexscreener: `https://dexscreener.com/solana/${mint}`,
        birdeye: `https://birdeye.so/token/${mint}?chain=solana`,
        jupiter: `https://jup.ag/swap/SOL-${mint}`,
      },
    };

    const report: AuditReport = {
      mint,
      network,
      fetchedAt: new Date().toISOString(),
      scoreTotal,
      ready,
      checks,
      missingSteps: [...new Set(missingSteps)],
      overview,
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
