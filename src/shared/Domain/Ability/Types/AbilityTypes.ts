import { Janitor } from "@rbxts/janitor";
import type { StatusId } from "shared/Types/GlobalStatusEffectsTypes";

export type IStatusId = StatusId;

export type IAbilityStates = ["Idle", "Casting", "Active", "Holding", "Cooldown", "Locked"][number];

export type IAbilityTypes = [
    "Combat",
    "Support",
    "Defense",
    "Movement",
    "Flying",
    "Ultimate",
    "Other",
][number];

export interface IAbilityType {
    name: IAbilityTypes;
    level: number;
}

export interface IAbilityBehaviour {
    onStartCheck(...args: unknown[]): boolean;
    onEndCheck(...args: unknown[]): boolean;

    onStart(...args: unknown[]): void;
    onEnd(...args: unknown[]): void;
    onInterrupt(...args: unknown[]): void;
    onReject?(...args: unknown[]): void;

    [key: string]: unknown;
}

export interface IAbilityConfig {
    name: string;
    ownerId: string;

    states: IAbilityStates[];
    types: IAbilityType[];

    tags?: string[];

    miscData?: Map<string, unknown>;

    lastUsed: number;

    cooldown: number;
    duration: number;
    minDuration: number;

    manualEnd?: boolean;

    ignoreList?: { id: IStatusId; maxPriority: number }[];
    additionalBlacklist?: IStatusId[];
}

export interface IAbility {
    config: IAbilityConfig;
    behaviours: IAbilityBehaviour;
    _janitor: Janitor;
}

export const IAbilityBlacklist = ["Stun", "Knocked", "Dead", "Knocked", "Loading"] as IStatusId[];
