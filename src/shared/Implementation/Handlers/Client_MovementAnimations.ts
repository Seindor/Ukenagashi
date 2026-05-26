import { ReplicatedStorage, Players, RunService } from "@rbxts/services";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { Janitor } from "@rbxts/janitor";
import type { MotionState } from "shared/Domain/Motion/Types/MotionTypes";
import { ParseAliasPath, ParseRobloxAliasPath } from "shared/Utilities/GetObjectFromPath";

let sharedScope = CompositionRootShared.createScope();

const MOVEMENT_STATE_MAP = new Map<string, string>([
    ["Forward", "Walk"],
    ["Backward", "Walk"],
    ["Left", "Walk"],
    ["Right", "Walk"],
    ["ForwardLeft", "Walk"],
    ["ForwardRight", "Walk"],
    ["BackwardLeft", "Walk"],
    ["BackwardRight", "Walk"],
]);

const RUN_SPEED_THRESHOLD = 15;

export class Client_MovementAnimations {
    public animationsPack = ParseRobloxAliasPath(
        "shared.Assets.Animations.Default.Movement",
    ) as Folder;

    public enableAnimations = true as boolean;

    public replicatedStatusEffectsAPI = sharedScope.resolve(
        SharedRegistry.Singletons.API.ReplicatedStatusEffectsAPI,
    );

    private _janitor = new Janitor<any>();
    private _characterJanitor = new Janitor<any>();

    public api = {
        eventBusAPI: sharedScope.resolve(SharedRegistry.Singletons.API.EventBusAPI),
        animationsAPI: sharedScope.resolve(SharedRegistry.Singletons.API.AnimationsAPI),
        motionAPI: sharedScope.resolve(SharedRegistry.Singletons.API.MotionAPI),
    };

    public Init(ownerId: string, _character: Model) {
        let playerBus = this.api.eventBusAPI.New(ownerId, "Player");

        this._janitor.Add(
            task.spawn(() => {
                playerBus.Subscribe(
                    "CharacterLoaded",
                    (character: Model) => {
                        if (character !== _character) return;
                        this._characterJanitor.Cleanup();
                        this.initAnimations(ownerId, character);
                    },
                    undefined,
                    "MovementAnimationsInit",
                );
            }),
            true,
            "MovementAnimationsInitOnStart",
        );

        this._janitor.Add(
            task.spawn(() => {
                playerBus.Subscribe(
                    "ChangeAnimationsPack",
                    (character: Model, _packName: string) => {
                        if (character !== _character) return;
                        this.animationsPack = ParseRobloxAliasPath(_packName) as Folder;
                        this.initAnimations(ownerId, character);
                    },
                    undefined,
                    "ChangeAnimationsPack",
                );
            }),
            true,
            "ChangeAnimationsPackOnStart",
        );
    }

    private resolveMovementState(motionState: MotionState, walkSpeed: number): string {
        if (motionState.IsJumping) return "Jump";
        if (motionState.IsFalling) return "Falling";

        if (motionState.IsMoving) {
            const combinedTag = motionState.Direction3DTags.join("");
            const resolved = MOVEMENT_STATE_MAP.get(combinedTag);

            if (resolved) {
                return motionState.Speed >= RUN_SPEED_THRESHOLD ? "Run" : resolved;
            }
        }

        return "Idle";
    }

    private initAnimations(ownerId: string, character: Model) {
        const humanoid = character.WaitForChild("Humanoid") as Humanoid;
        const humanoidRootPart = character.WaitForChild("HumanoidRootPart") as BasePart;

        this.StopAnimations(ownerId, character);

        const motion = this.api.motionAPI.CreateMotion(
            { RootPart: humanoidRootPart, Humanoid: humanoid },
            ownerId,
            "Motion",
        );

        const animator = this.api.animationsAPI.CreateAnimator(
            { Character: character },
            "Default_Animator",
            ownerId,
        );

        let currentAnimation: string | undefined;
        let jumpLocked = false;

        const playState = (state: string) => {
            const animationName = `Movement_${state}`;

            if (currentAnimation === animationName) return;
            currentAnimation = animationName;

            animator.StopAnimation("Movement", 0.2, true, true, [animationName]);

            const isJump = state === "Jump";

            let animation = this.animationsPack.WaitForChild(state) as Animation;

            let anim = animator.PlayAnimation(
                animation,
                animationName,
                false,
                Enum.AnimationPriority.Movement,
                !isJump,
                undefined,
                undefined,
                undefined,
                isJump
                    ? () => {
                          jumpLocked = false;
                          currentAnimation = undefined;
                      }
                    : undefined,
            );

            if (isJump) jumpLocked = true;
        };

        this._characterJanitor.Add(
            humanoid.Died.Connect(() => {
                this.StopAnimations(ownerId, character);
            }),
            "Disconnect",
            "Death",
        );

        this._characterJanitor.Add(
            RunService.Heartbeat.Connect(() => {
                if (jumpLocked) return;

                const motionState = motion.GetState();
                const state = this.resolveMovementState(motionState, humanoid.WalkSpeed);

                if (this.enableAnimations) {
                    playState(state);
                } else {
                    animator.StopAnimation("Movement", 0, true, true);
                }

                playState(state);
            }),
            "Disconnect",
        );
    }

    private StopAnimations(ownerId: string, charater: Model) {
        this.api.animationsAPI.RemoveActorAnimator(ownerId, "Default_Animator", true, false);
        this.api.motionAPI.RemoveActorMotion(ownerId, "Motion");
        this._characterJanitor.Cleanup();
    }

    private StopAnimationsSafe(ownerId: string, charater: Model) {
        this.api.animationsAPI.RemoveActorAnimator(ownerId, "Default_Animator", true, false);
        this.api.motionAPI.RemoveActorMotion(ownerId, "Motion");
    }
}
