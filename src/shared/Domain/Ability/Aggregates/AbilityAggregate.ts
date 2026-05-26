import { RunService } from "@rbxts/services";

import {
    IAbility,
    IAbilityBehaviour,
    IAbilityBlacklist,
    IAbilityConfig,
    IAbilityStates,
    IStatusId,
} from "../Types/AbilityTypes";

import { Janitor } from "@rbxts/janitor";
import { TableHelper } from "shared/Utilities/TableHelper";
import { ArrayHelper } from "shared/Utilities/ArrayHelper";

export class AbilityAggregate implements IAbility {
    readonly config: IAbilityConfig;
    readonly behaviours: IAbilityBehaviour;

    public _janitor = new Janitor<any>();

    private ending = false;

    constructor(_config: IAbilityConfig, _behaviours: IAbilityBehaviour) {
        this.config = _config;
        this.behaviours = _behaviours;
    }

    private validateDuration(check: boolean) {
        this._janitor.Remove("validateDuration");

        if (this.config.manualEnd) return;
        if (this.config.duration === math.huge) return;

        const connection = RunService.Heartbeat.Connect(() => {
            if (!this.HasState("Active")) {
                this._janitor.Remove("validateDuration");
                return;
            }

            const now = os.clock();
            const elapsed = now - this.config.lastUsed;

            if (elapsed >= this.config.duration) {
                this.Execute("End", check);
            }
        });

        this._janitor.Add(connection, "Disconnect", "validateDuration");
    }

    private validateCooldown() {
        this._janitor.Remove("validateCooldown");

        const connection = RunService.Heartbeat.Connect(() => {
            if (!this.OnCooldown()) {
                this.RemoveState("Cooldown");
                this.AddState("Idle");
                this._janitor.Remove("validateCooldown");
            }
        });

        this._janitor.Add(connection, "Disconnect", "validateCooldown");
    }

    private canStart(check: boolean): boolean {
        if (!check) return true;
        if (this.HasState("Locked")) return false;
        if (this.HasState("Active")) return false;
        if (this.HasState("Cooldown")) return false;
        return true;
    }

    private canEnd(check: boolean): boolean {
        if (!this.HasState("Active")) return false;
        if (this.ending) return false;
        return true;
    }

    public AddState(state: IAbilityStates) {
        ArrayHelper.addString(this.config.states, state, true);
    }

    public RemoveState(state: IAbilityStates) {
        ArrayHelper.removeString(this.config.states, state, true);
    }

    public HasState(state: IAbilityStates) {
        return ArrayHelper.has(this.config.states, state);
    }

    public AddTag(tag: string) {
        if (!this.config.tags) this.config.tags = [];
        if (!this.config.tags.includes(tag)) this.config.tags.push(tag);
    }

    public RemoveTag(tag: string) {
        if (!this.config.tags) return;
        const index = this.config.tags.indexOf(tag);
        if (index !== -1) this.config.tags.remove(index);
    }

    public HasTag(tag: string): boolean {
        return this.config.tags?.includes(tag) ?? false;
    }

    public GetTags(): string[] {
        return this.config.tags ?? [];
    }

    public GetBlacklist(): IStatusId[] {
        const global = IAbilityBlacklist;
        const additional = this.config.additionalBlacklist ?? [];
        return [...global, ...additional];
    }

    public Execute(callBackName: "Start" | "End", check: boolean, ...args: unknown[]) {
        if (callBackName === "Start") {
            if (!this.canStart(check)) {
                this.behaviours.onReject?.(...args);
                return;
            }

            if (check && this.behaviours.onStartCheck(...args) !== true) {
                this.behaviours.onReject?.(...args);
                return;
            }

            this.RemoveState("Idle");

            this.config.lastUsed = os.clock();

            this.AddState("Active");
            this.ending = false;

            this.behaviours.onStart(...args);

            this.validateDuration(check);
            return;
        }

        if (!this.canEnd(check)) return;

        if (check && this.behaviours.onEndCheck(...args) !== true) return;

        this.ending = true;

        this.RemoveState("Active");
        this.RemoveState("Holding");

        this.AddState("Cooldown");

        this.behaviours.onEnd(...args);

        this.validateCooldown();

        task.defer(() => {
            this.ending = false;
        });
    }

    public Interrupt(...args: unknown[]) {
        // if (!this.HasState("Active")) {
        //     print("RETURNRR");
        //     return;
        // }

        this.RemoveState("Active");
        this.RemoveState("Holding");

        this.behaviours.onInterrupt(...args);
    }

    public Reject(...args: unknown[]) {
        this.behaviours.onReject?.(...args);
    }

    public IsActive() {
        return this.HasState("Active");
    }

    public OnCooldown(): boolean {
        const now = os.clock();
        return now - this.config.lastUsed <= this.config.cooldown;
    }

    public Destroy() {
        this._janitor.Cleanup();
        TableHelper.ClearTable(this);
    }
}
