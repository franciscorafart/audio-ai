import { BodyPartKey, ScreenRange, ValueRange } from "./shared";
import { ChannelType } from "utils/types";

export const defaultMidiSession: MidiSessionConfigType = {
    midi: [
      {
        direction: "x", // horizontal
        screenRange: { a: 0.3, b: 0.7 },
        valueRange: { x: 0, y: 127 },
        scaleFactor: 1,
        bodyPart: "nose",
        previousValue: 0,
        targetValue: 0,
        channel: 1,
        controller: 40,
      },
      {
        direction: "y", // vertical
        screenRange: { a: 0.5, b: 0.8 },
        valueRange: { x: 0, y: 127 },
        scaleFactor: 1,
        bodyPart: "leftWrist",
        previousValue: 0,
        targetValue: 0,
        channel: 1,
        controller: 41,
      },
      {
        direction: "y", // vertical
        screenRange: { a: 0.75, b: 1 },
        valueRange: { x: 0, y: 127 },
        scaleFactor: 1,
        bodyPart: "rightWrist",
        previousValue: 0,
        targetValue: 0,
        channel: 1,
        controller: 42,
      },
    ],
    machineType: "fast", // fast / decent / slow
  };

  export interface MidiConfigType {
    direction: "x" | "y";
    screenRange: ScreenRange;
    valueRange: ValueRange;
    scaleFactor: number;
    bodyPart: BodyPartKey;
    previousValue: number;
    targetValue: number;
    channel: ChannelType,
    controller: number,
  }

  export interface MidiSessionConfigType {
        midi: MidiConfigType[],
        machineType: 'fast' | 'decent' | 'slow',
  }