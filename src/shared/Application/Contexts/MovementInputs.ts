import { Players } from "@rbxts/services";
import { SharedRegistry } from "shared/DI/Generated/SharedRegistry";
import { CompositionRootShared } from "shared/DI/CompositionRootShared";

import { OnStart } from "@flamework/core";
import { Controller } from "@flamework/core";
import { ContextPriorities } from "shared/Domain/InputContext/Types/ContextTypes";

const inputs = {
    ["W"]: Enum.KeyCode.W,
    ["S"]: Enum.KeyCode.S,
    ["A"]: Enum.KeyCode.A,
    ["D"]: Enum.KeyCode.D,
    ["Jump"]: Enum.KeyCode.Space,
    ["Dash"]: Enum.KeyCode.Q,
    ["CameraLock"]: Enum.KeyCode.LeftControl,
    ["Sprint"]: Enum.KeyCode.LeftShift,
};

@Controller()
export class MovementInputs implements OnStart {
    onStart(): void {
        const player = Players.LocalPlayer;
        const sharedScope = CompositionRootShared.createScope();
        const contextsAPI = sharedScope.resolve(SharedRegistry.Singletons.API.ContextAPI);
        const eventBusAPI = sharedScope.resolve(SharedRegistry.Singletons.API.EventBusAPI);

        const inputsBus = eventBusAPI.New(tostring(player.UserId), "Inputs");
        return;

        for (const [inputName, keyCode] of pairs(inputs)) {
            contextsAPI.BindActionAtPriority("MovementInputs", {
                name: inputName,
                bind: (actionName, inputState, inputObject) => {
                    if (inputState === Enum.UserInputState.Cancel) {
                        return Enum.ContextActionResult.Pass;
                    }

                    inputsBus.FireSync(
                        "InputPressed",
                        1,
                        undefined,
                        inputName,
                        inputState,
                        inputObject,
                    );
                    return Enum.ContextActionResult.Pass;
                },
                createTouchButton: false,
                inputTypes: [keyCode],
                priority: ContextPriorities.Hotbar,
            });
        }
    }
}
