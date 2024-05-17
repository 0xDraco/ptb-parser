import {
    ArgumentKind,
    CommandKind,
    CommandType,
    Input,
    InputRef,
    MakeMoveVecCommand,
    MergeCoinsCommand,
    MoveCallCommand,
    PublishCommand,
    SplitCoinsCommand,
    TransferObjectsCommand,
    UpgradeCommand,
} from "../types";
import { CommandSerializer } from "../serializer/command";
import { InputSerializer } from "../serializer/input";

export class CommandBuilder {
    private _inputs: Input[] = [];
    private _commands: CommandType[] = [];

    constructor(commands?: CommandType[]) {
        if (commands) {
            for (const command of commands) {
                this.add(command);
            }
        }
    }

    add(command: CommandType) {
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
        if (!('kind' in command.primary)) {
            command.primary = this._addInput(command.primary);
        }

        for (const key in command.coins) {
            const arg = command.coins[key];
            if (!('kind' in arg)) {
                command.coins[key] = this._addInput(arg);
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

    public get commands(): CommandType[] {
        return this._commands;
    }

    public get inputs(): Input[] {
        return this._inputs;
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

    private _addInput(input: Input) {
        const index = this._inputs.length;
        this._inputs.push(input);

        return {
            index,
            kind: ArgumentKind.Input,
        } as InputRef
    }
}
