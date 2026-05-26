import { Players, Workspace } from "@rbxts/services";

import { Dependency } from "@flamework/core";
import { ServerSignals } from "shared/Implementation/Entities/SerrverSignals";
import { StatusEffectsReplication } from "server/Application/StatusEffectsReplication";
import { IAbilityBlacklist } from "shared/Domain/Ability/Types/AbilityTypes";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { CompositionRootServer } from "server/DI/CompositionRootServer";
import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { AllSoundPaths } from "shared/Utilities/SoundsUtil";
import { PingUitl } from "shared/Utilities/PingUtil";
import { StepRunner } from "server/Application/StepRunner";
import { Sekiro_M1_HitContext } from "server/Implementation/Handlers/Combat/Sekiro/Sekiro_M1";

const sharedScope = CompositionRootShared.createScope();
const serverScope = CompositionRootServer.createScope();

const abilityAPI = sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI);
const entitiesStorageAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EntitiesStorageAPI);
const statusEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI);
const hitboxAPI = sharedScope.resolve(SharedRegistry.Singletons.API.HitboxAPI);
const eventBusAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EventBusAPI);
const phaseResolverAPI = sharedScope.resolve(SharedRegistry.Singletons.API.PhaseResolverAPI);
const solverAPI = sharedScope.resolve(SharedRegistry.Singletons.API.SolverAPI);

const timings = {
    Equipped: {
        M1_1: {
            duration: 0.5,
            cooldown: 0.583,
            events: {
                ["mark"]: 0.25,
                ["swingreg"]: 0.333,
                ["swingend"]: 0.5,
                ["hitreg"]: 0.416,
                ["hitend"]: 0.5,
            },
        },
        M1_2: {
            duration: 0.5,
            cooldown: 0.583,
            events: {
                ["mark"]: 0.216,
                ["swingreg"]: 0.316,
                ["swingend"]: 0.5,
                ["hitreg"]: 0.383,
                ["hitend"]: 0.45,
            },
        },
        M1_3: {
            duration: 0.5,
            cooldown: 0.583,
            events: {
                ["mark"]: 0.216,
                ["swingreg"]: 0.316,
                ["swingend"]: 0.5,
                ["hitreg"]: 0.416,
                ["hitend"]: 0.466,
            },
        },
        M1_4: {
            duration: 0.5,
            cooldown: 1.5,
            events: {
                ["mark"]: 0.25,
                ["swingreg"]: 0.316,
                ["swingend"]: 0.5,
                ["hitreg"]: 0.4,
                ["hitend"]: 0.45,
            },
        },
    },
    Unequipped: {
        M1_1: {
            duration: 0.5,
            cooldown: 0.583,
            events: {
                ["mark"]: 0.33,
                ["swingreg"]: 0.35,
                ["swingend"]: 0.5,
                ["hitreg"]: 0.35,
                ["hitend"]: 0.416,
            },
        },
        M1_2: {
            duration: 0.5,
            cooldown: 0.583,
            events: {
                ["mark"]: 0.216,
                ["swingreg"]: 0.316,
                ["swingend"]: 0.5,
                ["hitreg"]: 0.383,
                ["hitend"]: 0.45,
            },
        },
        M1_3: {
            duration: 0.5,
            cooldown: 0.583,
            events: {
                ["mark"]: 0.216,
                ["swingreg"]: 0.316,
                ["swingend"]: 0.5,
                ["hitreg"]: 0.416,
                ["hitend"]: 0.466,
            },
        },
        M1_4: {
            duration: 0.5,
            cooldown: 1.5,
            events: {
                ["mark"]: 0.25,
                ["swingreg"]: 0.316,
                ["swingend"]: 0.5,
                ["hitreg"]: 0.4,
                ["hitend"]: 0.45,
            },
        },
    },
};

export function M1(ownerId: string) {
    let statusEffectsReplication = Dependency<StatusEffectsReplication>();

    const stepRunner = Dependency<StepRunner>();

    let ability = abilityAPI.Create(
        {
            name: "Sekiro_M1",
            ownerId,
            states: ["Idle"],
            additionalBlacklist: ["Dash", "Block"],
            lastUsed: 0,
            types: [{ name: "Combat", level: 1 }],
            cooldown: 0.5,
            duration: 0.5,
            minDuration: 0,
            miscData: new Map<string, unknown>(),
        },
        {
            onStartCheck() {
                if (
                    statusEffectsAPI.CheckStatuses(
                        ownerId,
                        ability.GetBlacklist(),
                        ability.config.ignoreList ?? [],
                    )
                ) {
                    return false;
                }

                return true;
            },
            onEndCheck() {
                return true;
            },
            onStart(equippedWeapon: boolean) {
                let weaponClickStatus = statusEffectsAPI.CreateStatus(
                    "WeaponCurrentClick",
                    {
                        duration: 2,
                        maxStacks: 4,
                        stackingPolicy: "Add",
                        stackBehavior: "Cycle",
                    },
                    undefined,
                    ownerId,
                );

                weaponClickStatus = statusEffectsAPI.AddStatus(ownerId, weaponClickStatus);

                const currentClick = weaponClickStatus.stacks!;
                let timingPack = equippedWeapon ? "Equipped" : "Unequipped";
                let timing =
                    timings[timingPack as keyof typeof timings][
                        `M1_${currentClick}` as keyof typeof timings.Equipped
                    ];

                const entity = entitiesStorageAPI.GetEntity(ownerId)!;
                const character = entity.entity as Model;
                const humanoidRootPart = character.FindFirstChild("HumanoidRootPart") as BasePart;

                let ownerPing = PingUitl.GetRealPing(ownerId);

                let clampedOwnerPing = PingUitl.GetFixedPing(ownerId);

                statusEffectsAPI.Subscribe(
                    ownerId,
                    [
                        { status: "Stun", event: "Added" },
                        { status: "Dodge", event: "Added" },
                        { status: "Block", event: "Added" },
                    ],
                    () => {
                        ability.Interrupt(currentClick, ownerPing);

                        statusEffectsAPI.Unsubscribe(ownerId, `M1_Statuses_Subscribe`);
                    },
                    `M1_Statuses_Subscribe`,
                );

                statusEffectsAPI.CreateStatus(
                    "WeaponClick",
                    { duration: timing.duration },
                    true,
                    ownerId,
                );

                entity.miscData.set("LastLaunchedVFX", [
                    "Sekiro",
                    "M1",
                    ownerId,
                    character,
                    currentClick,
                    Workspace.GetServerTimeNow(),
                    ownerPing,
                    timings,
                ]);

                if (Players.GetPlayerFromCharacter(character)) {
                    ServerSignals.LaunchVFX.except(
                        Players.GetPlayerFromCharacter(character)!,
                        "Sekiro",
                        "M1",
                        ownerId,
                        character,
                        currentClick,
                        Workspace.GetServerTimeNow(),
                        ownerPing,
                        timings,
                    );
                } else {
                    ServerSignals.LaunchVFX.broadcast(
                        "Sekiro",
                        "M1",
                        ownerId,
                        character,
                        currentClick,
                        Workspace.GetServerTimeNow(),
                        ownerPing,
                        timings,
                    );
                }

                ability._janitor.Add(
                    task.delay(timing.events.hitreg, () => {
                        let hitbox = hitboxAPI.Create(
                            `${ownerId}_M1_${currentClick}_Hitbox`,
                            humanoidRootPart,
                            {
                                lifetime: math.huge,
                                hitCooldown: math.huge,
                                shape: "Block",
                                size: new Vector3(10, 10, 10),
                                offset: new CFrame(0, 0, -3),
                                debug: false,
                                filterType: Enum.RaycastFilterType.Exclude,
                                filter: [character],

                                hitCheck: (target: Instance) => {
                                    if (
                                        statusEffectsAPI.CheckStatuses(
                                            ownerId,
                                            ability.GetBlacklist(),
                                            ability.config.ignoreList ?? [],
                                        )
                                    ) {
                                        return false;
                                    }

                                    if (!target.FindFirstChild("HumanoidRootPart")) {
                                        return false;
                                    }

                                    if (entitiesStorageAPI.GetEntity(target)) {
                                        return true;
                                    }
                                    return false;
                                },

                                onHit: (target: Instance) => {
                                    const targetEntity = entitiesStorageAPI.GetEntity(target)!;
                                    const targetId = targetEntity.id;

                                    // Считаем урон через solver
                                    const solver = solverAPI.GetSolver(`Damage_Solver_${ownerId}`)!;
                                    solver.SetSolverNumber({
                                        sourceId: "M1_Base",
                                        phaseName: "Flat",
                                        value: 5,
                                        tags: ["M1"],
                                    });

                                    const ownerBus = eventBusAPI.Get(ownerId, "Combat");
                                    ownerBus.FireSync("PreDamageDeal", 1, false, solver);

                                    const finalDamage = solver.CalculateValue(0);
                                    solver.RemoveSolverNumber("M1_Base");

                                    // Контекст удара
                                    const hitCtx: Sekiro_M1_HitContext = {
                                        damage: finalDamage,
                                        ownerId,
                                        targetId,
                                        currentClick,
                                        tags: ["M1", "Melee"],
                                        miscData: new Map(),
                                    };

                                    // Пассивки цели могут изменить контекст
                                    const targetBus = eventBusAPI.Get(targetId, "Combat");
                                    targetBus.FireSync("PreDamageTake", 1, false, hitCtx);

                                    // PhaseResolver решает что произошло
                                    const hitResolver =
                                        phaseResolverAPI.GetResolver<Sekiro_M1_HitContext>(
                                            targetId,
                                            "Sekiro_M1_HitResolution",
                                        )!;

                                    stepRunner.Run(
                                        { stepType: "PVP", ownerId, targetId },
                                        (emit) => {
                                            hitResolver.Resolve(hitCtx, emit);
                                        },
                                    );
                                },
                            },
                        );

                        task.delay(
                            timing.events.hitend - timing.events.hitreg + clampedOwnerPing,
                            () => {
                                hitboxAPI.Destroy(`${ownerId}_M1_${currentClick}_Hitbox`);
                                ability._janitor.Remove(`M1_${currentClick}_Hitbox`);
                            },
                        );
                    }),
                    true,
                    `M1_${currentClick}_Hitbox`,
                );

                ability.config.cooldown = timing.cooldown;
            },
            onEnd() {
                statusEffectsAPI.Unsubscribe(ownerId, `M1_Statuses_Subscribe`);
            },
            onInterrupt(currentClick: number, ownerPing: number) {
                const entity = entitiesStorageAPI.GetEntity(ownerId)!;
                const character = entity.entity as Model;
                const humanoidRootPart = character.FindFirstChild("HumanoidRootPart") as BasePart;

                statusEffectsAPI.RemoveStatus(ownerId, "WeaponClick");
                ability._janitor.Remove(`M1_${currentClick}_Hitbox`);
                hitboxAPI.Destroy(`M1_${currentClick}_Hitbox`);

                entity.miscData.set("LastLaunchedVFX", [
                    "Sekiro",
                    "Destroy_M1",
                    ownerId,
                    character,
                    currentClick,
                ]);

                if (Players.GetPlayerFromCharacter(character)) {
                    print("SERVER_M1_INTERRUPT_", ownerId);
                    ServerSignals.Ability.fire(
                        Players.GetPlayerFromCharacter(character)!,
                        "Sekiro_M1",
                        "Switch",
                        "Interrupt",
                        false,
                        currentClick,
                    );
                } else {
                    ServerSignals.LaunchVFX.broadcast(
                        "Sekiro",
                        "Destroy_M1",
                        ownerId,
                        character,
                        currentClick,
                    );
                }
            },
        },
    );

    return ability;
}
