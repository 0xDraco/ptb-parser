import { TransactionBlock, TransactionResult } from "@mysten/sui.js/transactions";
import { CommandBuilder } from "../src/builder/command";
import { Argument, ArgumentKind, CommandKind, Command, InputType, ValueType, VariableArgument } from "../src/types";



const transaction: Command[] = [
    {
        kind: CommandKind.MoveCall,
        packageId: "0x0",
        moduleName: "safe",
        functionName: "transfer",
        typeArguments: ["var:coinType"],
        arguments: [{ kind: ArgumentKind.VariableArgument, name: "var:witness" }, { type: InputType.Pure, value: 5, valueType: ValueType.U64 }]
    }
]

function toTransactionBlock(txb: TransactionBlock, builder: CommandBuilder, variables: Record<string, TransactionResult | string>) {
    const transactions: TransactionResult[] = []

    for (const command of builder.commands) {
        if (command.kind === CommandKind.MoveCall) {
            const { packageId, moduleName, functionName, arguments: args, typeArguments } = command
            const arggs = [];
            for (const arg of args) {
                const argl = argg(arg)
                if (!argl) throw new Error(`Argument ${arg} not found`)
                arggs.push(argl)
            }

            const typeArgss = typeArguments.map(ty => tyArgg(ty));
            const pkg = isVariable(packageId) ? variables[variable(packageId)] as string : packageId
            const func = isVariable(functionName) ? variables[variable(functionName)] as string : functionName
            const mod = isVariable(moduleName) ? variables[variable(moduleName)] as string : moduleName

            transactions.push(txb.moveCall({
                arguments: arggs,
                typeArguments: typeArgss,
                target: `${pkg}::${mod}::${func}`
            }))
        } else if (command.kind === CommandKind.MergeCoins) {
            let { coins, primary } = command

            const coinss = []

            let ppp = argg(primary)
            if (!ppp) throw new Error("Invalid primary coin")

            for (const arg of coins) {
                if (!('kind' in arg)) return;

                const coin = argg(arg)
                if (!coin) throw new Error("Invalid coin")
                coinss.push(coin)
            }

            // @ts-expect-error
            transactions.push(txb.mergeCoins(ppp, coinss))
        } else if (command.kind === CommandKind.TransferObjects) {
            const { address, objects } = command


            const coinss = []

            let ppp = argg(address)
            if (!ppp) throw new Error("Invalid address")

            for (const arg of objects) {
                if (!('kind' in arg)) return;

                const coin = argg(arg)
                if (!coin) throw new Error("Invalid object")
                coinss.push(coin)
            }

            // @ts-expect-error
            transactions.push(txb.transferObjects(ppp, coinss))
        } else if (command.kind === CommandKind.SplitCoins) {
            let { coin, amounts } = command


            const coinss = []

            let ppp = argg(coin)
            if (!ppp) throw new Error("Invalid address")

            for (const arg of amounts) {
                if (!('kind' in arg)) return;

                const coin = argg(arg)
                if (!coin) throw new Error("Invalid amount")
                coinss.push(coin)
            }

            // @ts-expect-error
            transactions.push(txb.splitCoins(ppp, coinss))
        } else if (command.kind === CommandKind.Publish) {
            let { modules, dependencies } = command
            const ms = modules.map(m => isVariable(m) ? variables[variable(m)] as string : m)
            const ds = dependencies.map(d => isVariable(d) ? variables[variable(d)] as string : d)

            transactions.push(txb.publish({
                modules: ms,
                dependencies: ds
            }))
        } else if (command.kind === CommandKind.Upgrade) {
            const { packageId, modules, dependencies, ticket } = command
            const tkt = argg(ticket)
            if (!tkt) throw new Error("Invalid ticket")

            const pkg = isVariable(packageId) ? variables[variable(packageId)] as string : packageId
            const ms = modules.map(m => isVariable(m) ? variables[variable(m)] as string : m)
            const ds = dependencies.map(d => isVariable(d) ? variables[variable(d)] as string : d)

            transactions.push(txb.upgrade({
                packageId: pkg,
                modules: ms,
                dependencies: ds,
                // @ts-expect-error
                ticket: tkt
            }))
        } else if (command.kind === CommandKind.MakeMoveVec) {
            const { objects, type } = command

            const coinss = []
            for (const arg of objects) {
                if (!('kind' in arg)) return;

                const coin = argg(arg)
                if (!coin) throw new Error("Invalid amount")
                coinss.push(coin)
            }

            const t = type ? tyArgg(type) : undefined;

            // @ts-expect-error
            transactions.push(txb.makeMoveVec({ objects: coinss, type: t }))
        } else {
            throw new Error("Invalid command kind")
        }


        function variable(name: string) {
            if (!isVariable(name)) throw new Error("Invalid variable name");
            return name.split("var:")[1]
        }

        function isVariable(name: string) {
            return name.startsWith("var:")
        }

        function argg(arg: Argument) {
            if (!('kind' in arg)) return;

            if (arg.kind === ArgumentKind.Input) {
                let input = builder.inputs[arg.index];
                if (!input) throw new Error("Invalid input index");
                if (input.type == InputType.Pure) {
                    return txb.pure(input.value)
                }

                return txb.object(input.value)
            } else if (arg.kind === ArgumentKind.Result) {
                return transactions[arg.index]
            } else if (arg.kind === ArgumentKind.NestedResult) {
                return transactions[arg.index][arg.resultIndex]
            } else {
                const varr = variables[variable(arg.name)]
                if (!varr) throw new Error(`Variable '${variable(arg.name)}' value not found`)
                return typeof varr !== "string" ? varr : txb.pure(varr)
            }
        }

        function tyArgg(arg: string | number[]) {
            if (Array.isArray(arg)) {
                return new TextDecoder().decode(Uint8Array.from(arg))
            } else {
                if (isVariable(arg)) {
                    const varr = variables[variable(arg)]
                    if (!varr) throw new Error(`Variable '${variable(arg)}' value not found`)
                    if (typeof varr !== "string") throw new Error(`Variable '${variable(arg)}' must be a string`)

                    return varr
                } else {
                    return arg
                }
            }
        }
    }
}

const builder = new CommandBuilder()
transaction.forEach(cmd => builder.add(cmd))

// const ser = builder.serialize()
// console.log(CommandBuilder.deserialize(ser))

const txb = new TransactionBlock()
const witness = txb.moveCall({
    arguments: [],
    typeArguments: [],
    target: `0x2::ddd::func`
})
toTransactionBlock(txb, builder, { witness, coinType: "0x2::sui::SUI" })

console.log(JSON.parse(txb.serialize()).transactions[1])