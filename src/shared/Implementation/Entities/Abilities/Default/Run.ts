import { ClientSignals } from "../../ClientSignals";
import { IAbilityBlacklist } from "shared/Domain/Ability/Types/AbilityTypes";
import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";

const sharedScope = CompositionRootShared.createScope();
const abilityAPI = sharedScope.resolve(SharedRegistry.Singletons.API.AbilityAPI);
const entitiesStorageAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EntitiesStorageAPI);
const replicatedStatusEffectsAPI = sharedScope.resolve(
    SharedRegistry.Singletons.API.ReplicatedStatusEffectsAPI,
);

export function Run(ownerId: string) {
    const getHumanoid = () => {
        const entity = entitiesStorageAPI.GetEntity(ownerId)!;
        const character = entity.entity as Model;
        return character.WaitForChild("Humanoid") as Humanoid;
    };

    const startSprint = () => {
        replicatedStatusEffectsAPI.Unsubscribe(ownerId, "Run_InterruptSubscribe");

        replicatedStatusEffectsAPI.Subscribe(
            ownerId,
            [
                { status: "Stun", event: "Added" },
                { status: "Block", event: "Added" },
                { status: "WeaponClick", event: "Added" },
                { status: "Knocked", event: "Added" },
                { status: "Dead", event: "Added" },
            ],
            () => {
                ability.Interrupt();
            },
            "Run_InterruptSubscribe",
        );

        ClientSignals.Ability.fire("Default_Run", "Hold", "Start");
        getHumanoid().WalkSpeed = 20;
        ability.config.miscData!.set("IsSprinting", true);
    };

    const stopSprint = (ignoreCheck?: boolean) => {
        if (!ability.config.miscData!.get("IsSprinting")! && !ignoreCheck) return;

        ClientSignals.Ability.fire("Default_Run", "Hold", "End", true);
        getHumanoid().WalkSpeed = 12;

        ability.config.cooldown = 0.5;
        ability._janitor.Remove("ChangeCooldown");
        ability._janitor.Add(
            task.delay(0.5, () => {
                ability.config.cooldown = 0;
            }),
            true,
            "ChangeCooldown",
        );
        ability.config.miscData!.set("IsSprinting", false);
    };

    const ability = abilityAPI.Create(
        {
            name: "Default_Run",
            ownerId,
            states: ["Idle"],
            additionalBlacklist: ["Dash", "Block", "WeaponClick"],
            lastUsed: 0,
            types: [{ name: "Movement", level: 1 }],
            cooldown: 0,
            duration: math.huge,
            minDuration: 0,
            miscData: new Map<string, unknown>(),
        },
        {
            onStartCheck() {
                if (
                    replicatedStatusEffectsAPI.CheckReplicatedStatuses(
                        ownerId,
                        ability.GetBlacklist(),
                        ability.config.ignoreList ?? [],
                    )
                )
                    return false;

                if (
                    replicatedStatusEffectsAPI.CheckClientStatuses(
                        ownerId,
                        ability.GetBlacklist(),
                        ability.config.ignoreList ?? [],
                    )
                )
                    return false;

                return true;
            },
            onEndCheck() {
                if (
                    replicatedStatusEffectsAPI.CheckReplicatedStatuses(
                        ownerId,
                        ability.GetBlacklist(),
                        ability.config.ignoreList ?? [],
                    )
                )
                    return false;

                if (
                    replicatedStatusEffectsAPI.CheckClientStatuses(
                        ownerId,
                        ability.GetBlacklist(),
                        ability.config.ignoreList ?? [],
                    )
                )
                    return false;

                return true;
            },
            onStart() {
                startSprint();
            },
            onEnd(instaStop?: boolean) {
                stopSprint();
            },
            onInterrupt() {
                stopSprint(true);
            },
            onReject(trueStop?: boolean) {
                if (trueStop) {
                    stopSprint(true);
                }
            },
        },
    );

    return ability;
}
