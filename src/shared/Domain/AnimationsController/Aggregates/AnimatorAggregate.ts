import { RunService } from "@rbxts/services";
import { AnimatorProperties } from "../Types/AnimatorTypes";
import TweenMath from "shared/Utilities/TweenMath";
import type { EasingDirection, EasingStyle } from "shared/Utilities/TweenMath";
import type {
    ActiveMotorMove,
    AxisDurations,
    MotorMoveDurations,
    MotorName,
    MotorOffsetState,
} from "../Types/AnimatorTypes";

export class AnimatorAggregate {
    public character: Model;
    public animator: Animator;

    public animationsTracks = new Map<string, AnimationTrack>();

    private animationCache = new Map<string, AnimationTrack>();

    private motorOffsets = new Map<MotorName, MotorOffsetState>();
    private activeMotorMoves = new Map<string, ActiveMotorMove>();

    constructor(animatorProperties: AnimatorProperties) {
        this.character = animatorProperties.Character;

        const humanoid = this.character.FindFirstChildOfClass("Humanoid");
        assert(humanoid, "Humanoid was not found in character.");

        if (animatorProperties.AnimatorName) {
            const newAnimator = new Instance("Animator");
            newAnimator.Name = animatorProperties.AnimatorName;
            newAnimator.Parent = humanoid;
            this.animator = newAnimator;
        } else {
            const animator = humanoid.FindFirstChildOfClass("Animator");
            assert(animator, "Animator was not found in humanoid.");
            this.animator = animator;
        }
    }

    private matchesName(
        name: string,
        target: string,
        allowPartialMatch: boolean,
        ignoredNames?: string[],
    ): boolean {
        if (ignoredNames) {
            for (const ignoredName of ignoredNames) {
                if (ignoredName === name) {
                    return false;
                }
            }
        }

        if (allowPartialMatch) {
            return name.find(target) !== undefined;
        }

        return name === target;
    }

    public HasAnimation(
        animationName: string,
        allowPartialMatch = false,
        findAll = false,
        ignoredNames?: string[],
    ): boolean | Array<AnimationTrack> {
        const matchedTracks = new Array<AnimationTrack>();

        for (const [name, track] of this.animationsTracks) {
            const matches = this.matchesName(name, animationName, allowPartialMatch, ignoredNames);

            if (!matches) continue;

            if (!findAll) {
                return true;
            }

            matchedTracks.push(track);
        }

        return findAll ? matchedTracks : false;
    }

    public GetAnimation(
        animationName: string,
        allowPartialMatch = false,
        findAll = false,
        ignoredNames?: string[],
    ): AnimationTrack | Array<AnimationTrack> | undefined {
        const matchedTracks = new Array<AnimationTrack>();

        for (const [name, track] of this.animationsTracks) {
            const matches = this.matchesName(name, animationName, allowPartialMatch, ignoredNames);

            if (!matches) continue;

            if (!findAll) {
                return track;
            }

            matchedTracks.push(track);
        }

        return findAll ? matchedTracks : undefined;
    }

    public PreloadAnimation(animation: Animation): AnimationTrack {
        const animationId = animation.AnimationId;

        const cached = this.animationCache.get(animationId);
        if (cached) {
            return cached;
        }

        const track = this.animator.LoadAnimation(animation);

        track.Priority = Enum.AnimationPriority.Action;

        this.animationCache.set(animationId, track);

        return track;
    }

    public PlayAnimation(
        animation: Animation,
        animationName: string,
        overwrite = true as boolean,
        animationPriority?: Enum.AnimationPriority,
        looped?: boolean,
        fadeTime?: number,
        weight?: number,
        speed?: number,
        onStopped?: () => void,
    ): AnimationTrack {
        const existingTrack = this.animationsTracks.get(animationName);

        if (existingTrack) {
            if (!overwrite) {
                return existingTrack;
            }

            existingTrack.Stop(0);
            this.animationsTracks.delete(animationName);
        }

        const animationId = animation.AnimationId;

        let animationTrack = this.animationCache.get(animationId);

        if (!animationTrack) {
            animationTrack = this.animator.LoadAnimation(animation);
            this.animationCache.set(animationId, animationTrack);
        }

        animationTrack.Priority = animationPriority ?? animationTrack.Priority;
        animationTrack.Looped = looped ?? animationTrack.Looped;

        animationTrack.Stopped.Once(() => {
            if (this.animationsTracks.get(animationName) === animationTrack) {
                this.animationsTracks.delete(animationName);
            }

            if (onStopped) {
                onStopped();
            }
        });

        animationTrack.TimePosition = 0;

        let playingFadeTime = fadeTime ?? 0.15;

        animationTrack.Play(playingFadeTime, weight ?? 1, speed ?? 1);

        animationTrack.AdjustSpeed(
            ((animation.GetAttribute("Speed") as number) ?? 1) * (speed ?? 1),
        );

        this.animationsTracks.set(animationName, animationTrack);

        return animationTrack;
    }

    public StopAnimation(
        animationName: string,
        fadeTime = 0.1,
        allowPartialMatch = false,
        findAll = false,
        ignoredNames?: string[],
    ) {
        const matchedNames = new Array<string>();

        for (const [name] of this.animationsTracks) {
            const matches = this.matchesName(name, animationName, allowPartialMatch, ignoredNames);

            if (!matches) continue;

            matchedNames.push(name);

            if (!findAll) {
                break;
            }
        }

        for (const name of matchedNames) {
            const track = this.animationsTracks.get(name);
            if (!track) continue;

            track.Stop(fadeTime);
            this.animationsTracks.delete(name);
        }
    }

    private applyMotorC0(state: MotorOffsetState) {
        state.motor.C0 = state.baseC0.mul(state.baseOffset).mul(state.currentOffset);
    }

    private getMotorState(motorName: MotorName): MotorOffsetState | undefined {
        const cached = this.motorOffsets.get(motorName);
        if (cached) {
            return cached;
        }

        for (const descendant of this.character.GetDescendants()) {
            if (descendant.IsA("Motor6D") && descendant.Name === motorName) {
                const state: MotorOffsetState = {
                    motor: descendant,
                    baseC0: descendant.C0,
                    baseOffset: new CFrame(),
                    currentOffset: new CFrame(),
                };

                this.motorOffsets.set(motorName, state);
                return state;
            }
        }

        return undefined;
    }

    private disconnectMotorTween(state: MotorOffsetState) {
        if (state.activeConnection) {
            state.activeConnection.Disconnect();
            state.activeConnection = undefined;
        }
    }

    private getAxisDuration(
        axisDurations: AxisDurations | undefined,
        index: 0 | 1 | 2,
        fallback: number,
    ): number {
        if (!axisDurations) return fallback;

        const value = axisDurations[index];
        return value !== undefined ? value : fallback;
    }

    private buildOffsetFromComponents(position: Vector3, rotation: Vector3): CFrame {
        return new CFrame(position).mul(CFrame.Angles(rotation.X, rotation.Y, rotation.Z));
    }

    private generateMoveName(motorName: MotorName): string {
        return `${motorName}_${this.activeMotorMoves.size() + 1}`;
    }

    private unregisterMoveByName(moveName: string) {
        if (this.activeMotorMoves.has(moveName)) {
            this.activeMotorMoves.delete(moveName);
        }
    }

    private setActiveMove(
        state: MotorOffsetState,
        motorName: MotorName,
        moveName?: string,
    ): string {
        const resolvedMoveName = moveName ?? this.generateMoveName(motorName);

        if (state.activeMoveName) {
            this.unregisterMoveByName(state.activeMoveName);
        }

        state.activeMoveName = resolvedMoveName;

        this.activeMotorMoves.set(resolvedMoveName, {
            name: resolvedMoveName,
            motorName,
            state,
        });

        return resolvedMoveName;
    }

    public GetMotorBaseOffset(motorName: MotorName): CFrame | undefined {
        const state = this.getMotorState(motorName);
        return state?.baseOffset;
    }

    public SetMotorBaseOffset(motorName: MotorName, targetBaseOffset: CFrame): boolean {
        const state = this.getMotorState(motorName);
        if (!state) {
            warn(`Motor6D "${motorName}" was not found.`);
            return false;
        }

        state.baseOffset = targetBaseOffset;
        this.applyMotorC0(state);

        return true;
    }

    public ResetMotorBaseOffset(motorName: MotorName): boolean {
        return this.SetMotorBaseOffset(motorName, new CFrame());
    }

    public SetMotorOffset(motorName: MotorName, targetOffset: CFrame, moveName?: string): boolean {
        const state = this.getMotorState(motorName);
        if (!state) {
            warn(`Motor6D "${motorName}" was not found.`);
            return false;
        }

        this.disconnectMotorTween(state);
        this.setActiveMove(state, motorName, moveName);

        state.currentOffset = targetOffset;
        this.applyMotorC0(state);

        return true;
    }

    public MoveMotorBaseOffset(
        motorName: MotorName,
        targetBaseOffset: CFrame,
        style: EasingStyle = "Linear",
        direction: EasingDirection = "In",
        durations?: MotorMoveDurations,
    ): boolean {
        const state = this.getMotorState(motorName);
        if (!state) {
            warn(`Motor6D "${motorName}" was not found.`);
            return false;
        }

        const startOffset = state.baseOffset;

        const startPosition = startOffset.Position;
        const targetPosition = targetBaseOffset.Position;

        const [startRotX, startRotY, startRotZ] = startOffset.ToOrientation();
        const [targetRotX, targetRotY, targetRotZ] = targetBaseOffset.ToOrientation();

        const positionDurations = durations?.Position;
        const rotationDurations = durations?.Rotation;

        const pxTime = this.getAxisDuration(positionDurations, 0, 0);
        const pyTime = this.getAxisDuration(positionDurations, 1, 0);
        const pzTime = this.getAxisDuration(positionDurations, 2, 0);

        const rxTime = this.getAxisDuration(rotationDurations, 0, 0.15);
        const ryTime = this.getAxisDuration(rotationDurations, 1, 0.15);
        const rzTime = this.getAxisDuration(rotationDurations, 2, 0.15);

        let pxElapsed = 0;
        let pyElapsed = 0;
        let pzElapsed = 0;

        let rxElapsed = 0;
        let ryElapsed = 0;
        let rzElapsed = 0;

        const getAlpha = (elapsed: number, duration: number) => {
            if (duration <= 0) return 1;
            return math.clamp(elapsed / duration, 0, 1);
        };

        const connection = RunService.Heartbeat.Connect((dt) => {
            pxElapsed += dt;
            pyElapsed += dt;
            pzElapsed += dt;

            rxElapsed += dt;
            ryElapsed += dt;
            rzElapsed += dt;

            const px = TweenMath.Lerp(
                startPosition.X,
                targetPosition.X,
                getAlpha(pxElapsed, pxTime),
                style,
                direction,
            );
            const py = TweenMath.Lerp(
                startPosition.Y,
                targetPosition.Y,
                getAlpha(pyElapsed, pyTime),
                style,
                direction,
            );
            const pz = TweenMath.Lerp(
                startPosition.Z,
                targetPosition.Z,
                getAlpha(pzElapsed, pzTime),
                style,
                direction,
            );

            const rx = TweenMath.Lerp(
                startRotX,
                targetRotX,
                getAlpha(rxElapsed, rxTime),
                style,
                direction,
            );
            const ry = TweenMath.Lerp(
                startRotY,
                targetRotY,
                getAlpha(ryElapsed, ryTime),
                style,
                direction,
            );
            const rz = TweenMath.Lerp(
                startRotZ,
                targetRotZ,
                getAlpha(rzElapsed, rzTime),
                style,
                direction,
            );

            state.baseOffset = this.buildOffsetFromComponents(
                new Vector3(px, py, pz),
                new Vector3(rx, ry, rz),
            );

            this.applyMotorC0(state);

            const finished =
                getAlpha(pxElapsed, pxTime) >= 1 &&
                getAlpha(pyElapsed, pyTime) >= 1 &&
                getAlpha(pzElapsed, pzTime) >= 1 &&
                getAlpha(rxElapsed, rxTime) >= 1 &&
                getAlpha(ryElapsed, ryTime) >= 1 &&
                getAlpha(rzElapsed, rzTime) >= 1;

            if (finished) {
                connection.Disconnect();
            }
        });

        return true;
    }

    public MoveMotor(
        motorName: MotorName,
        targetOffset: CFrame,
        style: EasingStyle = "Linear",
        direction: EasingDirection = "In",
        durations?: MotorMoveDurations,
        moveName?: string,
    ): boolean {
        const state = this.getMotorState(motorName);
        if (!state) {
            warn(`Motor6D "${motorName}" was not found.`);
            return false;
        }

        this.disconnectMotorTween(state);
        this.setActiveMove(state, motorName, moveName);

        const startOffset = state.currentOffset;

        const startPosition = startOffset.Position;
        const targetPosition = targetOffset.Position;

        const [startRotX, startRotY, startRotZ] = startOffset.ToOrientation();
        const [targetRotX, targetRotY, targetRotZ] = targetOffset.ToOrientation();

        const positionDurations = durations?.Position;
        const rotationDurations = durations?.Rotation;

        const pxTime = this.getAxisDuration(positionDurations, 0, 0);
        const pyTime = this.getAxisDuration(positionDurations, 1, 0);
        const pzTime = this.getAxisDuration(positionDurations, 2, 0);

        const rxTime = this.getAxisDuration(rotationDurations, 0, 0.15);
        const ryTime = this.getAxisDuration(rotationDurations, 1, 0.15);
        const rzTime = this.getAxisDuration(rotationDurations, 2, 0.15);

        let pxElapsed = 0;
        let pyElapsed = 0;
        let pzElapsed = 0;

        let rxElapsed = 0;
        let ryElapsed = 0;
        let rzElapsed = 0;

        const getAlpha = (elapsed: number, duration: number) => {
            if (duration <= 0) return 1;
            return math.clamp(elapsed / duration, 0, 1);
        };

        const update = () => {
            const px = TweenMath.Lerp(
                startPosition.X,
                targetPosition.X,
                getAlpha(pxElapsed, pxTime),
                style,
                direction,
            );
            const py = TweenMath.Lerp(
                startPosition.Y,
                targetPosition.Y,
                getAlpha(pyElapsed, pyTime),
                style,
                direction,
            );
            const pz = TweenMath.Lerp(
                startPosition.Z,
                targetPosition.Z,
                getAlpha(pzElapsed, pzTime),
                style,
                direction,
            );

            const rx = TweenMath.Lerp(
                startRotX,
                targetRotX,
                getAlpha(rxElapsed, rxTime),
                style,
                direction,
            );
            const ry = TweenMath.Lerp(
                startRotY,
                targetRotY,
                getAlpha(ryElapsed, ryTime),
                style,
                direction,
            );
            const rz = TweenMath.Lerp(
                startRotZ,
                targetRotZ,
                getAlpha(rzElapsed, rzTime),
                style,
                direction,
            );

            const nextOffset = this.buildOffsetFromComponents(
                new Vector3(px, py, pz),
                new Vector3(rx, ry, rz),
            );

            state.currentOffset = nextOffset;
            this.applyMotorC0(state);
        };

        update();

        state.activeConnection = RunService.Heartbeat.Connect((dt) => {
            pxElapsed += dt;
            pyElapsed += dt;
            pzElapsed += dt;

            rxElapsed += dt;
            ryElapsed += dt;
            rzElapsed += dt;

            update();

            const finished =
                getAlpha(pxElapsed, pxTime) >= 1 &&
                getAlpha(pyElapsed, pyTime) >= 1 &&
                getAlpha(pzElapsed, pzTime) >= 1 &&
                getAlpha(rxElapsed, rxTime) >= 1 &&
                getAlpha(ryElapsed, ryTime) >= 1 &&
                getAlpha(rzElapsed, rzTime) >= 1;

            if (finished) {
                this.disconnectMotorTween(state);
            }
        });

        return true;
    }

    public StopMotorMove(
        moveName: string,
        fadeTime = 0.1,
        allowPartialMatch = false,
        findAll = false,
    ) {
        const matchedMoveNames = new Array<string>();

        for (const [name] of this.activeMotorMoves) {
            const matches = allowPartialMatch
                ? name.find(moveName)[0] !== undefined
                : name === moveName;

            if (!matches) continue;

            matchedMoveNames.push(name);

            if (!findAll) {
                break;
            }
        }

        for (const name of matchedMoveNames) {
            const activeMove = this.activeMotorMoves.get(name);
            if (!activeMove) continue;

            const state = activeMove.state;

            this.disconnectMotorTween(state);

            const currentOffset = state.currentOffset;
            const currentPosition = currentOffset.Position;
            const [currentRotX, currentRotY, currentRotZ] = currentOffset.ToOrientation();

            let elapsed = 0;

            state.activeConnection = RunService.Heartbeat.Connect((dt) => {
                elapsed += dt;
                const alpha = fadeTime <= 0 ? 1 : math.clamp(elapsed / fadeTime, 0, 1);

                const px = TweenMath.Lerp(currentPosition.X, 0, alpha, "Linear", "In");
                const py = TweenMath.Lerp(currentPosition.Y, 0, alpha, "Linear", "In");
                const pz = TweenMath.Lerp(currentPosition.Z, 0, alpha, "Linear", "In");

                const rx = TweenMath.Lerp(currentRotX, 0, alpha, "Linear", "In");
                const ry = TweenMath.Lerp(currentRotY, 0, alpha, "Linear", "In");
                const rz = TweenMath.Lerp(currentRotZ, 0, alpha, "Linear", "In");

                const nextOffset = this.buildOffsetFromComponents(
                    new Vector3(px, py, pz),
                    new Vector3(rx, ry, rz),
                );

                state.currentOffset = nextOffset;
                this.applyMotorC0(state);

                if (alpha >= 1) {
                    this.disconnectMotorTween(state);
                    state.currentOffset = new CFrame();
                    this.applyMotorC0(state);

                    if (state.activeMoveName === name) {
                        state.activeMoveName = undefined;
                    }

                    this.unregisterMoveByName(name);
                }
            });
        }
    }

    public ResetMotor(
        motorName: MotorName,
        style: EasingStyle = "Linear",
        direction: EasingDirection = "In",
        durations?: MotorMoveDurations,
        moveName?: string,
    ): boolean {
        return this.MoveMotor(motorName, new CFrame(), style, direction, durations, moveName);
    }

    public ResetAllMotors(
        style: EasingStyle = "Linear",
        direction: EasingDirection = "In",
        durations?: MotorMoveDurations,
    ) {
        const motorNames = new Array<MotorName>();

        for (const [motorName] of this.motorOffsets) {
            motorNames.push(motorName);
        }

        for (const motorName of motorNames) {
            this.ResetMotor(motorName, style, direction, durations);
        }
    }

    public ResetAllMotorBaseOffsets() {
        for (const [, state] of this.motorOffsets) {
            state.baseOffset = new CFrame();
            this.applyMotorC0(state);
        }
    }

    public StopAllAnimations(fadeTime = 0.15) {
        const animationNames = new Array<string>();

        for (const [name] of this.animationsTracks) {
            animationNames.push(name);
        }

        for (const name of animationNames) {
            const track = this.animationsTracks.get(name);
            if (!track) continue;

            track.Stop(fadeTime);
            this.animationsTracks.delete(name);
        }
    }

    public Destroy(stopAnimations?: boolean, destroyAnimator = true) {
        if (stopAnimations) {
            const animationNames = new Array<string>();

            for (const [name] of this.animationsTracks) {
                animationNames.push(name);
            }

            for (const name of animationNames) {
                this.animationsTracks.get(name)?.Stop(0.15);
                this.animationsTracks.delete(name);
            }
        }

        for (const [, track] of this.animationCache) {
            track.Destroy();
        }

        this.animationCache.clear();

        const activeMoveNames = new Array<string>();

        for (const [name] of this.activeMotorMoves) {
            activeMoveNames.push(name);
        }

        for (const name of activeMoveNames) {
            const activeMove = this.activeMotorMoves.get(name);
            if (!activeMove) continue;

            this.disconnectMotorTween(activeMove.state);
            this.unregisterMoveByName(name);
        }

        for (const [, state] of this.motorOffsets) {
            state.baseOffset = new CFrame();
            state.currentOffset = new CFrame();
            state.activeMoveName = undefined;
            state.motor.C0 = state.baseC0;
        }

        this.activeMotorMoves.clear();

        if (destroyAnimator) {
            this.animator.Destroy();
        }
    }
}
