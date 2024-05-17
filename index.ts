import { SuiClient } from "@mysten/sui.js/client"
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock, TransactionResult } from '@mysten/sui.js/transactions';
import { Address, bcs } from "./src/bcs";
import { ArgumentKind, CommandKind, Command, Input, InputType } from "./src/types";
import { CommandBuilder } from "./src/builder/command";

const client = new SuiClient({ url: 'http://localhost:9000' })
const secretKey = Buffer.from("q4Tq3ELy669bd2egaAhHwJjLLDwcfcWb4G+z1khwqvE=", "base64")
const kp = Ed25519Keypair.fromSecretKey(secretKey);

const safePackage = '0x38a4f02cb9e0603ffe553d72bce7348f61edfdd1e98f3a77613e0598b073a9f7'


const changeMemberStruct = bcs.struct("ChangeMember", { operation: bcs.u64(), value: Address })
const changeThresholdStruct = bcs.struct("ChangeThreshold", { operation: bcs.u64(), value: bcs.u64() })
const changeExecutionDelayStruct = bcs.struct("ChangeExecutionDelay", { operation: bcs.u64(), value: bcs.u64() })

interface CreateSafeParams {
    threshold: number
    members: string[]
    executionDelayMs: number
}

interface CreateSafeTxParams {
    safe: string,
    isDraft: boolean,
    type: SafeTransaction.ConfigTransaction,
    operations: (ChangeMember | ChangeThreshold | ChangeExecutionDelay)[]
}

interface CreateSafePTxParams {
    safe: string,
    isDraft: boolean,
    type: SafeTransaction.ProgrammableTransaction,
    operations: Command[]
}

enum SafeTransaction {
    ConfigTransaction,
    ProgrammableTransaction
}

enum Operation {
    AddMember,
    RemoveMember,
    ChangeThreshold,
    ChangeExecutionDelay
}

enum Vote {
    Approve,
    Reject,
    Cancel
}

interface ChangeMember {
    operation: Operation.AddMember | Operation.RemoveMember
    member: string
}

interface ChangeThreshold {
    operation: Operation.ChangeThreshold
    value: number
}

interface ChangeExecutionDelay {
    operation: Operation.ChangeExecutionDelay
    value: number
}

interface ExecuteTransaction {
    transaction: string
    proposal: string
    safe: string
}

interface VoteTransaction {
    transaction: string
    proposal: string
    safe: string
    vote: Vote
}

function createSafe(params: CreateSafeParams) {
    const txb = new TransactionBlock()
    const [safe] = txb.moveCall({
        target: `${safePackage}::safe::create`,
        arguments: [
            txb.pure(params.threshold),
            txb.pure(params.executionDelayMs),
            txb.pure(params.members)
        ]
    })

    txb.moveCall({ target: `${safePackage}::safe::share`, arguments: [safe] })
    return client.signAndExecuteTransactionBlock({
        signer: kp,
        transactionBlock: txb
    })
}

function createSafeConfigTransaction(params: CreateSafeTxParams) {
    const txb = new TransactionBlock()
    const operations: number[][] = [];

    for (const operation of params.operations) {
        let data: Uint8Array
        if (operation.operation === Operation.AddMember || operation.operation === Operation.RemoveMember) {
            data = changeMemberStruct.serialize({
                operation: operation.operation,
                value: operation.member.startsWith("0x")
                    ? operation.member.substring(2)
                    : operation.member
            }).toBytes()
        } else if (operation.operation === Operation.ChangeThreshold) {
            data = changeThresholdStruct.serialize({
                operation: operation.operation,
                value: operation.value
            }).toBytes()
        } else if (operation.operation === Operation.ChangeExecutionDelay) {
            data = changeExecutionDelayStruct.serialize({
                operation: operation.operation,
                value: operation.value
            }).toBytes()
        } else {
            throw new Error("Unknown operation")
        }

        operations.push(Array.from(data))
    }

    const [transaction, proposal] =
        txb.moveCall({
            target: `${safePackage}::safe::propose`,
            arguments: [
                txb.object(params.safe),
                txb.pure(params.type),
                txb.pure(params.isDraft),
                txb.pure(operations),
                txb.pure("0x6")
            ]
        })

    txb.moveCall({
        target: `${safePackage}::transaction::share`,
        arguments: [transaction]
    })

    txb.moveCall({
        target: `${safePackage}::proposal::share`,
        arguments: [proposal]
    })

    return client.signAndExecuteTransactionBlock({
        signer: kp,
        transactionBlock: txb
    })
}

function createSafeProgrammableTransaction(params: CreateSafePTxParams) {
    const txb = new TransactionBlock()

    const { commands, inputs } = new CommandBuilder(params.operations).serialize()
    const cmds = bcs.vector(bcs.vector(bcs.u8())).serialize(commands).toBytes()
    const inps = bcs.vector(bcs.vector(bcs.u8())).serialize(inputs).toBytes()

    const [transaction, proposal] =
        txb.moveCall({
            target: `${safePackage}::safe::propose`,
            arguments: [
                txb.object(params.safe),
                txb.pure(params.type),
                txb.pure(params.isDraft),
                txb.pure([Array.from(inps), Array.from(cmds)]),
                txb.pure("0x6")
            ]
        })

    txb.moveCall({
        target: `${safePackage}::transaction::share`,
        arguments: [transaction]
    })

    txb.moveCall({
        target: `${safePackage}::proposal::share`,
        arguments: [proposal]
    })

    // txb.setGasBudget(50000000000)
    return client.signAndExecuteTransactionBlock({
        signer: kp,
        transactionBlock: txb
    })
}

function voteSafeTransaction(params: ExecuteTransaction) {
    const txb = new TransactionBlock()

    txb.moveCall({
        target: `${safePackage}::safe::vote`,
        arguments: [
            txb.object(params.safe),
            txb.object(params.proposal),
            txb.object(params.transaction),
            txb.pure(0),
            txb.object("0x6")
        ]
    })

    return client.signAndExecuteTransactionBlock({
        signer: kp,
        transactionBlock: txb
    })
}

async function executeSafeTransaction(params: ExecuteTransaction) {
    const txb = new TransactionBlock()

    const [request] = txb.moveCall({
        target: `${safePackage}::safe::request_execution`,
        arguments: [
            txb.object(params.safe),
            txb.object(params.proposal),
            txb.object(params.transaction),
            txb.object("0x6")
        ]
    })

    const trans = await client.getObject({ id: params.transaction, options: { showContent: true } })
    const { content } = trans.data!
    if (!content) return;
    // @ts-expect-error
    const { type, operations } = content.fields

    if (Number(type) === SafeTransaction.ConfigTransaction) {
        txb.moveCall({
            target: `${safePackage}::safe::execute_config_transaction`,
            arguments: [
                txb.object(params.safe),
                txb.object(params.transaction),
                request
            ]
        })
    } else {
        const inps = bcs.vector(bcs.vector(bcs.u8())).parse(Uint8Array.from(operations[0])).map((v) => Uint8Array.from(v))
        const cmds = bcs.vector(bcs.vector(bcs.u8())).parse(Uint8Array.from(operations[1])).map((v) => Uint8Array.from(v))
        const { inputs, commands } = CommandBuilder.deserialize({ inputs: inps, commands: cmds })

        // @ts-expect-error
        cmdToTxb(txb, inputs, commands)
    }

    txb.moveCall({
        target: `${safePackage}::safe::finalize_execution`,
        arguments: [
            txb.object(params.safe),
            txb.object(params.proposal),
            txb.object(params.transaction),
            request,
            txb.object("0x6")
        ]
    })

    return client.signAndExecuteTransactionBlock({
        signer: kp,
        transactionBlock: txb
    })
}

async function main() {
    // const safeParams: CreateSafeParams = {
    //     threshold: 1,
    //     executionDelayMs: 0,
    //     members: [kp.toSuiAddress()]
    // }
    //
    // const safeResponse = await createSafe(safeParams)
    // console.log(safeResponse)

    // const safeTransactionParams: CreateSafeTxParams = {
    //     isDraft: false,
    //     type: SafeTransaction.ConfigTransaction,
    //     safe: "0x24b91a0db62b7516699bd6a2c236d4c5a8bfbf6bd73d627a921d1431a7491c06",
    //     operations: [
    //         {
    //             operation: Operation.AddMember,
    //             member: "0x38325838ea8670df7aad13ea8a5d83b188f16b0b81e69ff4e17e97de73b7e46f"
    //         },
    //     ]
    // }
    //
    // const txResponse = await createSafeConfigTransaction(safeTransactionParams)
    // console.log(txResponse)

    // const txs: Command[] = [
    //     {
    //         kind: CommandKind.MoveCall,
    //         packageId: dummyPkg,
    //         moduleName: "cotton",
    //         functionName: "new_cotton",
    //         arguments: [],
    //         typeArguments: [],
    //     },
    //     {
    //         kind: CommandKind.TransferObjects,
    //         address: {
    //             type: InputType.Pure,
    //             value: kp.toSuiAddress(),
    //             valueType: ValueType.Address,
    //         },
    //         objects: [{kind: ArgumentKind.Result, index: 0}]
    //     }
    // ]
    // const safeTransactionParams: CreateSafePTxParams = {
    //     isDraft: false,
    //     type: SafeTransaction.ProgrammableTransaction,
    //     safe: "0x3f98337d15f5877d24d6e4c7c340730191ad68ba3d604d736c682ad83f45f4df",
    //     operations: txs
    // }
    //
    // const txResponse = await createSafeProgrammableTransaction(safeTransactionParams)
    // console.log(txResponse)

    // const voteTransactionParams: VoteTransaction = {
    //     transaction: "0x307a4585b15148f6db86703116995b230a4d296ddb7eaff6da687acf50490803",
    //     proposal: "0xfef6d2e89fe13f13d23ae8e23b19226982d3991f89b987519307cc7c9405b37c",
    //     safe: "0x3f98337d15f5877d24d6e4c7c340730191ad68ba3d604d736c682ad83f45f4df",
    //     vote: Vote.Approve
    // }
    //
    // const txResponse = await voteSafeTransaction(voteTransactionParams)
    // console.log(txResponse)

    // const executeTransactionParams: ExecuteTransaction = {
    //     transaction: "0x307a4585b15148f6db86703116995b230a4d296ddb7eaff6da687acf50490803",
    //     proposal: "0xfef6d2e89fe13f13d23ae8e23b19226982d3991f89b987519307cc7c9405b37c",
    //     safe: "0x3f98337d15f5877d24d6e4c7c340730191ad68ba3d604d736c682ad83f45f4df",
    // }
    //
    // const txResponse = await executeSafeTransaction(executeTransactionParams)
    // console.log(txResponse)
}

function cmdToTxb(txb: TransactionBlock, inputs: Input[], commands: Command[]) {
    const transactions: TransactionResult[] = [];

    for (const command of commands) {
        let result: TransactionResult
        if (command.kind === CommandKind.MoveCall) {
            const { packageId, functionName, moduleName, arguments: args, typeArguments } = command
            console.log(`${packageId}::${moduleName}::${functionName}`)
            result = txb.moveCall({
                target: `${packageId}::${moduleName}::${functionName}`,
                typeArguments: typeArguments.map(ty => new TextDecoder().decode(Uint8Array.from(ty as number[]))),
                arguments: args.map((arg) => {
                    if ('kind' in arg) {
                        if (arg.kind === ArgumentKind.Input) {
                            const inp = inputs[Number(arg.index)];
                            if (inp.type == InputType.Pure) {
                                return txb.pure(inp.value)
                            } else {
                                return txb.object(inp.value)
                            }
                        } else if (arg.kind === ArgumentKind.NestedResult) {
                            return transactions[Number(arg.index)][Number(arg.resultIndex)]
                        } else if (arg.kind === ArgumentKind.Result) {
                            return transactions[Number(arg.index)]
                        }
                    }

                    throw new Error("Invalid Argument")
                })
            })
        } else if (command.kind === CommandKind.TransferObjects) {
            const { address, objects } = command

            const objss = objects.map((arg) => {
                if ('kind' in arg) {
                    if (arg.kind === ArgumentKind.Input) {
                        const inp = inputs[Number(arg.index)];
                        if (inp.type == InputType.Pure) {
                            throw new Error("")
                        } else {
                            return txb.object(inp.value)
                        }
                    } else if (arg.kind === ArgumentKind.NestedResult) {
                        return transactions[Number(arg.index)][Number(arg.resultIndex)]
                    } else if (arg.kind === ArgumentKind.Result) {
                        return transactions[Number(arg.index)]
                    }
                }

                throw new Error("Invalid Argument")
            });

            let addr;
            if ('kind' in address) {
                if (address.kind === ArgumentKind.Input) {
                    const inp = inputs[Number(address.index)];
                    if (inp.type == InputType.Pure) {
                        addr = txb.pure(inp.value)
                    } else {
                        addr = txb.object(inp.value)
                    }
                } else if (address.kind === ArgumentKind.NestedResult) {
                    addr = transactions[Number(address.index)][Number(address.resultIndex)]
                } else if (address.kind === ArgumentKind.Result) {
                    addr = transactions[Number(address.index)]
                }
            }
            if (!addr) throw new Error("invalid address")

            result = txb.transferObjects(objss, addr)
        } else {
            throw new Error("")
        }

        transactions.push(result)
    }
}

main().catch(console.log)

