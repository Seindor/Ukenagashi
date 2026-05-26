import { Workspace } from "@rbxts/services";

import { PhaseResolverContext } from "shared/Domain/PhaseResolver/Types/PhaseResolverTypes";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";
import { ServerRegistry } from "server/DI/Generated/ServerRegistry";
import { CompositionRootServer } from "server/DI/CompositionRootServer";
import { ServerSignals } from "shared/Implementation/Entities/SerrverSignals";

const sharedScope = CompositionRootShared.createScope();
const serverScope = CompositionRootServer.createScope();

let phaseResolverAPI = sharedScope.resolve(SharedRegistry.Singletons.API.PhaseResolverAPI);
let gameEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.GameEffectsAPI);
let statusEffectsAPI = serverScope.resolve(ServerRegistry.Singletons.API.StatusEffectsAPI);
let traceClipAPI = serverScope.resolve(ServerRegistry.Singletons.API.TraceClipAPI);
let entitiesStorageAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EntitiesStorageAPI);

export interface Sekiro_M1_HitContext extends PhaseResolverContext {
    damage: number;
    ownerId: string;
    targetId: string;
    currentClick: number;
    tags: string[];
}

export const Sekiro_M1_Combat = (ownerId: string) => {
    let sekiro_M1_HitResolution = phaseResolverAPI.CreateResolver<Sekiro_M1_HitContext>({
        ownerId: ownerId,
        resolverName: "Sekiro_M1_HitResolution",
        phases: [
            {
                name: "Counter",
                priority: 5,
                onCheck: (ctx) => statusEffectsAPI.HasStatus(ctx.targetId, "Counter"),
                onSuccess: (ctx, emit) => {
                    print(`${ctx.targetId} Countered`);
                },
            },
            {
                name: "Dodge",
                priority: 4,
                onCheck: (ctx) => statusEffectsAPI.HasStatus(ctx.targetId, "Dodge"),
                onSuccess: (ctx, emit) => {
                    print(`${ctx.targetId} Dodged`);
                },
            },
            {
                name: "Parry",
                priority: 3,
                onCheck: (ctx) => statusEffectsAPI.HasStatus(ctx.targetId, "Parry"),
                onSuccess: (ctx, emit) => {
                    print(`${ctx.targetId} Parried`);
                },
            },
            {
                name: "Block",
                priority: 2,
                onCheck: (ctx) => statusEffectsAPI.HasStatus(ctx.targetId, "Block"),
                onSuccess: (ctx, emit) => {
                    let entity = entitiesStorageAPI.GetEntity(ctx.targetId);
                    if (!entity) {
                        return;
                    }
                    let character = entity.entity as Model;
                    let characterName = entity?.miscData.get("CharacterName") as string | undefined;

                    if (!characterName) return;

                    ServerSignals.LaunchVFX.broadcast(
                        characterName,
                        "BlockHit",
                        ctx.targetId,
                        character,
                        Workspace.GetServerTimeNow(),
                    );

                    print(`${ctx.targetId} Blocked`);
                },
            },
            {
                name: "Damage",
                priority: 1,
                onCheck: (ctx) => true,
                onSuccess: (ctx, emit) => {
                    emit({ effectType: "Sekiro_M1_Damage", queuePriority: 1, payload: ctx });
                    print(`${ctx.targetId} Damaged!`);
                },
            },
        ],
    });

    gameEffectsAPI.registerHandler("Sekiro_M1_Damage", (effect, ctx) => {
        const payload = effect.payload as Sekiro_M1_HitContext;
        let target_entity = entitiesStorageAPI.GetEntity(payload.targetId)!;
        let target_character = target_entity.entity as Model;
        let characterName = target_entity.miscData.get("CharacterName") as string | undefined;
        let target_humanoid = target_character.WaitForChild("Humanoid") as Humanoid;

        target_humanoid.TakeDamage(payload.damage);
        statusEffectsAPI.CreateStatus("Stun", { duration: 0.5 }, true, payload.targetId);

        if (!characterName) return;

        ServerSignals.LaunchVFX.broadcast(
            characterName,
            "Hit",
            payload.targetId,
            target_character,
            Workspace.GetServerTimeNow(),
        );
    });
};
