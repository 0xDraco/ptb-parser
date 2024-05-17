import {
    CommandKind,
    CommandType,
    MakeMoveVecCommand,
    MergeCoinsCommand,
    MoveCallCommand,
    PublishCommand,
    SplitCoinsCommand,
    TransferObjectsCommand,
    UpgradeCommand,
} from "../types";
import {
    Address,
    bcs,
    makeMoveVecStruct,
    mergeCoinsDataStruct,
    moveCallDataStruct,
    publishStruct,
    splitCoinsDataStruct,
    transferObjectsDataStruct,
    upgradeDataStruct,
} from "../bcs";
import { ArgumentSerializer } from "./argument";

export class CommandSerializer {
    public serialize(command: CommandType) {
        switch (command.kind) {
            case CommandKind.MoveCall:
                return this._serializeMoveCall(command);
            case CommandKind.SplitCoins:
                return this._serializeSplitCoins(command);
            case CommandKind.MergeCoins:
                return this._serializeMergeCoins(command);
            case CommandKind.TransferObjects:
                return this._serializeTransferObjects(command);
            case CommandKind.Publish:
                return this._serializePublish(command);
            case CommandKind.Upgrade:
                return this._serializeUpgrade(command);
            case CommandKind.MakeMoveVec:
                return this._serializeMakeMoveVec(command);
            default:
                throw new Error("Command kind is not valid");
        }
    }

    private _serializeMoveCall(command: MoveCallCommand) {
        const args = command.arguments.map((arg) =>
            new ArgumentSerializer().serialize(arg),
        );
        const typeArgs = command.typeArguments.map((arg) =>
            new TextEncoder().encode(arg as string),
        );

        return moveCallDataStruct
            .serialize({
                kind: command.kind,
                packageId: command.packageId,
                moduleName: command.moduleName,
                functionName: command.functionName,
                arguments: args,
                typeArguments: typeArgs,
            })
            .toBytes();
    }

    private _serializeSplitCoins(command: SplitCoinsCommand) {
        const coin = new ArgumentSerializer().serialize(command.coin);
        const amounts = command.amounts.map((arg) =>
            new ArgumentSerializer().serialize(arg),
        );

        return splitCoinsDataStruct
            .serialize({
                kind: command.kind,
                coin,
                amounts,
            })
            .toBytes();
    }

    private _serializeMergeCoins(command: MergeCoinsCommand) {
        const primary = new ArgumentSerializer().serialize(command.primary);
        const coins = command.coins.map((arg) =>
            new ArgumentSerializer().serialize(arg),
        );

        return mergeCoinsDataStruct
            .serialize({
                kind: command.kind,
                primary,
                coins,
            })
            .toBytes();
    }

    private _serializeTransferObjects(command: TransferObjectsCommand) {
        const address = new ArgumentSerializer().serialize(command.address);
        const objects = command.objects.map((arg) =>
            new ArgumentSerializer().serialize(arg),
        );

        return transferObjectsDataStruct
            .serialize({
                kind: command.kind,
                address,
                objects,
            })
            .toBytes();
    }

    private _serializePublish(command: PublishCommand) {
        const modules = command.modules.map((module) =>
            new TextEncoder().encode(module),
        );
        const dependencies = command.dependencies.map((dependency) =>
            new TextEncoder().encode(dependency),
        );

        return publishStruct
            .serialize({
                kind: command.kind,
                modules,
                dependencies,
            })
            .toBytes();
    }

    private _serializeUpgrade(command: UpgradeCommand) {
        const ticket = new ArgumentSerializer().serialize(command.ticket);
        const modules = command.modules.map((module) =>
            new TextEncoder().encode(module),
        );
        const dependencies = command.dependencies.map((dependency) =>
            new TextEncoder().encode(dependency),
        );

        return upgradeDataStruct
            .serialize({
                kind: command.kind,
                packageId: command.packageId,
                ticket,
                modules,
                dependencies,
            })
            .toBytes();
    }

    private _serializeMakeMoveVec(command: MakeMoveVecCommand) {
        const objects = command.objects.map((arg) =>
            new ArgumentSerializer().serialize(arg),
        );

        return makeMoveVecStruct
            .serialize({
                kind: command.kind,
                type: command.type,
                objects,
            })
            .toBytes();
    }

    public deserialize(data: Uint8Array) {
        let kind = Number(bcs.u64().parse(data));

        switch (kind) {
            case CommandKind.MoveCall:
                return this._deserializeMoveCall(data);
            case CommandKind.SplitCoins:
                return this._deserializeSplitCoins(data);
            case CommandKind.MergeCoins:
                return this._deserializeMergeCoins(data);
            case CommandKind.TransferObjects:
                return this._deserializeTransferObjects(data);
            case CommandKind.Publish:
                return this._deserializePublish(data);
            case CommandKind.Upgrade:
                return this._deserializeUpgrade(data);
            case CommandKind.MakeMoveVec:
                return this._deserializeMakeMoveVec(data);
            default:
                throw new Error("Command kind is not valid");
        }
    }

    private _deserializeMoveCall(data: Uint8Array) {
        const output = moveCallDataStruct.parse(data);

        return {
            kind: CommandKind.MoveCall,
            packageId: output.packageId,
            moduleName: output.moduleName,
            functionName: output.functionName,
            arguments: output.arguments.map((arg) =>
                new ArgumentSerializer().deserialize(Uint8Array.from(arg)),
            ),
            typeArguments: output.typeArguments.map((arg) =>
                new TextDecoder().decode(Uint8Array.from(arg)),
            ),
        } as MoveCallCommand;
    }

    private _deserializeSplitCoins(data: Uint8Array) {
        const output = splitCoinsDataStruct.parse(data);

        return {
            kind: CommandKind.SplitCoins,
            coin: new ArgumentSerializer().deserialize(Uint8Array.from(output.coin)),
            amounts: output.amounts.map((arg) =>
                new ArgumentSerializer().deserialize(Uint8Array.from(arg)),
            ),
        } as SplitCoinsCommand;
    }

    private _deserializeMergeCoins(data: Uint8Array) {
        const output = mergeCoinsDataStruct.parse(data);

        return {
            kind: CommandKind.MergeCoins,
            primary: new ArgumentSerializer().deserialize(
                Uint8Array.from(output.primary),
            ),
            coins: output.coins.map((arg) =>
                new ArgumentSerializer().deserialize(Uint8Array.from(arg)),
            ),
        } as MergeCoinsCommand;
    }

    private _deserializeTransferObjects(data: Uint8Array) {
        const output = transferObjectsDataStruct.parse(data);

        return {
            kind: CommandKind.TransferObjects,
            address: new ArgumentSerializer().deserialize(
                Uint8Array.from(output.address),
            ),
            objects: output.objects.map((arg) =>
                new ArgumentSerializer().deserialize(Uint8Array.from(arg)),
            ),
        } as TransferObjectsCommand;
    }

    private _deserializePublish(data: Uint8Array) {
        const output = publishStruct.parse(data);

        return {
            kind: CommandKind.Publish,
            modules: output.modules.map((module) =>
                new TextDecoder().decode(Uint8Array.from(module)),
            ),
            dependencies: output.dependencies.map((dependency) =>
                new TextDecoder().decode(Uint8Array.from(dependency)),
            ),
        } as PublishCommand;
    }

    private _deserializeUpgrade(data: Uint8Array) {
        const output = upgradeDataStruct.parse(data);

        return {
            kind: CommandKind.Upgrade,
            packageId: output.packageId,
            ticket: new ArgumentSerializer().deserialize(
                Uint8Array.from(output.ticket),
            ),
            modules: output.modules.map((module) =>
                new TextDecoder().decode(Uint8Array.from(module)),
            ),
            dependencies: output.dependencies.map((dependency) =>
                new TextDecoder().decode(Uint8Array.from(dependency)),
            ),
        } as UpgradeCommand;
    }

    private _deserializeMakeMoveVec(data: Uint8Array) {
        const output = makeMoveVecStruct.parse(data);

        return {
            kind: CommandKind.MakeMoveVec,
            type: output.type,
            objects: output.objects.map((arg) =>
                new ArgumentSerializer().deserialize(Uint8Array.from(arg)),
            )
        } as MakeMoveVecCommand;
    }
}
