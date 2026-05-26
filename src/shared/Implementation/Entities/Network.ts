import { Networking } from "@flamework/networking";
import {
    MotorMoveDurations,
    MotorName,
    R15MotorName,
    R6MotorName,
} from "shared/Domain/AnimationsController/Types/AnimatorTypes";
import { AllSoundPaths } from "shared/Utilities/SoundsUtil";
import { EasingDirection, EasingStyle } from "shared/Utilities/TweenMath";

export interface PlugBroadcastData {
    Size: Vector3;
    CFrame: CFrame;
    Material: Enum.Material;
    Color: Color3;
    MaterialVariant: string;
    Transparency: number;
    Reflectance: number;
}

export interface CutterData {
    Size: Vector3;
    CFrame: CFrame;
}

export interface ServerToClientSignals {
    SetupMovementAnimations(ownerId: string, character: Model): void;
    SetupAbility(abilityData: { Path: string; Name: string; KeyCode: string; Type: string }): void;
    Ability(
        abilityName: string,
        abilityType: string,
        method: "Start" | "End" | "Reject" | "Interrupt",
        check?: boolean,
        ...args: unknown[]
    ): void;
    RemoveAbility(abilityName: string): void;

    LaunchVFX(vfx: string, method: string, ...args: unknown[]): void;
    PlaySound(
        sound: AllSoundPaths,
        soundParent: BasePart | ("SFXs" | "Music"),
        playOnce?: boolean,
    ): void;

    MoveMotor(
        character: Model,
        motorName: MotorName,
        targetOffset: CFrame,
        style: EasingStyle,
        direction: EasingDirection,
        durations?: MotorMoveDurations,
        moveName?: string,
    ): void;

    MoveMotorBaseOffset(
        character: Model,
        motorName: MotorName,
        targetBaseOffset: CFrame,
        style: EasingStyle,
        direction: EasingDirection,
        durations?: MotorMoveDurations,
    ): void;

    AtomSync(payload: any): void;
}

export interface ClientToServerSignals {
    Ability(
        abilityName: string,
        abilityType: string,
        method: "Start" | "End" | "Reject" | "Interrupt",
        ...args: unknown[]
    ): void;

    MoveMotor(
        ignorePlayer: boolean,
        character: Model,
        motorName: MotorName,
        targetOffset: CFrame,
        style: EasingStyle,
        direction: EasingDirection,
        durations?: MotorMoveDurations,
        moveName?: string,
    ): void;

    MoveMotorBaseOffset(
        ignorePlayer: boolean,
        character: Model,
        motorName: MotorName,
        targetBaseOffset: CFrame,
        style: EasingStyle,
        direction: EasingDirection,
        durations?: MotorMoveDurations,
    ): void;

    RequestHydrate(): void;
    AtomHydrated(): void;
}

export const GlobalSignals = Networking.createEvent<ClientToServerSignals, ServerToClientSignals>();
