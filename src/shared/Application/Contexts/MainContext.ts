import { Players } from "@rbxts/services";
import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";

import { OnStart } from "@flamework/core";
import { Controller } from "@flamework/core";
import { ContextPriorities } from "shared/Domain/InputContext/Types/ContextTypes";

type BindEntry = {
    inputTypes: (Enum.KeyCode | Enum.UserInputType)[];
    combo?: (Enum.KeyCode | Enum.UserInputType)[];
};

const mainBinds: Record<string, BindEntry> = {
    ["M1"]: { inputTypes: [Enum.UserInputType.MouseButton1] },
    ["M2"]: { inputTypes: [Enum.UserInputType.MouseButton2] },
    ["Critical"]: { inputTypes: [Enum.KeyCode.R] },
    ["Block"]: { inputTypes: [Enum.KeyCode.F] },

    ["Special"]: {
        inputTypes: [Enum.KeyCode.E],
    },

    ["Dash"]: { inputTypes: [Enum.KeyCode.Q] },
    ["Run"]: { inputTypes: [Enum.KeyCode.LeftShift] },
};

@Controller()
export class MainContext implements OnStart {
    onStart(): void {
        const player = Players.LocalPlayer;

        const sharedScope = CompositionRootShared.createScope();

        const contextsAPI = sharedScope.resolve(SharedRegistry.Singletons.API.ContextAPI);

        const eventBusAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EventBusAPI);

        const InputBus = eventBusAPI.New(tostring(player.UserId), "Inputs");

        for (const [slotName, entry] of pairs(mainBinds)) {
            contextsAPI.BindActionAtPriority(`MainInput_${slotName}`, {
                name: slotName,

                bind: (actionName, inputState, inputObject) => {
                    if (inputState === Enum.UserInputState.Cancel) {
                        return Enum.ContextActionResult.Pass;
                    }

                    InputBus.FireSync(
                        "InputPressed",
                        1,
                        undefined,
                        slotName,
                        inputState,
                        inputObject,
                    );

                    return Enum.ContextActionResult.Pass;
                },

                createTouchButton: false,
                inputTypes: entry.inputTypes,
                combo: entry.combo,
                priority: ContextPriorities.MainInput,
            });
        }
    }
}
