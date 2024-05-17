import { Input, InputType, ValueType, } from "../types";
import { normalizeSuiAddress } from "@mysten/sui.js/utils";
import { Address, bcs, inputStruct } from "../bcs";

export class InputSerializer {
    public serialize(input: Input) {
        console.log({ input });
        return inputStruct.serialize({
            type: input.type,
            valueType: input.valueType,
            value: (input.type === InputType.Object) ? Address.serialize(input.value).toBytes() : this._serializeValue(input.value, input.valueType!)
        }).toBytes();
    }

    public deserialize(input: Uint8Array) {
        const parsed = inputStruct.parse(input);

        const inputType = Number(parsed.type);
        const valueType = parsed.valueType ? Number(parsed.valueType) : null;

        const value = Uint8Array.from(parsed.value);
        const isObject = inputType === InputType.Object;

        return {
            type: inputType,
            valueType,
            value: isObject ? Address.parse(value) : this._deserializeValue(value, valueType!)
        }
    }

    private _serializeValue(value: any, valueType: ValueType) {
        let output: Uint8Array;
        switch (valueType) {
            case ValueType.U8:
                output = bcs.u8().serialize(value).toBytes();
                break;
            case ValueType.U16:
                output = bcs.u16().serialize(value).toBytes();
                break;
            case ValueType.U32:
                output = bcs.u32().serialize(value).toBytes();
                break;
            case ValueType.U64:
                output = bcs.u64().serialize(value).toBytes();
                break;
            case ValueType.U128:
                output = bcs.u128().serialize(value).toBytes();
                break;
            case ValueType.U256:
                output = bcs.u256().serialize(value).toBytes();
                break;
            case ValueType.Bool:
                output = bcs.bool().serialize(value).toBytes();
                break;
            case ValueType.Address:
                const address = normalizeSuiAddress(value);
                output = Address.serialize(address.substring(2)).toBytes();
                break;
            case ValueType.String:
                output = bcs
                    .string()
                    .serialize(value)
                    .toBytes();
                break;
            case ValueType.VectorU8:
                output = bcs
                    .vector(bcs.u8())
                    .serialize(value)
                    .toBytes();
                break;
            default:
                throw new Error("Value type is not valid");
        }

        return output;
    }

    private _deserializeValue(value: Uint8Array, valueType: ValueType): any {
        switch (valueType) {
            case ValueType.U8:
                return bcs.u8().parse(value);
            case ValueType.U16:
                return bcs.u16().parse(value);
            case ValueType.U32:
                return bcs.u32().parse(value);
            case ValueType.U64:
                return bcs.u64().parse(value);
            case ValueType.U128:
                return bcs.u128().parse(value);
            case ValueType.U256:
                return bcs.u256().parse(value);
            case ValueType.Bool:
                return bcs.bool().parse(value);
            case ValueType.Address:
                return Address.parse(value);
            case ValueType.String:
                return bcs.string().parse(value);
            case ValueType.VectorU8:
                return bcs.vector(bcs.u8()).parse(value);
            default:
                throw new Error("Value type is not valid");
        }
    }
}
