import { Argument, ArgumentKind, InputRef, NestedResult, Result, VariableArgument, } from "../types";
import { bcs, inputRefStruct, nestedResultStruct, resultStruct, variableArgumentStruct, } from "../bcs";

export class ArgumentSerializer {
    public serialize(argument: Argument) {
        if (!('kind' in argument)) {
            throw new Error("Argument kind is not valid");
        }

        switch (argument.kind) {
            case ArgumentKind.Input:
                return this._serializeInput(argument);
            case ArgumentKind.Result:
                return this._serializeResult(argument);
            case ArgumentKind.NestedResult:
                return this._serializeNestedResult(argument);
            case ArgumentKind.VariableArgument:
                return this._serializeVariableArgument(argument);
            default:
                throw new Error("Argument kind is not valid");
        }
    }

    private _serializeInput(argument: InputRef) {
        if (argument.kind !== ArgumentKind.Input) {
            throw new Error("Argument kind is not Input");
        }

        return inputRefStruct
            .serialize({
                kind: argument.kind,
                index: argument.index ?? 0,
            })
            .toBytes();
    }

    private _serializeResult(argument: Result) {
        if (argument.kind !== ArgumentKind.Result) {
            throw new Error("Argument kind is not Result");
        }

        return resultStruct
            .serialize({
                kind: argument.kind,
                index: argument.index,
            })
            .toBytes();
    }

    private _serializeNestedResult(argument: NestedResult) {
        if (argument.kind !== ArgumentKind.NestedResult) {
            throw new Error("Argument kind is not NestedResult");
        }

        return nestedResultStruct
            .serialize({
                kind: argument.kind,
                index: argument.index,
                resultIndex: argument.resultIndex,
            })
            .toBytes();
    }

    private _serializeVariableArgument(argument: VariableArgument) {
        if (argument.kind !== ArgumentKind.VariableArgument) {
            throw new Error("Argument kind is not VariableArgument");
        }

        return variableArgumentStruct
            .serialize({
                kind: argument.kind,
                name: argument.name
            })
            .toBytes();
    }

    public deserialize(data: Uint8Array) {
        let kind = bcs.u64().parse(data);

        switch (Number(kind)) {
            case ArgumentKind.Input:
                return this._deserializeInput(data);
            case ArgumentKind.Result:
                return this._deserializeResult(data);
            case ArgumentKind.NestedResult:
                return this._deserializeNestedResult(data);
            case ArgumentKind.VariableArgument:
                return this._deserializeVariableArgument(data);
            default:
                throw new Error("Argument kind is not valid");
        }
    }

    private _deserializeInput(data: Uint8Array) {
        const output = inputRefStruct.parse(data);

        return {
            kind: ArgumentKind.Input,
            index: Number(output.index),
        } as InputRef;
    }

    private _deserializeResult(data: Uint8Array) {
        const output = resultStruct.parse(data);

        return {
            kind: ArgumentKind.Result,
            index: Number(output.index),
        } as Result;
    }

    private _deserializeNestedResult(data: Uint8Array) {
        const output = nestedResultStruct.parse(data);

        return {
            kind: ArgumentKind.NestedResult,
            index: Number(output.index),
            resultIndex: Number(output.resultIndex),
        } as NestedResult;
    }

    private _deserializeVariableArgument(data: Uint8Array) {
        const output = variableArgumentStruct.parse(data);

        return {
            kind: ArgumentKind.VariableArgument,
            name: output.name,
        } as VariableArgument;
    }
}
