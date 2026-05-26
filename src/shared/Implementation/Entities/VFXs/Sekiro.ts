import { Workspace, ReplicatedStorage, Players } from "@rbxts/services";
import { Controller, Dependency, OnStart } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";

import { ClientAtomReplication } from "shared/Application/ClientAtomReplication";
import { IApperancy } from "shared/Types/Gameplay/PlayerApperance";
import { IModels } from "shared/Types/Assets/Models";
import { IAnimations } from "shared/Types/Assets/Animations";

import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";

import { AllSoundPaths, SoundsUtil } from "shared/Utilities/SoundsUtil";
import { AnimationsPriorities } from "shared/Types/Gameplay/AnimationTypes";
import { ParseRobloxAliasPath } from "shared/Utilities/GetObjectFromPath";
import { emit } from "@zilibobi/forge-vfx";
import { ParticleDirection } from "shared/Utilities/ParticleDirection";

const sharedScope = CompositionRootShared.createScope();
const entityStorageAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EntitiesStorageAPI);

const Assets = ReplicatedStorage.WaitForChild("Assets");
const Models = Assets.WaitForChild("Models") as IModels;
const Animations = Assets.WaitForChild("Animations") as IAnimations;
const VFXs = Assets.WaitForChild("VFXs") as Folder;

const SekiroAnimations = Animations.WaitForChild("Sekiro") as ISekiroAnimations;
const SekiroVFXs = VFXs.WaitForChild("Sekiro") as ISekiroVFXs;

const CHARACTER_NAME = "Sekiro";

type EventTimings = {
    mark: number;
    swingreg: number;
    swingend: number;
    hitreg: number;
    hitend: number;
};

type TimingData = {
    duration: number;
    cooldown: number;
    events: EventTimings;
};

type Timings = Record<string, Record<string, TimingData>>;

export type ISekiroVFXs = {
    ["M1"]: {
        ["1"]: Attachment;
        ["2"]: Attachment;
        ["3"]: Attachment;
        ["Smooth"]: Trail;
        ["wind"]: Trail;
    } & Folder;
} & Folder;

type ISekiroAnimations = {
    ["Combat"]: {
        ["Hits"]: {
            ["Block_Hit_1"]: Animation;
            ["Block_Hit_2"]: Animation;
            ["Hit_1"]: Animation;
            ["Hit_2"]: Animation;
            ["Hit_3"]: Animation;
        } & Folder;
        ["Sheath_M1"]: {
            ["M1_1"]: Animation;
            ["M1_2"]: Animation;
            ["M1_3"]: Animation;
            ["M1_4"]: Animation;
        } & Folder;
        ["Unsheath_M1"]: {
            ["M1_1"]: Animation;
            ["M1_2"]: Animation;
            ["M1_3"]: Animation;
            ["M1_4"]: Animation;
        } & Folder;
    } & Folder;
    ["Dashes"]: {
        ["Sheath"]: {
            ["Dash_Back_Left"]: Animation;
            ["Dash_Back_Right"]: Animation;
            ["Dash_Forward_Left"]: Animation;
            ["Dash_Forward_Right"]: Animation;
            ["Dash_Left"]: Animation;
            ["Dash_Right"]: Animation;
        } & Folder;
        ["Unsheath"]: {
            ["Dash_Back_Left"]: Animation;
            ["Dash_Back_Right"]: Animation;
            ["Dash_Forward_Left"]: Animation;
            ["Dash_Forward_Right"]: Animation;
            ["Dash_Left"]: Animation;
            ["Dash_Right"]: Animation;
        } & Folder;
    } & Folder;
    ["Defense"]: {
        ["Block_Idle"]: Animation;
        ["Parry_1"]: Animation;
        ["Parry_2"]: Animation;
        ["Parry_3"]: Animation;
        ["Parry_Cast"]: Animation;
    } & Folder;
    ["Misc"]: {
        ["Katana_Sheathing"]: Animation;
    } & Folder;
    ["Movement"]: {
        ["Block"]: {
            ["Falling"]: Animation;
            ["Idle"]: Animation;
            ["Jump"]: Animation;
            ["Run"]: Animation;
            ["Walk"]: Animation;
        } & Folder;
        ["Sheath"]: {
            ["Falling"]: Animation;
            ["Idle"]: Animation;
            ["Jump"]: Animation;
            ["Run"]: Animation;
            ["Walk"]: Animation;
        } & Folder;
        ["Unsheath"]: {
            ["Falling"]: Animation;
            ["Idle"]: Animation;
            ["Jump"]: Animation;
            ["Run"]: Animation;
            ["Walk"]: Animation;
        } & Folder;
    } & Folder;
} & Folder;

@Controller()
export class Sekiro implements OnStart {
    public player = Players.LocalPlayer;
    public playerStringId = tostring(this.player.UserId);
    public _janitor = new Janitor<any>();
    public Debris = new Map<string, any>();

    public api = {
        eventBusAPI: sharedScope.resolve(SharedRegistry.Singletons.API.EventBusAPI),
        animationsAPI: sharedScope.resolve(SharedRegistry.Singletons.API.AnimationsAPI),
    };

    onStart(): void {
        const atomReplication = Dependency<ClientAtomReplication>();
        const playerBus = this.api.eventBusAPI.New(tostring(this.player.UserId), "Player");

        this._janitor.Add(
            task.spawn(() => {
                while (!atomReplication.GetLocalPlayerData) task.wait();

                playerBus.Subscribe(
                    "CharacterLoaded",
                    (character: Model) => {
                        if (
                            atomReplication.GetLocalPlayerData()!.Equipment.Character.Name !==
                            CHARACTER_NAME
                        )
                            return;
                        this.Spawn(this.playerStringId, character);
                    },
                    undefined,
                    "SekiroInit",
                );
            }),
            true,
            "Sekiro_OnStart",
        );
    }

    private getOrCreateDebris<T extends Instance>(key: string, creator: () => T): T {
        const existing = this.Debris.get(key) as T | undefined;
        if (existing && existing.Parent !== undefined) return existing;

        const created = creator();
        this.Debris.set(key, created);
        return created;
    }

    private createAssets(ownerId: string) {
        return {
            sheath: this.getOrCreateDebris(
                `${ownerId}_Sheath`,
                () => Models.Sekiro.Models.Sheath.Clone() as MeshPart,
            ),
            katana: this.getOrCreateDebris(
                `${ownerId}_Katana`,
                () => Models.Sekiro.Models.Katana.Clone() as MeshPart,
            ),
            prothesis: this.getOrCreateDebris(
                `${ownerId}_Prothesis`,
                () => Models.Sekiro.Models.Prosthesis.Clone() as MeshPart,
            ),
            rhWeld: this.getOrCreateDebris(
                `${ownerId}_RH_Katana_Weld`,
                () => Models.Sekiro.Welds["RH_Katana_Weld"].Clone() as Weld,
            ),
            sheathWeld: this.getOrCreateDebris(
                `${ownerId}_Sheath_Katana_Weld`,
                () => Models.Sekiro.Welds.Sheath_Katana_Weld.Clone() as Weld,
            ),
            torsoWeld: this.getOrCreateDebris(
                `${ownerId}_Torso_Sheath_Weld`,
                () => Models.Sekiro.Welds.Torso_Sheath_Weld.Clone() as Weld,
            ),
            leftArmWeld: this.getOrCreateDebris(
                `${ownerId}_Left_Arm_Prothesis_Weld`,
                () => Models.Sekiro.Welds["Left Arm_Prothesis_Weld"].Clone() as Weld,
            ),
        };
    }

    private getAnimator(character: Model, ownerId: string, packName: string) {
        return this.api.animationsAPI.CreateAnimator({ Character: character }, packName, ownerId);
    }

    private isLocalCharacter(character: Model): boolean {
        return this.player === Players.GetPlayerFromCharacter(character);
    }

    private createSwingVFX(
        character: Model,
        katana: MeshPart,
        currentClick: number,
        ownerId: string,
    ) {
        if (currentClick === 4) {
            let rightLeg = character.WaitForChild("Right Leg") as BasePart;

            const trail = SekiroVFXs.FindFirstChild("M1")!
                .FindFirstChild("Leg_Trail")!
                .Clone() as BasePart;

            let weld = new Instance("Weld");
            const sound = SoundsUtil.CreateSound(`Sekiro/Swings/${currentClick}` as AllSoundPaths);

            weld.Part0 = rightLeg;
            weld.Part1 = trail;

            weld.C1 = new CFrame(0, 1.025, 0);

            weld.Parent = Workspace.WaitForChild("Map").WaitForChild("Debris");
            trail.Parent = Workspace.WaitForChild("Map").WaitForChild("Debris");
            sound.Parent = rightLeg;

            SoundsUtil.PlaySound(sound, true);

            this._janitor.Add(trail, "Destroy", `${ownerId}_Leg_Trail`);
            this._janitor.Add(weld, "Destroy", `${ownerId}_Leg_Trail_Weld`);
            this._janitor.Add(sound, "Destroy", `${ownerId}_sound`);
        } else {
            const at1 = (SekiroVFXs.M1.FindFirstChild("1") as Attachment).Clone();
            const at2 = (SekiroVFXs.M1.FindFirstChild("2") as Attachment).Clone();
            const at3 = (SekiroVFXs.M1.FindFirstChild("3") as Attachment).Clone();
            const smooth = (SekiroVFXs.M1.FindFirstChild("Smooth") as Trail).Clone();
            const wind = (SekiroVFXs.M1.FindFirstChild("wind") as Trail).Clone();
            const sound = SoundsUtil.CreateSound(`Sekiro/Swings/${currentClick}` as AllSoundPaths);

            at1.Parent = katana;
            at2.Parent = katana;
            at3.Parent = katana;
            smooth.Parent = katana;
            wind.Parent = katana;
            sound.Parent = katana;

            smooth.Attachment0 = at2;
            smooth.Attachment1 = at1;
            wind.Attachment0 = at1;
            wind.Attachment1 = at3;
            smooth.Enabled = true;
            wind.Enabled = true;

            SoundsUtil.PlaySound(sound, true);

            this._janitor.Add(at1, "Destroy", `${ownerId}_at1`);
            this._janitor.Add(at2, "Destroy", `${ownerId}_at2`);
            this._janitor.Add(at3, "Destroy", `${ownerId}_at3`);
            this._janitor.Add(smooth, "Destroy", `${ownerId}_smooth`);
            this._janitor.Add(wind, "Destroy", `${ownerId}_wind`);
            this._janitor.Add(sound, "Destroy", `${ownerId}_sound`);
        }
    }

    private destroySwingVFX(ownerId: string) {
        this._janitor.Remove(`${ownerId}_at1`);
        this._janitor.Remove(`${ownerId}_at2`);
        this._janitor.Remove(`${ownerId}_at3`);
        this._janitor.Remove(`${ownerId}_smooth`);
        this._janitor.Remove(`${ownerId}_wind`);

        let legTrail = this._janitor.Get(`${ownerId}_Leg_Trail`) as BasePart;
        if (legTrail) {
            let trail = legTrail.FindFirstChild("Trail")! as Trail;
            trail.Enabled = false;

            task.delay(3, () => {
                this._janitor.Remove(`${ownerId}_Leg_Trail`);
                this._janitor.Remove(`${ownerId}_Leg_Trail_Weld`);
            });
        }
    }

    private createSheathBlinkVFX(ownerId: string, sheath: MeshPart) {
        const sheathBlink = SekiroVFXs.FindFirstChild("SheathBlink")!.Clone() as Attachment;

        sheathBlink.Parent = sheath;

        emit(sheathBlink);

        this._janitor.Add(sheathBlink, "Destroy", `${ownerId}_SheathBlink_VFX`);

        this._janitor.Add(
            task.delay(2, () => {
                this.removeSheathBlinkVFX(ownerId);
            }),
            true,
            `${ownerId}_SheathBlink_VFX_Destroy`,
        );
    }

    public removeSheathBlinkVFX(ownerId: string) {
        this._janitor.Remove(`${ownerId}_SheathBlink_VFX`);
        this._janitor.Remove(`${ownerId}_SheathBlink_VFX_Destroy`);
    }

    private createSheathVFX(ownerId: string, katana: MeshPart) {
        const at1 = (SekiroVFXs.M1.FindFirstChild("1") as Attachment).Clone();
        const at2 = (SekiroVFXs.M1.FindFirstChild("2") as Attachment).Clone();
        const at3 = (SekiroVFXs.M1.FindFirstChild("3") as Attachment).Clone();
        const smooth = (SekiroVFXs.M1.FindFirstChild("Smooth") as Trail).Clone();
        const wind = (SekiroVFXs.M1.FindFirstChild("wind") as Trail).Clone();
        const sheathSound = SoundsUtil.CreateSound("Sekiro/Sheath");

        at1.Parent = katana;
        at2.Parent = katana;
        at3.Parent = katana;
        smooth.Parent = katana;
        wind.Parent = katana;
        sheathSound.Parent = katana;

        smooth.Attachment0 = at2;
        smooth.Attachment1 = at1;
        wind.Attachment0 = at1;
        wind.Attachment1 = at3;
        smooth.Enabled = true;
        wind.Enabled = true;

        SoundsUtil.PlaySound(sheathSound, true);

        this._janitor.Add(at1, "Destroy", `${ownerId}_at1`);
        this._janitor.Add(at2, "Destroy", `${ownerId}_at2`);
        this._janitor.Add(at3, "Destroy", `${ownerId}_at3`);
        this._janitor.Add(smooth, "Destroy", `${ownerId}_smooth`);
        this._janitor.Add(wind, "Destroy", `${ownerId}_wind`);
        this._janitor.Add(sheathSound, "Destroy", `${ownerId}_Sheath_Sound`);
    }

    private destroySheathVFX(ownerId: string) {
        this._janitor.Remove(`${ownerId}_at1`);
        this._janitor.Remove(`${ownerId}_at2`);
        this._janitor.Remove(`${ownerId}_at3`);
        this._janitor.Remove(`${ownerId}_smooth`);
        this._janitor.Remove(`${ownerId}_wind`);
    }

    private stopKatanaSheathAnim(ownerId: string, character: Model, removeSound?: boolean) {
        const emoteAnimator = this.getAnimator(character, ownerId, "EmoteAnimator");

        emoteAnimator.StopAnimation("Katana_Sheathing", 0, true, true);

        for (const track of emoteAnimator.animator.GetPlayingAnimationTracks()) {
            if (
                track.Animation?.AnimationId === SekiroAnimations.Misc.Katana_Sheathing.AnimationId
            ) {
                track.Stop();
            }
        }

        this._janitor.Remove(`${ownerId}_Sekiro_Katana_Sheathing_swingreg`);
        this._janitor.Remove(`${ownerId}_Sekiro_Katana_Sheathing_swingend`);
        this._janitor.Remove(`${ownerId}_Sekiro_Katana_Sheathing_sheath`);
        this.destroySheathVFX(ownerId);
        this.removeSheathBlinkVFX(ownerId);

        if (removeSound) {
            this._janitor.Remove(`${ownerId}_Sheath_Sound`);
        }
    }

    private createHitVFX(ownerId: string, character: Model, hitTime: number) {
        let torso = character.WaitForChild("Torso")! as BasePart;
        let bloodHit = VFXs.FindFirstChild("Default")!
            .FindFirstChild("BloodHit")!
            .Clone() as BasePart;

        let hitSound = SoundsUtil.CreateSound(`Sekiro/Hits/${hitTime}` as AllSoundPaths);

        bloodHit.Anchored = true;

        bloodHit.Parent = Workspace.WaitForChild("Map")!.WaitForChild("Debris");
        hitSound.Parent = torso;

        bloodHit.Position = torso.Position;

        emit(bloodHit);
        SoundsUtil.PlaySound(hitSound, true);

        task.spawn(() => {
            const emitCount =
                (bloodHit
                    .FindFirstChild("At")!
                    .FindFirstChild("BloodyDrop")!
                    .GetAttribute("EmitCount") as number) ?? 1;

            const max = math.max(1, math.ceil(emitCount / 3));
            const amount = math.random(1, max);

            for (let i = 1; i <= amount; i++) {
                let groundBleed = VFXs.FindFirstChild("Default")!
                    .FindFirstChild(`BleedGround_${math.random(1, 2)}`)!
                    .Clone() as BasePart;

                let bloodBulletTrail = VFXs.FindFirstChild("Default"!)
                    ?.FindFirstChild("BloodBulletTrail")!
                    .Clone() as BasePart;
                bloodBulletTrail.Parent = Workspace.WaitForChild("Map")!.WaitForChild(
                    "Debris",
                ) as Folder;

                groundBleed.Parent = Workspace.WaitForChild("Map")!.WaitForChild(
                    "Debris",
                ) as Folder;

                task.delay(7, () => {
                    groundBleed.Destroy();
                    bloodBulletTrail.Destroy();
                });

                ParticleDirection.EmitOnImpact({
                    emitter: bloodHit
                        .FindFirstChild("At")!
                        .FindFirstChild("BloodyDrop")! as ParticleEmitter,
                    origin: torso.Position,
                    lookVector: torso.CFrame.LookVector,

                    delay: 0,

                    curve: {
                        duration: math.random(25, 35) / 100,
                        style: "Linear",
                        direction: "In",
                        maxArcHeight: math.random(1, 4),
                    },

                    particleToEmit: groundBleed,
                    trail: bloodBulletTrail,
                    directionOffset: new Vector3(math.random(1, 3), 0, math.random(1, 3)),

                    ignore: [
                        Workspace.WaitForChild("Map").WaitForChild("Players"),
                        Workspace.WaitForChild("Map").WaitForChild("NPCs"),
                    ],
                });
            }
        });

        this._janitor.Add(bloodHit, "Destroy", `${ownerId}_BloodHit_VFX`);
        this._janitor.Add(hitSound, "Destroy", `${ownerId}_Hit_Sound`);

        this._janitor.Add(
            task.delay(2, () => {
                this.destroyHitVFX(ownerId);
            }),
            true,
            `${ownerId}_Hit_Destroy`,
        );
    }

    private destroyHitVFX(ownerId: string) {
        this._janitor.Remove(`${ownerId}_BloodHit_VFX`);
        this._janitor.Remove(`${ownerId}_Hit_VFX`);
        this._janitor.Remove(`${ownerId}_Hit_Destroy`);
    }

    private createBlockHitVFX(
        ownerId: string,
        character: Model,
        katana: MeshPart,
        hitCount: number,
    ) {
        let swordBlockHit = VFXs.FindFirstChild("Default")!
            .FindFirstChild("Sword_BlockHit")!
            .Clone() as BasePart;
        let swordBlockHitSound = SoundsUtil.CreateSound(
            `Default/Sword_BlockHits/${hitCount}` as AllSoundPaths,
        );

        swordBlockHit.Parent = Workspace.WaitForChild("Map")!.WaitForChild("Debris") as Folder;
        swordBlockHitSound.Parent = katana;

        swordBlockHit.Anchored = true;
        swordBlockHit.Position = katana.Position;

        emit(swordBlockHit);
        SoundsUtil.PlaySound(swordBlockHitSound, true);

        this._janitor.Add(swordBlockHit, "Destroy", `${ownerId}_SwordBlockHit_Effect`);
        this._janitor.Add(swordBlockHitSound, "Destroy", `${ownerId}_SwordBlockHit_Sound`);

        this._janitor.Add(
            task.delay(2, () => {
                this.removeBlockHitVFX(ownerId);
            }),
            true,
            `${ownerId}_SwordBlockHit_Destroy`,
        );
    }

    private removeBlockHitVFX(ownerId: string) {
        this._janitor.Remove(`${ownerId}_SwordBlockHit_Effect`);
        this._janitor.Remove(`${ownerId}_SwordBlockHit_Sound`);
        this._janitor.Remove(`${ownerId}_SwordBlockHit_Destroy`);
    }

    public Spawn(ownerId: string, character: Model) {
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const playerBus = this.api.eventBusAPI.New(ownerId, "Player");

        const { sheath, katana, prothesis, rhWeld, sheathWeld, torsoWeld, leftArmWeld } =
            this.createAssets(ownerId);

        const leftArm = character.WaitForChild("Left Arm") as MeshPart;
        const leftCharArm = prothesis.WaitForChild("LeftCharArm") as MeshPart;
        const torso = character.WaitForChild("Torso") as BasePart;

        playerBus.Fire(
            "ChangeAnimationsPack",
            undefined,
            true,
            character,
            "shared.Assets.Animations.Sekiro.Movement.Sheath",
        );

        rhWeld.Destroy();

        torsoWeld.Part0 = torso;
        torsoWeld.Part1 = sheath;
        torsoWeld.Enabled = true;

        leftArmWeld.Part0 = leftArm;
        leftArmWeld.Part1 = prothesis;
        leftArmWeld.Enabled = true;

        sheathWeld.Part0 = sheath;
        sheathWeld.Part1 = katana;
        sheathWeld.Enabled = true;

        torsoWeld.Parent = apperancy.Weapon.Welds;
        leftArmWeld.Parent = apperancy.Weapon.Welds;
        sheathWeld.Parent = apperancy.Weapon.Welds;

        sheath.Parent = apperancy.Weapon.Models;
        katana.Parent = apperancy.Weapon.Models;
        prothesis.Parent = apperancy.Weapon.Models;

        leftCharArm.WaitForChild("Body") as MeshPart;
        (leftCharArm.WaitForChild("Body") as MeshPart).Color = leftArm.Color;
        leftArm.Transparency = 1;

        this._janitor.Add(
            task.spawn(() => {
                task.delay(3, () => this._janitor.Remove(`${ownerId}_ShirtCheck`));

                while (true) {
                    const shirt = character.FindFirstChildWhichIsA("Shirt");
                    if (shirt) {
                        leftCharArm.TextureID = shirt.ShirtTemplate;
                        this._janitor.Remove(`${ownerId}_ShirtCheck`);
                    }
                    task.wait();
                }
            }),
            true,
            `${ownerId}_ShirtCheck`,
        );

        this._janitor.Add(character, "Destroy", `${ownerId}_Sekiro_Character`);
    }

    public Equip(ownerId: string, character: Model) {
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const playerBus = this.api.eventBusAPI.New(ownerId, "Player");

        const { sheath, katana, rhWeld, torsoWeld } = this.createAssets(ownerId);
        const rh = apperancy.Handlers.Parts.WaitForChild("RH") as BasePart;
        const torso = character.FindFirstChild("Torso") as BasePart;

        const sheathWeld = this.Debris.get(`${ownerId}_Sheath_Katana_Weld`) as Weld | undefined;
        sheathWeld?.Destroy();

        torsoWeld.Part0 = torso;
        torsoWeld.Part1 = sheath;
        torsoWeld.Enabled = true;

        if (!rhWeld.Enabled) {
            rhWeld.Part0 = rh;
            rhWeld.Part1 = katana;
            rhWeld.Enabled = true;
            rhWeld.Parent = apperancy.Weapon.Welds;
        }

        if (this.isLocalCharacter(character)) {
            playerBus.Fire(
                "ChangeAnimationsPack",
                undefined,
                true,
                character,
                "shared.Assets.Animations.Sekiro.Movement.Unsheath",
            );
        }
    }

    public Unequip(ownerId: string, character: Model) {
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const torso = character.WaitForChild("Torso") as BasePart;
        const playerBus = this.api.eventBusAPI.New(ownerId, "Player");

        const { sheath, katana, sheathWeld, torsoWeld, rhWeld } = this.createAssets(ownerId);
        const emoteAnimator = this.getAnimator(character, ownerId, "EmoteAnimator");

        const doUnequipVisual = () => {
            rhWeld.Destroy();

            torsoWeld.Part0 = torso;
            torsoWeld.Part1 = sheath;
            torsoWeld.Enabled = true;

            sheathWeld.Part0 = sheath;
            sheathWeld.Part1 = katana;
            sheathWeld.Enabled = true;
            sheathWeld.Parent = apperancy.Weapon.Welds;
        };

        let animToPlay = SekiroAnimations.Misc.Katana_Sheathing;
        let animation: AnimationTrack | undefined;

        if (character.HasTag("NPC") || this.isLocalCharacter(character)) {
            animation = emoteAnimator.PlayAnimation(
                animToPlay,
                "Katana_Sheathing",
                false,
                AnimationsPriorities.CombatAnimation,
                false,
                0.15,
            );
        } else {
            while (!animation) {
                for (const track of emoteAnimator.animator.GetPlayingAnimationTracks()) {
                    if (track.Animation?.AnimationId === animToPlay.AnimationId) {
                        animation = track;
                    }
                }
                task.wait();
            }
        }

        this._janitor.Add(
            animation
                .GetMarkerReachedSignal("swingreg")
                .Connect(() => this.createSheathVFX(ownerId, katana)),
            "Disconnect",
            `${ownerId}_Sekiro_Katana_Sheathing_swingreg`,
        );

        this._janitor.Add(
            animation
                .GetMarkerReachedSignal("swingend")
                .Connect(() => this.destroySheathVFX(ownerId)),
            "Disconnect",
            `${ownerId}_Sekiro_Katana_Sheathing_swingend`,
        );

        this._janitor.Add(
            animation.GetMarkerReachedSignal("sheath").Connect(() => {
                doUnequipVisual();
                this.createSheathBlinkVFX(ownerId, sheath);
                if (this.isLocalCharacter(character)) {
                    playerBus.Fire(
                        "ChangeAnimationsPack",
                        undefined,
                        true,
                        character,
                        "shared.Assets.Animations.Sekiro.Movement.Sheath",
                    );
                }
            }),
            "Disconnect",
            `${ownerId}_Sekiro_Katana_Sheathing_sheath`,
        );
    }

    public FastUnequip(ownerId: string, character: Model) {
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const torso = character.WaitForChild("Torso") as BasePart;
        const playerBus = this.api.eventBusAPI.New(ownerId, "Player");

        const { sheath, katana, sheathWeld, torsoWeld, rhWeld } = this.createAssets(ownerId);
        const emoteAnimator = this.getAnimator(character, ownerId, "EmoteAnimator");

        const doUnequipVisual = () => {
            rhWeld.Destroy();

            torsoWeld.Part0 = torso;
            torsoWeld.Part1 = sheath;
            torsoWeld.Enabled = true;

            sheathWeld.Part0 = sheath;
            sheathWeld.Part1 = katana;
            sheathWeld.Enabled = true;
            sheathWeld.Parent = apperancy.Weapon.Welds;
        };

        doUnequipVisual();

        this.createSheathBlinkVFX(ownerId, sheath);
        this.LastActionUpdate(ownerId, character, false);
    }

    public LastActionUpdate(
        ownerId: string,
        character: Model,
        lastAction?: boolean,
        update?: boolean,
    ) {
        const entity = entityStorageAPI.AddEntity(ownerId, character)!;
        entity.miscData.set("LastAction", lastAction ?? true);

        let entityLastAction = entity.miscData.get("LastAction")! as boolean;

        this._janitor.Remove(`${ownerId}_LastActionCheck`);

        if (entityLastAction === true || update === true) {
            this._janitor.Add(
                task.delay(2.5, () => {
                    entity.miscData.set("LastAction", false);
                    this.Unequip(ownerId, character);
                }),
                true,
                `${ownerId}_LastActionCheck`,
            );
        }

        if (Players.GetPlayerFromCharacter(character)) {
            const playerBus = this.api.eventBusAPI.New(ownerId, "Player");
            const packName = entity.miscData.get("LastAction") ? "Unsheath" : "Sheath";
            playerBus.Fire(
                "ChangeAnimationsPack",
                undefined,
                true,
                character,
                `shared.Assets.Animations.Sekiro.Movement.${packName}`,
            );
        }
    }

    public Destroy_M1(ownerId: string, character: Model, currentClick: number) {
        const entity = entityStorageAPI.AddEntity(ownerId, character);
        const combatAnimator = this.getAnimator(character, ownerId, "CombatAnimator");
        const isLastAction = entity.miscData.get("LastAction") as boolean;
        const prefix = `${ownerId}_M1_${currentClick}`;

        this.LastActionUpdate(ownerId, character, isLastAction ?? true);

        print("Destroy_M1", ownerId);
        combatAnimator.StopAnimation(`M1`, 0, true, true);
        this.destroySwingVFX(ownerId);
    }

    public M1_Var2(
        ownerId: string,
        character: Model,
        currentClick: number,
        serverTime: number,
        ownerPing: number,
        timings: Timings,
    ) {
        const entity = entityStorageAPI.AddEntity(ownerId, character);
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const katana = apperancy.Weapon.Models.WaitForChild("Katana") as MeshPart;

        const offsetTime = Workspace.GetServerTimeNow() - serverTime;
        const isLastAction = entity.miscData.get("LastAction") as boolean;

        this.LastActionUpdate(ownerId, character);

        const timingPackName = isLastAction ? "Equipped" : "Unequipped";
        const timing = timings[timingPackName][`M1_${currentClick}`];

        const animator = this.getAnimator(character, ownerId, "CombatAnimator");
        const animToPlay = SekiroAnimations.Combat.FindFirstChild("Sheath_M1")!.FindFirstChild(
            `M1_${currentClick}`,
        ) as Animation;

        let animation: AnimationTrack | undefined;

        if (character.HasTag("NPC") || this.isLocalCharacter(character)) {
            if (this.isLocalCharacter(character)) {
                this.api.eventBusAPI
                    .New(ownerId, "Player")
                    .Fire(
                        "ChangeAnimationsPack",
                        undefined,
                        true,
                        character,
                        `shared.Assets.Animations.Sekiro.Movement.Unsheath`,
                    );
            }

            this.stopKatanaSheathAnim(ownerId, character, true);

            animation = animator.PlayAnimation(
                animToPlay,
                `M1_${currentClick}`,
                false,
                AnimationsPriorities.CombatAnimation,
                false,
                0.15,
            );
        } else {
            while (!animation) {
                for (const track of animator.animator.GetPlayingAnimationTracks()) {
                    if (track.Animation?.AnimationId === animToPlay.AnimationId) {
                        animation = track;
                        animation.TimePosition = math.clamp(offsetTime, 0, animation.Length);
                    }
                }
                task.wait();
            }
        }

        while (animation.Length <= 0) task.wait();

        this._janitor.Remove(`${ownerId}_animation_Check`);

        if (offsetTime >= timing.events.swingreg) {
            this.createSwingVFX(character, katana, currentClick, ownerId);
        } else {
            animation.GetMarkerReachedSignal("swingreg").Once(() => {
                this.createSwingVFX(character, katana, currentClick, ownerId);
            });
        }

        if (offsetTime >= timing.events.swingend) {
            this.destroySwingVFX(ownerId);
        } else {
            animation.GetMarkerReachedSignal("swingend").Once(() => {
                this.destroySwingVFX(ownerId);
            });
        }

        if (offsetTime >= 0.333) {
            this.Equip(ownerId, character);
        } else {
            animation.GetMarkerReachedSignal("unsheath").Once(() => {
                this.Equip(ownerId, character);
            });
        }

        animation.GetMarkerReachedSignal("sheath").Once(() => {
            this.FastUnequip(ownerId, character);
        });

        task.delay(timing.duration - offsetTime, () => {
            this._janitor.Remove(`${ownerId}_animation_Check`);
        });
    }

    public M1(
        ownerId: string,
        character: Model,
        currentClick: number,
        serverTime: number,
        ownerPing: number,
        timings: Timings,
    ) {
        const entity = entityStorageAPI.AddEntity(ownerId, character);
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const katana = apperancy.Weapon.Models.WaitForChild("Katana") as MeshPart;

        const offsetTime = Workspace.GetServerTimeNow() - serverTime;
        const isLastAction = entity.miscData.get("LastAction") as boolean;

        this.LastActionUpdate(ownerId, character, isLastAction || false, true);

        const timingPackName = isLastAction ? "Equipped" : "Unequipped";
        const timing = timings[timingPackName][`M1_${currentClick}`];

        const animator = this.getAnimator(character, ownerId, "CombatAnimator");
        const animToPlay = SekiroAnimations.Combat.FindFirstChild(
            isLastAction ? "Unsheath_M1" : "Sheath_M1",
        )!.FindFirstChild(`M1_${currentClick}`) as Animation;

        let animation: AnimationTrack | undefined;

        if (character.HasTag("NPC") || this.isLocalCharacter(character)) {
            if (this.isLocalCharacter(character)) {
                this.api.eventBusAPI
                    .New(ownerId, "Player")
                    .Fire(
                        "ChangeAnimationsPack",
                        undefined,
                        true,
                        character,
                        `shared.Assets.Animations.Sekiro.Movement.Unsheath`,
                    );
            }

            this.stopKatanaSheathAnim(ownerId, character, true);

            animation = animator.PlayAnimation(
                animToPlay,
                `M1_${currentClick}`,
                false,
                AnimationsPriorities.CombatAnimation,
                false,
                0.15,
            );
        } else {
            while (!animation) {
                for (const track of animator.animator.GetPlayingAnimationTracks()) {
                    if (track.Animation?.AnimationId === animToPlay.AnimationId) {
                        animation = track;
                        animation.TimePosition = math.clamp(offsetTime, 0, animation.Length);
                    }
                }
                task.wait();
            }
        }

        while (animation.Length <= 0) task.wait();

        this._janitor.Remove(`${ownerId}_animation_Check`);

        if (offsetTime >= timing.events.swingreg) {
            this.createSwingVFX(character, katana, currentClick, ownerId);
        } else {
            animation.GetMarkerReachedSignal("swingreg").Once(() => {
                this.createSwingVFX(character, katana, currentClick, ownerId);
            });
        }

        if (offsetTime >= timing.events.swingend) {
            this.destroySwingVFX(ownerId);
        } else {
            animation.GetMarkerReachedSignal("swingend").Once(() => {
                this.destroySwingVFX(ownerId);
            });
        }

        if (offsetTime >= 0.333) {
            this.Equip(ownerId, character);
        } else {
            animation.GetMarkerReachedSignal("unsheath").Once(() => {
                this.Equip(ownerId, character);
            });
        }

        animation.GetMarkerReachedSignal("sheath").Once(() => {
            this.FastUnequip(ownerId, character);
        });

        if (animation.Name === "M1_4") {
            this.LastActionUpdate(ownerId, character);
        }

        task.delay(timing.duration - offsetTime, () => {
            this._janitor.Remove(`${ownerId}_animation_Check`);
        });
    }

    public Hit(ownerId: string, character: Model, serverTime: number) {
        const entity = entityStorageAPI.AddEntity(ownerId, character);
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const katana = apperancy.Weapon.Models.WaitForChild("Katana") as MeshPart;
        const combatAnimator = this.getAnimator(character, ownerId, "CombatAnimator");

        const offsetTime = Workspace.GetServerTimeNow() - serverTime;

        if (!this.Debris.has(`${ownerId}_Hit`)) {
            this.Debris.set(`${ownerId}_Hit`, 1);
        }

        let hitTime = this.Debris.get(`${ownerId}_Hit`)! as number;

        let animToPlay = ParseRobloxAliasPath(
            `shared.Assets.Animations.Sekiro.Combat.Hits.Hit_${hitTime}`,
        ) as Animation;
        let animation = undefined as AnimationTrack | undefined;

        animation = combatAnimator.PlayAnimation(
            animToPlay,
            `Sekiro_Hit_${hitTime}`,
            true,
            AnimationsPriorities.CombatAnimation,
            false,
            0,
        );

        this.createHitVFX(ownerId, character, hitTime);

        if (!this.isLocalCharacter(character)) {
            this._janitor.Add(
                combatAnimator.animator.AnimationPlayed.Connect(
                    (animationTrack: AnimationTrack) => {
                        if (animationTrack.Animation?.AnimationId === animToPlay.AnimationId) {
                            animationTrack.Stop();
                            this._janitor.Remove(`${ownerId}_Stop_Hit_Animation`);
                        }
                    },
                ),
                "Disconnect",
                `${ownerId}_Stop_Hit_Animation`,
            );
        }

        if (hitTime >= 3) {
            this.Debris.set(`${ownerId}_Hit`, 1);
        } else {
            this.Debris.set(`${ownerId}_Hit`, hitTime + 1);
        }
    }

    public Block(ownerId: string, character: Model, serverTime: number) {
        const entity = entityStorageAPI.AddEntity(ownerId, character);
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const katana = apperancy.Weapon.Models.WaitForChild("Katana") as MeshPart;
        const combatAnimator = this.getAnimator(character, ownerId, "CombatAnimator");

        const offsetTime = Workspace.GetServerTimeNow() - serverTime;

        this.LastActionUpdate(ownerId, character, true);

        this._janitor.Remove(`${ownerId}_LastActionCheck`);
        this.Equip(ownerId, character);

        this.stopKatanaSheathAnim(ownerId, character, true);

        if (character.HasTag("NPC") || this.isLocalCharacter(character)) {
            const playerBus = this.api.eventBusAPI.New(ownerId, "Player");

            playerBus.Fire(
                "ChangeAnimationsPack",
                undefined,
                true,
                character,
                "shared.Assets.Animations.Sekiro.Movement.Block",
            );
        }
    }

    public BlockStop(ownerId: string, character: Model, serverTime: number) {
        const entity = entityStorageAPI.AddEntity(ownerId, character);
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const katana = apperancy.Weapon.Models.WaitForChild("Katana") as MeshPart;
        const combatAnimator = this.getAnimator(character, ownerId, "CombatAnimator");

        const offsetTime = Workspace.GetServerTimeNow() - serverTime;

        this.LastActionUpdate(
            ownerId,
            character,
            (entity.miscData.get("LastAction") as boolean) ?? true,
        );

        if (character.HasTag("NPC") || this.isLocalCharacter(character)) {
            const playerBus = this.api.eventBusAPI.New(ownerId, "Player");

            playerBus.Fire(
                "ChangeAnimationsPack",
                undefined,
                true,
                character,
                "shared.Assets.Animations.Sekiro.Movement.Unsheath",
            );
        }
    }

    public BlockHit(ownerId: string, character: Model, serverTime: number) {
        const entity = entityStorageAPI.AddEntity(ownerId, character);
        const apperancy = character.WaitForChild("Apperancy") as IApperancy;
        const katana = apperancy.Weapon.Models.WaitForChild("Katana") as MeshPart;
        const combatAnimator = this.getAnimator(character, ownerId, "CombatAnimator");

        const offsetTime = Workspace.GetServerTimeNow() - serverTime;

        if (!this.Debris.has(`${ownerId}_BlockHit`)) {
            this.Debris.set(`${ownerId}_BlockHit`, 1);
        }

        let blockHitTime = this.Debris.get(`${ownerId}_BlockHit`)! as number;

        let animToPlay = ParseRobloxAliasPath(
            `shared.Assets.Animations.Sekiro.Combat.Hits.Block_Hit_${blockHitTime}`,
        ) as Animation;
        let animation = undefined as AnimationTrack | undefined;

        animation = combatAnimator.PlayAnimation(
            animToPlay,
            `Sekiro_Block_Hit_${blockHitTime}`,
            true,
            AnimationsPriorities.CombatAnimation,
            false,
            0,
        );

        if (!this.isLocalCharacter(character)) {
            this._janitor.Add(
                combatAnimator.animator.AnimationPlayed.Connect(
                    (animationTrack: AnimationTrack) => {
                        if (animationTrack.Animation?.AnimationId === animToPlay.AnimationId) {
                            animationTrack.Stop();
                            this._janitor.Remove(`${ownerId}_Stop_Block_Hit_Animation`);
                        }
                    },
                ),
                "Disconnect",
                `${ownerId}_Stop_Block_Hit_Animation`,
            );
        }

        this.createBlockHitVFX(ownerId, character, katana, blockHitTime);

        if (blockHitTime >= 3) {
            this.Debris.set(`${ownerId}_BlockHit`, 1);
        } else {
            this.Debris.set(`${ownerId}_BlockHit`, blockHitTime + 1);
        }
    }
}
