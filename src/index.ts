import * as core from "@actions/core";
import { Client } from "@iota/sdk";
import { zipProject } from "./archiver";
import { uploadFile } from "./upload";
import { getResponseBlockMetadata, send } from "./wallet";

const run = async () => {
  const inputs = getInputs();
  await zipProject(inputs.path);

  console.log("Uploading file");
  const uri = await uploadFile();

  console.log("Sending stamp OTR request");
  const request = { requestType: "STAMP", uri };
  const client = new Client({ nodes: [inputs.node] });
  const block = await send(
    client,
    inputs.mnemonic,
    inputs.otrAddress,
    1000000,
    { request }
  );

  const response = await getResponseBlockMetadata(block, client);

  console.log("Sending stamp fund request");
  const cost = response.amountToMint + response.dailyCost * inputs.days;
  const fundBlock = await send(client, inputs.mnemonic, response.address, cost);
  await getResponseBlockMetadata(fundBlock, client);

  console.log("Stamp funded, stamp id", response.stamp);
  await client.destroy();
  process.exit();
};

const getInputs = () => {
  const path = core.getInput("path", { required: true });
  const node = core.getInput("node", { required: true });
  const mnemonic = core.getInput("mnemonic", { required: true });
  const otrAddress = core.getInput("otr_address", { required: true });

  return { path, node, mnemonic, otrAddress, days: 1 };
};

run();
