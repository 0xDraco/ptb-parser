import { bcs, fromHEX, toHEX } from "@mysten/bcs";
import { normalizeSuiAddress } from "@mysten/sui.js/utils";

export const moveCallDataStruct = bcs.struct("MoveCallData", {
    kind: bcs.u64(),
    packageId: bcs.string(),
    moduleName: bcs.string(),
    functionName: bcs.string(),
    arguments: bcs.vector(bcs.vector(bcs.u8())),
    typeArguments: bcs.vector(bcs.vector(bcs.u8())),
});

export const splitCoinsDataStruct = bcs.struct("SplitCoinsData", {
    kind: bcs.u64(),
    coin: bcs.vector(bcs.u8()),
    amounts: bcs.vector(bcs.vector(bcs.u8())),
});

export const mergeCoinsDataStruct = bcs.struct("MergeCoinsData", {
    kind: bcs.u64(),
    destination: bcs.vector(bcs.u8()),
    sources: bcs.vector(bcs.vector(bcs.u8())),
});

export const transferObjectsDataStruct = bcs.struct("TransferObjectsData", {
    kind: bcs.u64(),
    address: bcs.vector(bcs.u8()),
    objects: bcs.vector(bcs.vector(bcs.u8())),
});

export const publishStruct = bcs.struct("PublishData", {
    kind: bcs.u64(),
    modules: bcs.vector(bcs.vector(bcs.u8())),
    dependencies: bcs.vector(bcs.vector(bcs.u8())),
});

export const upgradeDataStruct = bcs.struct("UpgradeData", {
    kind: bcs.u64(),
    packageId: bcs.string(),
    ticket: bcs.vector(bcs.u8()),
    modules: bcs.vector(bcs.vector(bcs.u8())),
    dependencies: bcs.vector(bcs.vector(bcs.u8())),
});

export const makeMoveVecStruct = bcs.struct("MakeMoveVec", {
    kind: bcs.u64(),
    type: bcs.option(bcs.string()),
    objects: bcs.vector(bcs.vector(bcs.u8())),
});

export const resultStruct = bcs.struct("Result", {
    kind: bcs.u64(),
    index: bcs.u64(),
});

export const nestedResultStruct = bcs.struct("NestedResult", {
    kind: bcs.u64(),
    index: bcs.u64(),
    resultIndex: bcs.u64(),
});

export const variableArgumentStruct = bcs.struct("VariableInput", {
    kind: bcs.u64(),
    name: bcs.string(),
});

export const inputStruct = bcs.struct("Input", {
    type: bcs.u64(),
    valueType: bcs.option(bcs.u64()),
    value: bcs.vector(bcs.u8())
});

export const inputRefStruct = bcs.struct("InputRef", {
    kind: bcs.u64(),
    index: bcs.u64(),
});


export const Address = bcs.fixedArray(32, bcs.u8()).transform({
    input: (address: string) => fromHEX(normalizeSuiAddress(address).substring(2)),
    output: (address) => toHEX(Uint8Array.from(address)),
});

export { bcs, fromHEX, toHEX };
