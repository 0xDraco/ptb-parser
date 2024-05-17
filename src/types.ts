export enum CommandKind {
    MoveCall,
    SplitCoins,
    MergeCoins,
    Publish,
    Upgrade,
    TransferObjects,
    MakeMoveVec
}

export enum InputType {
    Pure,
    Object,
}

export enum ArgumentKind {
    Input,
    Result,
    NestedResult,
    VariableArgument
}

export enum ValueType {
    U8,
    U16,
    U32,
    U64,
    U128,
    U256,
    Bool,
    String,
    Address,
    VectorU8,
}

export interface Input {
    type: InputType;
    valueType?: ValueType;
    value: any;
}

export interface InputRef {
    kind: ArgumentKind.Input;
    index: number;
}

export interface Result {
    kind: ArgumentKind.Result;
    index: number;
}

export interface NestedResult {
    kind: ArgumentKind.NestedResult;
    index: number;
    resultIndex: number;
}

export interface VariableArgument {
    kind: ArgumentKind.VariableArgument,
    name: string
}

export type Argument = Input | InputRef | Result | NestedResult | VariableArgument;

export interface MoveCallCommand {
    packageId: string;
    moduleName: string;
    functionName: string;
    arguments: Argument[];
    kind: CommandKind.MoveCall;
    typeArguments: string[] | number[][];
}

export interface SplitCoinsCommand {
    coin: Argument;
    amounts: Argument[];
    kind: CommandKind.SplitCoins;
}

export interface MergeCoinsCommand {
    destination: Argument;
    sources: Argument[];
    kind: CommandKind.MergeCoins;
}

export interface TransferObjectsCommand {
    kind: CommandKind.TransferObjects;
    objects: Argument[];
    address: Argument;
}

export interface PublishCommand {
    kind: CommandKind.Publish;
    modules: string[];
    dependencies: string[];
}

export interface UpgradeCommand {
    kind: CommandKind.Upgrade;
    modules: string[];
    dependencies: string[];
    packageId: string;
    ticket: Argument;
}

export interface MakeMoveVecCommand {
    kind: CommandKind.MakeMoveVec;
    objects: Argument[];
    type?: string;
}

export type Command =
    | MoveCallCommand
    | SplitCoinsCommand
    | MergeCoinsCommand
    | TransferObjectsCommand
    | PublishCommand
    | UpgradeCommand
    | MakeMoveVecCommand;

export interface TransactionSpec {
    inputs: Input[],
    commands: Command[]
}
