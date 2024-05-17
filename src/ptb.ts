import {
    ArgumentKind,
    CommandKind,
    Command,
    Input,
    InputRef,
    MakeMoveVecCommand,
    MergeCoinsCommand,
    MoveCallCommand,
    PublishCommand,
    SplitCoinsCommand,
    TransferObjectsCommand,
    UpgradeCommand,
    Argument,
    InputType,
} from "./types";
import { CommandSerializer } from "./serializer/command";
import { InputSerializer } from "./serializer/input";
import { TransactionBlock, TransactionArgument, TransactionObjectArgument, TransactionResult } from "@mysten/sui.js/transactions";

type SuiArgument = TransactionArgument | TransactionObjectArgument;

export class ProgrammableTransactionBlock {
    private _inputs: Input[] = [];
    private _commands: Command[] = [];

    /// These are used when adding the commands to Sui Transaction Block
    private _txb?: TransactionBlock;
    private _txResults: TransactionResult[] = [];
    private _variables: Record<string, string | SuiArgument> = {};

    constructor(commands?: Command[]) {
        if (commands) {
            for (const command of commands) {
                this.add(command);
            }
        }
    }

    add(command: Command) {
        switch (command.kind) {
            case CommandKind.MoveCall:
                this._addMoveCall(command);
                break;
            case CommandKind.SplitCoins:
                this._addSplitCoins(command);
                break;
            case CommandKind.MergeCoins:
                this._addMergeCoins(command);
                break;
            case CommandKind.TransferObjects:
                this._addTransferObjects(command);
                break;
            case CommandKind.Publish:
                this._addPublish(command);
                break;
            case CommandKind.Upgrade:
                this._addUpgrade(command);
                break;
            case CommandKind.MakeMoveVec:
                this._makeMoveVec(command);
                break;
            default:
                throw new Error("Command kind is not valid");
        }
    }

    public get commands(): Command[] {
        return this._commands;
    }

    public get inputs(): Input[] {
        return this._inputs;
    }

    public withSuiTransactionBlock(txb: TransactionBlock, variables: Record<string, string | SuiArgument> = {}) {
        this._txb = txb;
        this._txResults = [];
        this._variables = variables;

        for (const command of this._commands) {
            switch (command.kind) {
                case CommandKind.MoveCall:
                    this._withMoveCall(command);
                    break;
                case CommandKind.SplitCoins:
                    this._withSplitCoins(command);
                    break;
                case CommandKind.MergeCoins:
                    this._withMergeCoins(command);
                    break;
                case CommandKind.TransferObjects:
                    this._withTransferObjects(command);
                    break;
                case CommandKind.Publish:
                    this._withPublish(command);
                    break;
                case CommandKind.Upgrade:
                    this._withUpgrade(command);
                    break;
                case CommandKind.MakeMoveVec:
                    this._withMakeMoveVec(command);
                    break;
                default:
                    throw new Error("Command kind is not valid");
            }
        }
    }

    public serialize() {
        const commands = this._commands.map((command) =>
            new CommandSerializer().serialize(command),
        );
        const inputs = this._inputs.map((input) => new InputSerializer().serialize(input));

        return { commands, inputs }
    }

    public static deserialize(data: { inputs: Uint8Array[], commands: Uint8Array[] }) {
        const commands = data.commands.map((command) => new CommandSerializer().deserialize(command));
        const inputs = data.inputs.map((input) => new InputSerializer().deserialize(input));

        return { commands, inputs }
    }

    private _addMoveCall(command: MoveCallCommand) {
        for (const key in command.arguments) {
            const arg = command.arguments[key];

            if (!('kind' in arg)) {
                command.arguments[key] = this._addInput(arg);
            }
        }

        this._commands.push(command);
    }

    private _addSplitCoins(command: SplitCoinsCommand) {
        if (!('kind' in command.coin)) {
            command.coin = this._addInput(command.coin);
        }

        for (const key in command.amounts) {
            const arg = command.amounts[key];
            if (!('kind' in arg)) {
                command.amounts[key] = this._addInput(arg);
            }
        }

        this._commands.push(command);
    }

    private _addMergeCoins(command: MergeCoinsCommand) {
        if (!('kind' in command.destination)) {
            command.destination = this._addInput(command.destination);
        }

        for (const key in command.sources) {
            const arg = command.sources[key];
            if (!('kind' in arg)) {
                command.sources[key] = this._addInput(arg);
            }
        }

        this._commands.push(command);
    }

    private _addTransferObjects(command: TransferObjectsCommand) {
        if (!('kind' in command.address)) {
            command.address = this._addInput(command.address);
        }

        for (const key in command.objects) {
            const arg = command.objects[key];
            if (!('kind' in arg)) {
                command.objects[key] = this._addInput(arg);
            }
        }

        this._commands.push(command);
    }

    private _addPublish(command: PublishCommand) {
        this._commands.push(command);
    }

    private _addUpgrade(command: UpgradeCommand) {
        if (!('kind' in command.ticket)) {
            command.ticket = this._addInput(command.ticket);
        }

        this._commands.push(command);
    }

    private _makeMoveVec(command: MakeMoveVecCommand) {
        this._commands.push(command);
    }

    private _addInput(input: Input) {
        const index = this._inputs.length;
        this._inputs.push(input);

        return {
            index,
            kind: ArgumentKind.Input,
        } as InputRef
    }

    private _getVariableName(name: string) {
        if (!this._isVariableName(name)) throw new Error("Invalid variable name");
        return name.split("var:")[1]
    }

    private _isVariableName(name: string) {
        return name.startsWith("var:")
    }

    private _getVariableValue(name: string) {
        if (!this._isVariableName(name)) throw new Error("Invalid variable name");
        const variableName = this._getVariableName(name);
        return this._variables[variableName]
    }

    private _formatArgument(arg: Argument) {
        if (!('kind' in arg)) throw new Error("Invalid argument");
        if (!this._txb) throw new Error("Transaction block is not set");

        if (arg.kind === ArgumentKind.Input) {
            let input = this._inputs[arg.index];
            if (!input) throw new Error("Invalid input index");
            if (input.type == InputType.Pure) {
                return this._txb.pure(input.value)
            }

            return this._txb.object(input.value)
        } else if (arg.kind === ArgumentKind.Result) {
            return this._txResults[arg.index]
        } else if (arg.kind === ArgumentKind.NestedResult) {
            return this._txResults[arg.index][arg.resultIndex]
        } else if (arg.kind == ArgumentKind.VariableArgument) {
            const value = this._getVariableValue(arg.name)
            return typeof value !== "string" ? value : this._txb.pure(value)
        }

        throw new Error("Invalid argument kind")
    }

    private _formatTypeArgument(arg: string | number[]) {
        if (Array.isArray(arg)) {
            return new TextDecoder().decode(Uint8Array.from(arg))
        }

        if (this._isVariableName(arg)) {
            const value = this._getVariableValue(arg)
            if (!value) throw new Error(`Variable '${this._getVariableName(arg)}' value not found`)
            if (typeof value !== "string") throw new Error(`Variable '${this._getVariableName(arg)}' must be a string`)

            return value
        } else {
            return arg
        }

    }

    private _withMoveCall(data: MoveCallCommand) {
        if (!this._txb) throw new Error("Transaction block is not set");

        const args = data.arguments.map(this._formatArgument);
        const typeArgs = data.typeArguments.map(this._formatTypeArgument);

        const { packageId, moduleName, functionName } = data;
        const packageValue = this._isVariableName(packageId) ? this._getVariableValue(packageId) : packageId
        const moduleValue = this._isVariableName(moduleName) ? this._getVariableValue(moduleName) : moduleName
        const functionValue = this._isVariableName(functionName) ? this._getVariableValue(functionName) : functionName

        const result = this._txb.moveCall({
            arguments: args,
            typeArguments: typeArgs,
            target: `${packageValue}::${moduleValue}::${functionValue}`
        })

        this._txResults.push(result)
    }

    private _withMergeCoins(data: MergeCoinsCommand) {
        if (!this._txb) throw new Error("Transaction block is not set");

        const destination = this._formatArgument(data.destination) as TransactionObjectArgument;
        const sources = data.sources.map(this._formatArgument) as TransactionObjectArgument[];

        const result = this._txb.mergeCoins(destination, sources)
        this._txResults.push(result)
    }

    private _withSplitCoins(data: SplitCoinsCommand) {
        if (!this._txb) throw new Error("Transaction block is not set");

        const coin = this._formatArgument(data.coin) as TransactionObjectArgument;
        const amounts = data.amounts.map(this._formatArgument) as TransactionArgument[];

        const result = this._txb.splitCoins(coin, amounts)
        this._txResults.push(result)
    }

    private _withTransferObjects(data: TransferObjectsCommand) {
        if (!this._txb) throw new Error("Transaction block is not set");

        const objects = data.objects.map(this._formatArgument) as TransactionObjectArgument[]
        const address = this._formatArgument(data.address) as TransactionArgument;

        const result = this._txb.transferObjects(objects, address)
        this._txResults.push(result)
    }

    private _withPublish(data: PublishCommand) {
        if (!this._txb) throw new Error("Transaction block is not set");
        const modules = data.modules.map(m => this._isVariableName(m) ? this._getVariableValue(m) as string : m)
        const dependencies = data.dependencies.map(d => this._isVariableName(d) ? this._getVariableValue(d) as string : d)

        const result = this._txb.publish({ modules, dependencies })
        this._txResults.push(result)
    }

    private _withUpgrade(data: UpgradeCommand) {
        if (!this._txb) throw new Error("Transaction block is not set");

        const ticket = this._formatArgument(data.ticket) as TransactionObjectArgument;
        const modules = data.modules.map(m => this._isVariableName(m) ? this._getVariableValue(m) as string : m)
        const dependencies = data.dependencies.map(d => this._isVariableName(d) ? this._getVariableValue(d) as string : d)
        const packageId = this._isVariableName(data.packageId) ? this._getVariableValue(data.packageId) as string : data.packageId

        const result = this._txb.upgrade({ ticket, modules, packageId, dependencies })
        this._txResults.push(result)
    }

    private _withMakeMoveVec(data: MakeMoveVecCommand) {
        if (!this._txb) throw new Error("Transaction block is not set");

        const objects = data.objects.map(this._formatArgument) as TransactionObjectArgument[]
        const type = data.type ? this._formatTypeArgument(data.type) : undefined;

        const result = this._txb.makeMoveVec({ objects, type })
        this._txResults.push(result)
    }
}

export const PTB = ProgrammableTransactionBlock;