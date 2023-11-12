import {
  AddressUnlockCondition,
  BasicOutputBuilderParams,
  Client,
  CoinType,
  Feature,
  INodeInfo,
  MetadataFeature,
  Output,
  ReferenceUnlock,
  RegularTransactionEssence,
  SecretManager,
  TaggedDataPayload,
  TransactionEssence,
  TransactionPayload,
  UTXOInput,
  UnlockCondition,
  Utils,
  hexToUtf8,
  utf8ToHex,
} from "@iota/sdk";
import bigInt from "big-integer";
import { mnemonicToSeedSync } from "bip39";

export const send = async (
  client: Client,
  from: string,
  to: string,
  amount: number,
  customMetadata?: Record<string, unknown>
) => {
  const info = (await client.getInfo()).nodeInfo;
  const fromBech = await getBechFromMnemonic(info, from);

  const consumedOutputIds = (
    await client.basicOutputIds([{ address: fromBech }])
  ).items;
  const consumedOutputs = (await client.getOutputs(consumedOutputIds)).map(
    (o) => o.output
  );

  const output = await packBasicOutput(client, to, amount, customMetadata);

  const remainderAmount =
    consumedOutputs.reduce((acc, act) => acc + Number(act.amount), 0) -
    Number(output.amount);
  const remainder = await packBasicOutput(
    client,
    fromBech,
    remainderAmount,
    {}
  );

  const inputs = consumedOutputIds.map(UTXOInput.fromOutputId);
  const inputsCommitment = Utils.computeInputsCommitment(consumedOutputs);

  const essence = await packEssence(client, inputs, inputsCommitment, [
    output,
    remainder,
  ]);
  const fromUnlock = await createUnlock(essence, from);
  const unlocks = consumedOutputs.map((_, i) =>
    i ? new ReferenceUnlock(0) : fromUnlock
  );

  const block = (
    await client.postBlockPayload(new TransactionPayload(essence, unlocks))
  )[0];

  return block;
};

const packBasicOutput = async (
  client: Client,
  toBech32: string,
  amount: number,
  customMetadata?: Record<string, unknown>
) => {
  const targetAddress = Utils.parseBech32Address(toBech32);
  const unlockConditions: UnlockCondition[] = [
    new AddressUnlockCondition(targetAddress),
  ];

  const params: BasicOutputBuilderParams = { unlockConditions };

  if (customMetadata) {
    const data = utf8ToHex(JSON.stringify(customMetadata));
    const metadataFeture = new MetadataFeature(data);
    params.features = (params.features || []) as Feature[];
    params.features.push(metadataFeture);
  }

  const output = await client.buildBasicOutput(params);
  const rent = (await client.getInfo()).nodeInfo.protocol.rentStructure;
  const storageDeposit = Utils.computeStorageDeposit(output, rent);
  params.amount = bigInt.max(bigInt(amount), storageDeposit).toString();

  return await client.buildBasicOutput(params);
};

const packEssence = async (
  client: Client,
  inputs: UTXOInput[],
  inputsCommitment: string,
  outputs: Output[]
) =>
  new RegularTransactionEssence(
    await client.getNetworkId(),
    inputsCommitment,
    inputs,
    outputs,
    undefined
  );

const createUnlock = async (essence: TransactionEssence, mnemonic: string) => {
  const essenceHash = Utils.hashTransactionEssence(essence);
  const secretManager = getSecretManager(mnemonic);
  return await secretManager.signatureUnlock(essenceHash, {
    coinType: CoinType.IOTA,
  });
};

export const getBechFromMnemonic = async (
  info: INodeInfo,
  mnemonic: string
): Promise<string> => {
  const addresses = await getSecretManager(mnemonic).generateEd25519Addresses({
    coinType: CoinType.IOTA,
    range: { start: 0, end: 1 },
    bech32Hrp: info.protocol.bech32Hrp,
  });

  return addresses[0];
};

const getSecretManager = (mnemonic: string) => {
  const seed = mnemonicToSeedSync(mnemonic);
  const hexSeed = "0x" + seed.toString("hex");
  return new SecretManager({ hexSeed });
};

export const getResponseBlockMetadata = async (
  blockId: string,
  client: Client
) => {
  console.log(
    `Awaiting response for block: ${blockId}, this might take a minute or two...`
  );
  const block = await client.getBlock(blockId);
  const outputId = Utils.computeOutputId(
    Utils.transactionId(block.payload as TransactionPayload),
    0
  );

  await wait(async () => {
    try {
      const output = await client.getOutput(outputId);
      return output.metadata.isSpent;
    } catch {
      return false;
    }
  });

  const output = await client.getOutput(outputId);
  const transactionId = output.metadata.transactionIdSpent!;
  const spentBlock = await client.getIncludedBlock(transactionId);
  const payload = <TransactionPayload>spentBlock.payload;
  const essence = payload.essence as RegularTransactionEssence;
  const hexData = (essence?.payload as TaggedDataPayload)?.data || "";
  const metadata = JSON.parse(hexToUtf8(hexData));
  return metadata.response;
};

const wait = async (
  func: () => Promise<boolean | undefined>,
  maxAttempt = 1200,
  delay = 500
) => {
  for (let attempt = 0; attempt < maxAttempt; ++attempt) {
    if (await func()) {
      return;
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error("Timeout");
};
