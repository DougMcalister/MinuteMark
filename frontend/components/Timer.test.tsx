import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Timer, formatDuration } from "./Timer";
describe(
    "Timer", () => {
        it (
            "formats long durations",
            () => expect (formatDuration(3661)).toBe("01:01:01")
        );
        it(
            "starts with entered description",
            () => {
                const start=vi.fn();
                render(
                    <Timer 
                        projects={[]}
                        onStart={start}
                        onStop={()=>{}}
                    />
                );
                fireEvent.change(
                    screen.getByLabelText(
                        "What are you working on?"
                    ),
                    { target: {value:"Planning"} }
                );
                fireEvent.click(screen.getByText("Start"));
                expect(start).toHaveBeenCalledWith("Planning",null)
            }
        )
    }
);
