import { AbilityAggregate } from "../Aggregates/AbilityAggregate";
import { IAbilityType, IAbilityConfig, IAbilityBehaviour } from "../Types/AbilityTypes";

export class AbilityService {
    private readonly BlockedTags = new Map<string, IAbilityType[]>();
    private readonly Abilities = new Map<string, Map<string, AbilityAggregate>>();

    public initActor(id: string) {
        if (!this.Abilities.has(id)) {
            this.Abilities.set(id, new Map<string, AbilityAggregate>());
        }

        if (!this.BlockedTags.has(id)) {
            this.BlockedTags.set(id, []);
        }
    }

    private isBlockedByTag(id: string, tags: IAbilityType[]): boolean {
        const blockedTags = this.BlockedTags.get(id);

        if (!blockedTags) return false;

        for (const abilityTag of tags) {
            for (const blockedTag of blockedTags) {
                if (abilityTag.name === blockedTag.name) {
                    if (blockedTag.level >= abilityTag.level) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    public AddBlockTags(id: string, tags: IAbilityType[]) {
        this.initActor(id);

        const entityTags = this.BlockedTags.get(id)!;

        for (const newTag of tags) {
            const existingIndex = entityTags.findIndex((t) => t.name === newTag.name);

            if (existingIndex !== -1) {
                if (newTag.level > entityTags[existingIndex].level) {
                    entityTags[existingIndex] = newTag;
                }
            } else {
                entityTags.push(newTag);
            }
        }
    }

    public GetBlockTag(id: string, tagName: string): IAbilityType | undefined {
        const entityTags = this.BlockedTags.get(id);

        if (!entityTags) return undefined;

        return entityTags.find((t) => t.name === tagName);
    }

    public GetBlockTags(id: string): IAbilityType[] {
        this.initActor(id);

        return this.BlockedTags.get(id)!;
    }

    public RemoveBlockTags(id: string, tags: string[] | "all") {
        this.initActor(id);

        if (tags === "all") {
            this.BlockedTags.set(id, []);
            return;
        }

        const entityTags = this.BlockedTags.get(id)!;

        this.BlockedTags.set(
            id,
            entityTags.filter((t) => !tags.includes(t.name)),
        );
    }

    public ValidateAbility(ability: AbilityAggregate): boolean {
        this.initActor(ability.config.ownerId);

        const ownerAbilities = this.Abilities.get(ability.config.ownerId)!;

        if (ownerAbilities.has(ability.config.name)) {
            return false;
        }

        ownerAbilities.set(ability.config.name, ability);

        return true;
    }

    public Create(_config: IAbilityConfig, _behaviours: IAbilityBehaviour): AbilityAggregate {
        const ability = new AbilityAggregate(_config, _behaviours);

        const validate = this.ValidateAbility(ability);

        if (validate) {
            return ability;
        }

        const ownerAbilities = this.Abilities.get(ability.config.ownerId)!;
        const existingAbility = ownerAbilities.get(ability.config.name);

        if (!existingAbility) {
            throw error("existingAbility is undefined");
        }

        ability.Destroy();

        return existingAbility;
    }

    public Get(ownerId: string, abilityName: string): AbilityAggregate | undefined {
        return this.Abilities.get(ownerId)?.get(abilityName);
    }

    public GetAllAbilities(ownerId: string): Map<string, AbilityAggregate> | undefined {
        return this.Abilities.get(ownerId);
    }

    public Remove(ownerId: string, abilityName: string) {
        const ownerAbilities = this.Abilities.get(ownerId);

        if (!ownerAbilities) return;

        const ability = ownerAbilities.get(abilityName);

        if (!ability) return;

        ability.Destroy();

        ownerAbilities.delete(abilityName);
    }

    public Execute(
        ability: AbilityAggregate,
        callBackName: "Start" | "End",
        check: boolean,
        ...args: unknown[]
    ) {
        if (callBackName === "Start" && check) {
            const blocked = this.isBlockedByTag(ability.config.ownerId, ability.config.types);

            if (blocked) {
                ability.Reject(...args);
                return;
            }
        }

        ability.Execute(callBackName, check, ...args);
    }

    public Reject(ability: AbilityAggregate, ...args: unknown[]) {
        ability.Reject(...args);
    }

    public Interrupt(ability: AbilityAggregate, ...args: unknown[]) {
        ability.Interrupt(...args);
    }
}
