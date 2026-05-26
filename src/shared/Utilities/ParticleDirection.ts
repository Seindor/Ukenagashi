import { Workspace, RunService } from "@rbxts/services";
import { emit } from "@zilibobi/forge-vfx";
import TweenMath, { EasingStyle, EasingDirection } from "shared/Utilities/TweenMath";

export interface SimulatedParticleHit {
    hitPosition?: Vector3;
    hitNormal?: Vector3;
    path: Vector3[];
    direction: Vector3;
}

export interface SimulateParticleParams {
    emitter: ParticleEmitter;
    origin: Vector3;
    lookVector: Vector3;
    maxTime?: number;
    step?: number;
    ignore?: Instance[];
    gravity?: Vector3;
}

interface CurveSettings {
    duration: number;

    style?: EasingStyle;
    direction?: EasingDirection;

    maxArcHeight?: number;
}

interface EmitOnImpactParams extends SimulateParticleParams {
    delay?: number;

    curve: CurveSettings;

    particleToEmit: BasePart;
    trail?: BasePart;
    directionOffset?: Vector3;

    onTrailUpdate?: (trail: BasePart, alpha: number, position: Vector3) => void;
}

function Simulate(params: SimulateParticleParams): SimulatedParticleHit {
    const emitter = params.emitter;

    const maxTime = params.maxTime ?? 5;
    const step = params.step ?? 1 / 60;

    const gravity = params.gravity ?? new Vector3(0, -Workspace.Gravity, 0);

    const speed = emitter.Speed.Min + math.random() * (emitter.Speed.Max - emitter.Speed.Min);

    const spreadX = math.rad((math.random() - 0.5) * emitter.SpreadAngle.X);
    const spreadY = math.rad((math.random() - 0.5) * emitter.SpreadAngle.Y);

    const directionCF = new CFrame(params.origin, params.origin.add(params.lookVector)).mul(
        CFrame.Angles(spreadY, spreadX, 0),
    );

    const direction = directionCF.LookVector.Unit;

    let velocity = direction.mul(speed);
    const acceleration = emitter.Acceleration;

    let position = params.origin;

    const path: Vector3[] = [position];

    const rayParams = new RaycastParams();
    rayParams.FilterType = Enum.RaycastFilterType.Exclude;
    rayParams.FilterDescendantsInstances = params.ignore ?? [];

    let elapsed = 0;

    while (elapsed < maxTime) {
        const previous = position;

        velocity = velocity.add(acceleration.add(gravity).mul(step));
        velocity = velocity.mul(math.max(0, 1 - emitter.Drag * step));

        position = position.add(velocity.mul(step));
        path.push(position);

        const result = Workspace.Raycast(previous, position.sub(previous), rayParams);

        if (result) {
            return {
                hitPosition: result.Position,
                hitNormal: result.Normal,
                path,
                direction,
            };
        }

        elapsed += step;
    }

    return { path, direction };
}

function getCurveAlpha(t: number, style: EasingStyle, direction: EasingDirection): number {
    return TweenMath.Ease(style, direction, t);
}

function arcOffset(alpha: number, height: number): number {
    // параболический всплеск (красивый арк)
    return math.sin(alpha * math.pi) * height;
}

function EmitOnImpact(params: EmitOnImpactParams) {
    const result = Simulate(params);

    if (!result.hitPosition || !result.hitNormal) return result;

    const origin = params.origin;
    const directionOffset = params.directionOffset ?? Vector3.zero;

    const rawTarget = result.hitPosition;

    const target = rawTarget.add(directionOffset);

    const curve = params.curve;

    const delay = params.delay ?? 0;

    const trail = params.trail;
    trail!.Position = origin;

    for (const child of trail!.GetChildren()) {
        if (child.IsA("Trail")) {
            child.Enabled = true;
        }
    }

    const emitter = params.particleToEmit;

    task.delay(delay, () => {
        let elapsed = 0;

        const conn = RunService.Heartbeat.Connect((dt) => {
            const duration = curve.duration;
            elapsed += dt;

            const rawAlpha = math.clamp(elapsed / duration, 0, 1);

            const eased = getCurveAlpha(rawAlpha, curve.style ?? "Quad", curve.direction ?? "Out");

            const basePos = origin.Lerp(target, eased);

            const arcHeight = curve.maxArcHeight ?? 2;
            const finalPos = basePos.add(new Vector3(0, arcOffset(eased, arcHeight), 0));

            /* TRAIL FIX (ВАЖНО) */
            if (trail) {
                // ❗ НОРМАЛЬНЫЙ СТАРТ
                if (elapsed - dt <= dt) {
                    trail.CFrame = new CFrame(origin, target);
                }

                // ❗ ОБНОВЛЕНИЕ
                trail.CFrame = new CFrame(finalPos, finalPos.add(params.lookVector));
            }

            /* IMPACT */
            if (rawAlpha >= 1) {
                conn.Disconnect();

                emitter.CFrame = new CFrame(target, target.add(result.hitNormal!)).mul(
                    CFrame.Angles(math.rad(90), 0, 0),
                );

                emit(emitter);
            }
        });
    });

    return result;
}

/* -------------------------
   EXPORT
--------------------------*/

export const ParticleDirection = {
    Simulate,
    EmitOnImpact,
};
