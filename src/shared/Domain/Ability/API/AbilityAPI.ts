import { AbilityAggregate } from "../Aggregates/AbilityAggregate";
import { AbilityService } from "../Services/AbilityService";
import { IAbility, IAbilityBehaviour, IAbilityConfig, IAbilityType } from "../Types/AbilityTypes";

export class AbilityAPI {
    private service = new AbilityService();

    public initActor(id: string) {
        this.service.initActor(id);
    }

    public AddBlockTags(id: string, tags: IAbilityType[]) {
        this.service.AddBlockTags(id, tags);
    }

    public GetBlockTag(id: string, tagName: string): IAbilityType | undefined {
        return this.service.GetBlockTag(id, tagName);
    }

    public GetBlockTags(id: string): IAbilityType[] {
        return this.service.GetBlockTags(id);
    }

    public RemoveBlockTags(id: string, tags: string[] | "all") {
        this.service.RemoveBlockTags(id, tags);
    }

    public ValidateAbility(ability: AbilityAggregate): boolean {
        return this.service.ValidateAbility(ability);
    }

    public Create(_config: IAbilityConfig, _behaviours: IAbilityBehaviour): AbilityAggregate {
        return this.service.Create(_config, _behaviours);
    }

    public Get(ownerId: string, abilityName: string): AbilityAggregate | undefined {
        return this.service.Get(ownerId, abilityName);
    }

    public GetAllAbilities(ownerId: string): Map<string, AbilityAggregate> | undefined {
        return this.service.GetAllAbilities(ownerId);
    }

    public Remove(ownerId: string, abilityName: string) {
        this.service.Remove(ownerId, abilityName);
    }

    public Execute(
        ability: AbilityAggregate,
        callBackName: "Start" | "End",
        check: boolean,
        ...args: unknown[]
    ) {
        this.service.Execute(ability, callBackName, check, ...args);
    }

    public Reject(ability: AbilityAggregate, ...args: unknown[]) {
        this.service.Reject(ability, ...args);
    }

    public Interrupt(ability: AbilityAggregate, ...args: unknown[]) {
        this.service.Interrupt(ability, ...args);
    }

    public AddTag(ability: AbilityAggregate, tag: string) {
        ability.AddTag(tag);
    }

    public RemoveTag(ability: AbilityAggregate, tag: string) {
        ability.RemoveTag(tag);
    }

    public HasTag(ability: AbilityAggregate, tag: string): boolean {
        return ability.HasTag(tag);
    }

    public GetTags(ability: AbilityAggregate): string[] {
        return ability.GetTags();
    }
}
